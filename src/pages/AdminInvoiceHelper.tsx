import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, Plus, Send, Trash2,
} from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PenaltyLadderWidget } from '@/components/invoices/PenaltyLadderWidget'
import {
  autoPopulateFromLead, calculateInvoiceTotals, createInvoice, getInvoiceByLeadId,
  markInvoicePaid, markInvoiceSent, updateInvoice,
  type CreateInvoiceInput, type InvoiceLineItem, type InvoiceRow, type PaymentMethod,
} from '@/lib/api/invoices'
import { formatCurrency, MAX_DISCOUNT } from '@/lib/calculations/pricing'
import { formatDateAU } from '@/lib/dateUtils'

const TERM_OPTIONS = [7, 14, 30, 60] as const
const DISCOUNT_CAP = MAX_DISCOUNT * 100 // 13
const MS_PER_DAY = 1000 * 60 * 60 * 24

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'cheque', label: 'Cheque' },
]

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime()
  const b = new Date(`${toISO}T00:00:00`).getTime()
  return Math.round((b - a) / MS_PER_DAY)
}

function emptyLine(): InvoiceLineItem {
  return { description: '', quantity: 1, unit_price: 0, total: 0, is_equipment: false }
}

export default function AdminInvoiceHelper() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Existing invoice (null = create mode)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [status, setStatus] = useState<InvoiceRow['status']>('draft')
  const [invoiceRow, setInvoiceRow] = useState<InvoiceRow | null>(null)

  // Header (read-only)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [customerPhone, setCustomerPhone] = useState<string | null>(null)
  const [propertyAddress, setPropertyAddress] = useState<string | null>(null)
  const [jobCompletionId, setJobCompletionId] = useState<string | null>(null)
  const [jobNumber, setJobNumber] = useState<string | null>(null)

  // Editable body
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [discountPct, setDiscountPct] = useState(0)
  const [termDays, setTermDays] = useState<number>(14)
  const [invoiceDate, setInvoiceDate] = useState<string>(todayISO())
  const [notes, setNotes] = useState('')

  // Modals
  const [sentConfirmOpen, setSentConfirmOpen] = useState(false)
  const [paidOpen, setPaidOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [paymentReference, setPaymentReference] = useState('')

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const existing = await getInvoiceByLeadId(leadId)
        const { data: jc } = await supabase
          .from('job_completions')
          .select('id, job_number')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return

        setJobNumber(jc?.job_number ?? null)

        if (existing) {
          setInvoiceId(existing.id)
          setInvoiceRow(existing)
          setStatus(existing.status)
          setCustomerName(existing.customer_name)
          setCustomerEmail(existing.customer_email)
          setCustomerPhone(existing.customer_phone)
          setPropertyAddress(existing.property_address)
          setJobCompletionId(existing.job_completion_id)
          setLineItems(existing.line_items.length ? existing.line_items : [emptyLine()])
          setDiscountPct(Number(existing.discount_percentage ?? 0))
          setNotes(existing.notes ?? '')
          setInvoiceDate(existing.invoice_date)
          const diff = daysBetween(existing.invoice_date, existing.due_date)
          setTermDays((TERM_OPTIONS as readonly number[]).includes(diff) ? diff : 14)
        } else {
          const populated = await autoPopulateFromLead(leadId)
          setCustomerName(populated.customer_name)
          setCustomerEmail(populated.customer_email ?? null)
          setCustomerPhone(populated.customer_phone ?? null)
          setPropertyAddress(populated.property_address ?? null)
          setJobCompletionId(populated.job_completion_id ?? null)
          setLineItems((populated.line_items ?? []).length ? populated.line_items! : [emptyLine()])
          setDiscountPct(populated.discount_percentage ?? 0)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load invoice')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [leadId])

  const totals = useMemo(
    () => calculateInvoiceTotals(lineItems, discountPct),
    [lineItems, discountPct],
  )
  const dueDate = useMemo(() => addDaysISO(invoiceDate, termDays), [invoiceDate, termDays])
  const discountInvalid = discountPct > DISCOUNT_CAP || discountPct < 0
  const isEditable = status === 'draft'
  const isSentLike = status === 'sent' || status === 'viewed' || status === 'overdue'
  const isPaid = status === 'paid'
  const servicesSubtotal = totals.subtotal - totals.equipment_subtotal

  function updateLine(index: number, patch: Partial<InvoiceLineItem>) {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== index) return li
      const next = { ...li, ...patch }
      next.total = Math.round(next.quantity * next.unit_price * 100) / 100
      return next
    }))
  }

  function addLine() {
    setLineItems(prev => [...prev, emptyLine()])
  }

  function removeLine(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  function buildInput(): CreateInvoiceInput {
    return {
      lead_id: leadId as string,
      job_completion_id: jobCompletionId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      property_address: propertyAddress,
      line_items: lineItems,
      discount_percentage: discountPct,
      due_date: dueDate,
      notes: notes || null,
    }
  }

  /** Persist current form (create or update). Returns the invoice id, or null on failure. */
  async function persist(): Promise<string | null> {
    if (discountInvalid) {
      toast.error(`Discount cannot exceed ${DISCOUNT_CAP}%`)
      return null
    }
    try {
      if (invoiceId) {
        await updateInvoice(invoiceId, {
          line_items: lineItems,
          discount_percentage: discountPct,
          notes: notes || null,
          due_date: dueDate,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          property_address: propertyAddress,
        })
        return invoiceId
      }
      const created = await createInvoice(buildInput())
      setInvoiceId(created.id)
      setInvoiceRow(created)
      setStatus(created.status)
      return created.id
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice')
      return null
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    const id = await persist()
    setSaving(false)
    if (id) toast.success('Draft saved')
  }

  async function handleConfirmSent() {
    setSaving(true)
    try {
      const id = await persist()
      if (!id) return
      await markInvoiceSent(id)
      setStatus('sent')
      const refreshed = await getInvoiceByLeadId(leadId as string)
      setInvoiceRow(refreshed)
      setSentConfirmOpen(false)
      toast.success('Invoice marked as sent — pipeline advanced to Invoicing Sent')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark sent')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmPaid() {
    if (!invoiceId) return
    setSaving(true)
    try {
      await markInvoicePaid(invoiceId, paymentMethod, paymentReference || undefined, paymentDate)
      setStatus('paid')
      const refreshed = await getInvoiceByLeadId(leadId as string)
      setInvoiceRow(refreshed)
      setPaidOpen(false)
      toast.success('Payment recorded — pipeline advanced to Paid')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark paid')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-28 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="h-10 px-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <Badge
          className={
            isPaid ? 'bg-green-100 text-green-700 border-green-200'
              : isSentLike ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-gray-100 text-gray-700 border-gray-300'
          }
        >
          {isPaid ? 'Paid' : isSentLike ? 'Invoicing Sent' : 'Draft'}
        </Badge>
      </div>

      {/* A — Header */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          <h1 className="text-lg font-semibold">Invoice</h1>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div className="space-y-0.5">
            <p className="font-medium">{customerName}</p>
            {customerEmail && <p className="text-gray-600 break-all">{customerEmail}</p>}
            {customerPhone && <p className="text-gray-600">{customerPhone}</p>}
            {propertyAddress && <p className="text-gray-600">{propertyAddress}</p>}
          </div>
          <div className="space-y-1 sm:text-right">
            {jobNumber && (
              <div className="flex sm:justify-end justify-between gap-2">
                <span className="text-gray-500">Job</span>
                <span className="font-mono text-xs">{jobNumber}</span>
              </div>
            )}
            <div className="flex sm:justify-end justify-between gap-2">
              <span className="text-gray-500">Invoice date</span>
              <span>{formatDateAU(invoiceDate)}</span>
            </div>
            <div className="flex sm:justify-end justify-between gap-2">
              <span className="text-gray-500">Due date</span>
              <span className="font-medium">{formatDateAU(dueDate)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* B — Line items */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Line Items</h2>
          {isEditable && (
            <Button variant="outline" size="sm" className="h-9" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />Add line
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {lineItems.map((li, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-gray-500">Description</Label>
                  <Input
                    value={li.description}
                    disabled={!isEditable}
                    onChange={e => updateLine(i, { description: e.target.value })}
                    placeholder="e.g. Mould remediation labour"
                  />
                </div>
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 mt-5 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    onClick={() => removeLine(i)}
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={li.quantity || ''}
                    disabled={!isEditable}
                    onChange={e => updateLine(i, { quantity: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Unit price (ex GST)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={li.unit_price || ''}
                    disabled={!isEditable}
                    onChange={e => updateLine(i, { unit_price: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <Switch
                    checked={li.is_equipment}
                    disabled={!isEditable}
                    onCheckedChange={checked => updateLine(i, { is_equipment: checked })}
                  />
                  Equipment <span className="text-xs text-gray-400">(never discounted)</span>
                </label>
                <span className="font-medium tabular-nums">{formatCurrency(li.total)}</span>
              </div>
            </div>
          ))}
          {lineItems.length === 0 && (
            <p className="text-sm text-amber-700">No line items. Add at least one before sending.</p>
          )}
        </div>

        {/* Discount */}
        <div className="pt-2">
          <Label htmlFor="discount" className="text-xs text-gray-500">
            Discount on services (%, max {DISCOUNT_CAP}%)
          </Label>
          <Input
            id="discount"
            type="number"
            min={0}
            max={DISCOUNT_CAP}
            step="0.01"
            value={discountPct || ''}
            disabled={!isEditable}
            onChange={e => setDiscountPct(Number(e.target.value) || 0)}
            className={discountInvalid ? 'border-red-400 focus-visible:ring-red-400' : ''}
            aria-invalid={discountInvalid}
          />
          {discountInvalid && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Discount must be between 0% and {DISCOUNT_CAP}% — the cap cannot be exceeded.
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Services subtotal</span>
            <span className="tabular-nums">{formatCurrency(servicesSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Equipment subtotal</span>
            <span className="tabular-nums">{formatCurrency(totals.equipment_subtotal)}</span>
          </div>
          {totals.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount ({discountPct}% on services)</span>
              <span className="tabular-nums">-{formatCurrency(totals.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span className="text-gray-600">Subtotal ex GST</span>
            <span className="tabular-nums">{formatCurrency(totals.subtotal_after_discount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">GST 10%</span>
            <span className="tabular-nums">{formatCurrency(totals.gst_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-300 pt-1.5 mt-1">
            <span className="font-semibold">Total inc GST</span>
            <span className="font-bold text-base tabular-nums">{formatCurrency(totals.total_amount)}</span>
          </div>
        </div>
      </section>

      {/* C — Payment terms */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <h2 className="font-semibold">Payment Terms</h2>
        <div className="flex items-center gap-3">
          <Select
            value={String(termDays)}
            disabled={!isEditable}
            onValueChange={v => setTermDays(Number(v))}
          >
            <SelectTrigger className="w-40 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map(t => (
                <SelectItem key={t} value={String(t)}>{t} days</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">Due {formatDateAU(dueDate)}</p>
        </div>
      </section>

      {/* D — Notes */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <Label htmlFor="notes" className="font-semibold">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          disabled={!isEditable}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes for this invoice"
        />
      </section>

      {/* F — Penalty ladder (sent/overdue only) */}
      {isSentLike && invoiceRow && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <PenaltyLadderWidget invoice={invoiceRow} />
        </section>
      )}

      {isPaid && invoiceRow && (
        <section className="bg-white rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
          <p className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />Paid
          </p>
          {invoiceRow.payment_date && (
            <p className="mt-1">
              {formatDateAU(invoiceRow.payment_date)} · {invoiceRow.payment_method?.replace('_', ' ')}
              {invoiceRow.payment_reference ? ` · ${invoiceRow.payment_reference}` : ''}
            </p>
          )}
        </section>
      )}

      {/* E — Sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur p-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {isEditable && (
            <>
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={handleSaveDraft}
                disabled={saving || discountInvalid}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Draft
              </Button>
              <Button
                className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => setSentConfirmOpen(true)}
                disabled={saving || discountInvalid || totals.total_amount <= 0 || lineItems.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />Mark as Sent
              </Button>
            </>
          )}
          {isSentLike && (
            <Button
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setPaidOpen(true)}
              disabled={saving}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />Mark as Paid
            </Button>
          )}
          {isPaid && (
            <Button variant="outline" className="flex-1 h-12" onClick={() => navigate(-1)}>
              Done
            </Button>
          )}
        </div>
      </div>

      {/* Mark as Sent confirm */}
      <Dialog open={sentConfirmOpen} onOpenChange={setSentConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark this invoice as sent?</DialogTitle>
            <DialogDescription>
              Have you already sent this invoice to the customer in Xero? This advances the
              pipeline to <strong>Invoicing Sent</strong> and notifies the team on Slack.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm flex justify-between">
            <span className="text-gray-600">Total inc GST</span>
            <span className="font-bold tabular-nums">{formatCurrency(totals.total_amount)}</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSentConfirmOpen(false)}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleConfirmSent}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Yes, mark as sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid */}
      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>Record how and when the customer paid.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment date</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="e.g. bank ref, receipt number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmPaid}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
