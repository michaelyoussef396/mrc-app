import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Save, Send, Loader2 } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  autoPopulateFromLead,
  calculateInvoiceTotals,
  createInvoice,
  getInvoiceByLeadId,
  markInvoiceSent,
  updateInvoice,
  type InvoiceLineItem,
  type InvoiceRow,
} from '@/lib/api/invoices'
import { formatCurrency, MAX_DISCOUNT } from '@/lib/calculations/pricing'
import { sendInvoiceEmail } from '@/lib/api/notifications'

function formatDateAU(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminInvoiceHelper() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [existingInvoice, setExistingInvoice] = useState<InvoiceRow | null>(null)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [jobCompletionId, setJobCompletionId] = useState<string | null>(null)

  useEffect(() => {
    if (!leadId) return
    let cancelled = false

    async function load() {
      try {
        // Check if an invoice already exists
        const existing = await getInvoiceByLeadId(leadId!)

        if (existing && !cancelled) {
          setExistingInvoice(existing)
          setCustomerName(existing.customer_name)
          setCustomerEmail(existing.customer_email ?? '')
          setCustomerPhone(existing.customer_phone ?? '')
          setPropertyAddress(existing.property_address ?? '')
          setLineItems(existing.line_items ?? [])
          setDiscountPercentage(Number(existing.discount_percentage ?? 0))
          setDueDate(existing.due_date ?? '')
          setNotes(existing.notes ?? '')
          setJobCompletionId(existing.job_completion_id ?? null)
        } else {
          // Auto-populate from lead + inspection + job completion
          const prefilled = await autoPopulateFromLead(leadId!)
          if (cancelled) return
          setCustomerName(prefilled.customer_name)
          setCustomerEmail(prefilled.customer_email ?? '')
          setCustomerPhone(prefilled.customer_phone ?? '')
          setPropertyAddress(prefilled.property_address ?? '')
          setLineItems(prefilled.line_items ?? [])
          setDiscountPercentage(prefilled.discount_percentage ?? 0)
          setDueDate(prefilled.due_date ?? '')
          setJobCompletionId(prefilled.job_completion_id ?? null)
        }
      } catch (err) {
        console.error('Failed to load invoice data:', err)
        toast.error(err instanceof Error ? err.message : 'Failed to load invoice data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [leadId])

  const totals = useMemo(
    () => calculateInvoiceTotals(lineItems, discountPercentage),
    [lineItems, discountPercentage],
  )

  function addLineItem(isEquipment: boolean) {
    setLineItems(prev => [
      ...prev,
      { description: '', quantity: 1, unit_price: 0, total: 0, is_equipment: isEquipment },
    ])
  }

  function updateLineItem(index: number, patch: Partial<InvoiceLineItem>) {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const next = { ...item, ...patch }
      // Recalculate total when quantity or unit_price changes
      if (patch.quantity !== undefined || patch.unit_price !== undefined) {
        next.total = Math.round(next.quantity * next.unit_price * 100) / 100
      }
      return next
    }))
  }

  function removeLineItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  function handleDiscountChange(value: string) {
    const pct = Math.max(0, Math.min(MAX_DISCOUNT * 100, Number(value) || 0))
    if (Number(value) > MAX_DISCOUNT * 100) {
      toast.warning(`Discount capped at ${MAX_DISCOUNT * 100}% — MRC maximum`)
    }
    setDiscountPercentage(pct)
  }

  async function handleSaveDraft() {
    if (!leadId) return
    if (!customerName.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (!dueDate) {
      toast.error('Due date is required')
      return
    }
    setSaving(true)
    try {
      if (existingInvoice) {
        await updateInvoice(existingInvoice.id, {
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          property_address: propertyAddress || null,
          line_items: lineItems,
          discount_percentage: discountPercentage,
          due_date: dueDate,
          notes: notes || null,
        })
        toast.success('Invoice updated')
      } else {
        await createInvoice({
          lead_id: leadId,
          job_completion_id: jobCompletionId,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          property_address: propertyAddress || null,
          line_items: lineItems,
          discount_percentage: discountPercentage,
          due_date: dueDate,
          notes: notes || null,
        })
        toast.success('Invoice draft saved')
      }
      navigate(`/leads/${leadId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendInvoice() {
    if (!leadId) return
    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error('Customer name and email are required to send')
      return
    }
    if (!dueDate) {
      toast.error('Due date is required')
      return
    }
    if (lineItems.length === 0) {
      toast.error('Add at least one line item before sending')
      return
    }

    setSending(true)
    try {
      let invoice: InvoiceRow
      if (existingInvoice) {
        invoice = await updateInvoice(existingInvoice.id, {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          property_address: propertyAddress || null,
          line_items: lineItems,
          discount_percentage: discountPercentage,
          due_date: dueDate,
          notes: notes || null,
        })
      } else {
        invoice = await createInvoice({
          lead_id: leadId,
          job_completion_id: jobCompletionId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          property_address: propertyAddress || null,
          line_items: lineItems,
          discount_percentage: discountPercentage,
          due_date: dueDate,
          notes: notes || null,
        })
      }

      await markInvoiceSent(invoice.id)

      // Fire-and-forget email
      try {
        await sendInvoiceEmail({
          leadId,
          customerEmail,
          emailParams: {
            customerName,
            propertyAddress: propertyAddress || '',
            invoiceNumber: invoice.invoice_number,
            invoiceDate: formatDateAU(invoice.invoice_date),
            dueDate: formatDateAU(invoice.due_date),
            lineItems: lineItems,
            subtotal: totals.subtotal,
            discountAmount: totals.discount_amount,
            subtotalAfterDiscount: totals.subtotal_after_discount,
            gstAmount: totals.gst_amount,
            totalAmount: totals.total_amount,
            notes: notes || undefined,
          },
        })
      } catch (emailErr) {
        console.error('Invoice email failed (non-fatal):', emailErr)
        toast.warning('Invoice saved but email failed to send')
      }

      // Transition lead status to invoicing_sent
      await supabase.from('leads').update({ status: 'invoicing_sent' }).eq('id', leadId)

      toast.success('Invoice sent to customer')
      navigate(`/leads/${leadId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#121D73]" />
      </div>
    )
  }

  const isSent = existingInvoice?.status && existingInvoice.status !== 'draft'

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/leads/${leadId}`)} className="h-12 w-12">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{existingInvoice ? `Invoice ${existingInvoice.invoice_number}` : 'Create Invoice'}</h1>
              {existingInvoice && (
                <p className="text-xs text-gray-500">Status: {existingInvoice.status}</p>
              )}
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving || sending}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button onClick={handleSendInvoice} disabled={saving || sending || isSent} className="bg-[#121D73] hover:bg-[#0f1860]">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {isSent ? 'Already Sent' : 'Send Invoice'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Info */}
        <section className="bg-white rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-base">Customer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Property Address</Label>
              <Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section className="bg-white rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Line Items</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addLineItem(false)}>
                <Plus className="h-4 w-4 mr-1" />Service
              </Button>
              <Button size="sm" variant="outline" onClick={() => addLineItem(true)}>
                <Plus className="h-4 w-4 mr-1" />Equipment
              </Button>
            </div>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No line items yet. Add a service or equipment line.</p>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${item.is_equipment ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  {item.is_equipment && (
                    <p className="text-xs font-medium text-amber-800 mb-2">Equipment — not discounted</p>
                  )}
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={e => updateLineItem(idx, { description: e.target.value })}
                        placeholder="e.g. Mould remediation labour"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={e => updateLineItem(idx, { quantity: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={e => updateLineItem(idx, { unit_price: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">Total</Label>
                      <div className="h-10 flex items-center px-3 text-sm font-semibold bg-white rounded-md border border-gray-200">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                    <div className="col-span-1 pt-6">
                      <Button size="icon" variant="ghost" onClick={() => removeLineItem(idx)} className="h-10 w-10 text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Discount + Totals */}
        <section className="bg-white rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-base">Totals</h2>
          <div className="max-w-xs">
            <Label>Discount (%) — max 13%</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              max={MAX_DISCOUNT * 100}
              value={discountPercentage}
              onChange={e => handleDiscountChange(e.target.value)}
            />
          </div>

          <div className="border-t pt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal (all items)</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Equipment (not discounted)</span><span>{formatCurrency(totals.equipment_subtotal)}</span></div>
            {totals.discount_amount > 0 && (
              <div className="flex justify-between text-red-600"><span>Discount ({discountPercentage}%)</span><span>-{formatCurrency(totals.discount_amount)}</span></div>
            )}
            <div className="flex justify-between"><span>Subtotal (ex GST)</span><span>{formatCurrency(totals.subtotal_after_discount)}</span></div>
            <div className="flex justify-between"><span>GST (10%)</span><span>{formatCurrency(totals.gst_amount)}</span></div>
            <div className="flex justify-between pt-2 border-t font-bold text-base">
              <span>Total (inc GST)</span><span>{formatCurrency(totals.total_amount)}</span>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </section>

        {/* Mobile action buttons */}
        <div className="sm:hidden flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving || sending} className="flex-1 h-12">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handleSendInvoice} disabled={saving || sending || isSent} className="flex-1 h-12 bg-[#121D73] hover:bg-[#0f1860]">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {isSent ? 'Sent' : 'Send'}
          </Button>
        </div>
      </main>
    </div>
  )
}
