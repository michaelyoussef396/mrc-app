import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Receipt, CheckCircle2, AlertCircle, Send, Loader2, XCircle, Pencil, Save,
} from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePaymentTracking } from '@/hooks/usePaymentTracking'
import { voidInvoice, markInvoiceSent, type PaymentMethod } from '@/lib/api/invoices'
import { formatCurrency } from '@/lib/calculations/pricing'

interface Props {
  leadId: string
  leadStatus: string
  onRefresh: () => void
}

function formatDateAU(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

interface Milestone {
  day: number
  label: string
  detail: string
  severity: 'neutral' | 'amber' | 'red'
}

const TERMS_MILESTONES: Milestone[] = [
  { day: 0, label: 'Invoice sent', detail: 'Payment window begins', severity: 'neutral' },
  { day: 14, label: 'Payment due', detail: '14 days from invoice', severity: 'amber' },
  { day: 15, label: 'Overdue', detail: 'Warranty suspended · $65 admin fee · interest accrues', severity: 'red' },
  { day: 22, label: 'Second reminder', detail: '$65 admin fee applied', severity: 'red' },
  { day: 29, label: 'Final notice', detail: '$65 admin fee applied', severity: 'red' },
  { day: 30, label: 'Warranty void', detail: '25% interest applied to outstanding balance', severity: 'red' },
  { day: 43, label: 'Ongoing fee', detail: '$65 admin fee (every 14 days)', severity: 'red' },
  { day: 60, label: 'Credit default listing', detail: 'Eligible to report to credit agency', severity: 'red' },
]

function OverdueTimeline({ sentAt, status }: { sentAt: string | null; status: string }) {
  if (!sentAt) return null
  const daysSince = Math.floor((Date.now() - new Date(sentAt).getTime()) / 86_400_000)
  const currentIdx = TERMS_MILESTONES.reduce(
    (acc, m, i) => (daysSince >= m.day ? i : acc),
    0,
  )
  const isOverdue = daysSince >= 15

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Timeline</p>
        <Badge
          className={
            isOverdue
              ? 'bg-red-100 text-red-700 border-red-200 font-semibold'
              : daysSince >= 11
                ? 'bg-amber-100 text-amber-800 border-amber-200 font-semibold'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold'
          }
        >
          Day {daysSince} · {status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'In window'}
        </Badge>
      </div>
      <ol className="space-y-1">
        {TERMS_MILESTONES.map((m, i) => {
          const isCurrent = i === currentIdx
          const isPast = i < currentIdx
          const colorByState =
            isCurrent && m.severity === 'red' ? 'border-red-500 bg-red-50'
            : isCurrent && m.severity === 'amber' ? 'border-amber-500 bg-amber-50'
            : isCurrent ? 'border-emerald-500 bg-emerald-50'
            : isPast ? 'border-gray-300 bg-white opacity-60'
            : 'border-gray-200 bg-white opacity-80'
          const textByState =
            isCurrent && m.severity === 'red' ? 'text-red-700'
            : isCurrent && m.severity === 'amber' ? 'text-amber-800'
            : isCurrent ? 'text-emerald-700'
            : 'text-gray-700'
          return (
            <li
              key={m.day}
              className={`flex items-start gap-2 rounded border-l-2 pl-2 py-1 ${colorByState}`}
            >
              <span className={`text-xs font-mono tabular-nums w-10 flex-shrink-0 ${textByState} font-semibold`}>
                D{m.day}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${textByState}`}>{m.label}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{m.detail}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function statusBadge(status: string, isOverdue: boolean) {
  if (status === 'paid') {
    return <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>
  }
  if (status === 'void') {
    return <Badge className="bg-gray-200 text-gray-500 border-gray-300 font-semibold"><XCircle className="h-3 w-3 mr-1" />Void</Badge>
  }
  if (isOverdue) {
    return <Badge className="bg-red-100 text-red-700 border-red-200 font-semibold"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>
  }
  if (status === 'sent' || status === 'viewed') {
    return <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-semibold"><Send className="h-3 w-3 mr-1" />Sent</Badge>
  }
  return <Badge className="bg-gray-100 text-gray-700 border-gray-300 font-semibold">Not Sent</Badge>
}

export function InvoicePaymentCard({ leadId, leadStatus, onRefresh }: Props) {
  const { invoice, isLoading, markPaid, isMarkingPaid, isMarkingSent, isOverdue, daysUntilDue, daysPastDue, refetch, markSent } =
    usePaymentTracking(leadId)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)

  // Form fields
  const [amount, setAmount] = useState(0)
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Paid dialog fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentReference, setPaymentReference] = useState('')

  // Sync form with loaded invoice when opening edit
  useEffect(() => {
    if (invoice && editOpen) {
      setAmount(Number(invoice.total_amount))
      setDueDate(invoice.due_date)
      setReference(invoice.payment_reference ?? '')
      setNotes(invoice.notes ?? '')
    }
  }, [invoice, editOpen])

  async function loadLeadCustomer() {
    const { data } = await supabase
      .from('leads')
      .select('full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode')
      .eq('id', leadId)
      .single()
    return data
  }

  async function handleCreate() {
    if (amount <= 0) {
      toast.error('Invoice amount must be greater than 0')
      return
    }
    if (!dueDate) {
      toast.error('Due date is required')
      return
    }
    setSaving(true)
    try {
      const lead = await loadLeadCustomer()
      if (!lead?.full_name) {
        toast.error('Lead has no name — cannot create invoice')
        return
      }

      const address = [
        lead.property_address_street,
        lead.property_address_suburb,
        lead.property_address_state,
        lead.property_address_postcode,
      ].filter(Boolean).join(', ')

      const { error } = await supabase
        .from('invoices')
        .insert({
          lead_id: leadId,
          customer_name: lead.full_name,
          customer_email: lead.email,
          customer_phone: lead.phone,
          property_address: address,
          total_amount: amount,
          subtotal: amount,
          subtotal_after_discount: amount,
          discount_percentage: 0,
          discount_amount: 0,
          gst_amount: 0,
          equipment_subtotal: 0,
          line_items: [],
          due_date: dueDate,
          payment_reference: reference || null,
          notes: notes || null,
          status: 'draft',
        })

      if (error) throw error
      toast.success('Invoice created')
      setCreateOpen(false)
      // Reset form
      setAmount(0)
      setDueDate(defaultDueDate())
      setReference('')
      setNotes('')
      await refetch()
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!invoice) return
    if (amount <= 0) {
      toast.error('Invoice amount must be greater than 0')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          total_amount: amount,
          subtotal: amount,
          subtotal_after_discount: amount,
          due_date: dueDate,
          payment_reference: reference || null,
          notes: notes || null,
        })
        .eq('id', invoice.id)

      if (error) throw error
      toast.success('Invoice updated')
      setEditOpen(false)
      await refetch()
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update invoice')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkSent() {
    if (!invoice) return
    try {
      await markSent()
      toast.success('Invoice marked as sent')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark sent')
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return
    try {
      // Custom payment date support via direct update before calling markPaid
      if (paymentDate && paymentDate !== new Date().toISOString().split('T')[0]) {
        await supabase
          .from('invoices')
          .update({
            payment_method: paymentMethod,
            payment_reference: paymentReference || null,
            payment_date: paymentDate,
            paid_at: new Date(paymentDate + 'T12:00:00').toISOString(),
            status: 'paid',
          })
          .eq('id', invoice.id)
        // Still fire Slack + lead status update via the API helper
        await supabase.from('leads').update({ status: 'paid' }).eq('id', invoice.lead_id ?? '')
      } else {
        await markPaid(paymentMethod, paymentReference || undefined)
      }
      toast.success('Payment recorded')
      setPaidDialogOpen(false)
      setPaymentReference('')
      await refetch()
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark paid')
    }
  }

  async function handleVoid() {
    if (!invoice) return
    try {
      await voidInvoice(invoice.id)
      toast.success('Invoice voided')
      setVoidDialogOpen(false)
      await refetch()
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to void invoice')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">Invoice & Payment</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  // No invoice: show create button (or inline form)
  if (!invoice) {
    const canCreate = ['job_completed', 'job_report_pdf_sent', 'invoicing_sent', 'paid'].includes(leadStatus)

    return (
      <>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Invoice & Payment</h3>
          </div>
          <p className="text-sm text-gray-500">Track payment status for this lead. Admin sends the invoice externally.</p>
          <Button
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => setCreateOpen(true)}
            disabled={!canCreate}
          >
            Create Invoice Tracker
          </Button>
          {!canCreate && (
            <p className="text-xs text-gray-400">Complete the job report first.</p>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Invoice Tracker</DialogTitle>
              <DialogDescription>Enter the invoice details you've sent externally.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Invoice Amount (AUD, inc. GST)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. external invoice number"
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Existing invoice — show summary + actions
  const badgeStatus = invoice.status
  const isPaid = badgeStatus === 'paid'
  const isVoid = badgeStatus === 'void'
  const isDraft = badgeStatus === 'draft'
  const isSent = badgeStatus === 'sent' || badgeStatus === 'viewed' || badgeStatus === 'overdue'

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Invoice & Payment</h3>
          </div>
          {statusBadge(badgeStatus, isOverdue && !isPaid)}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-bold text-base">{formatCurrency(Number(invoice.total_amount))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Number</span>
            <span className="font-mono text-xs">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Due</span>
            <span className={isOverdue && !isPaid ? 'text-red-600 font-semibold' : ''}>
              {formatDateAU(invoice.due_date)}
              {isOverdue && !isPaid && daysPastDue != null && ` · ${daysPastDue}d overdue`}
              {!isOverdue && daysUntilDue != null && !isPaid && !isDraft && ` · ${daysUntilDue}d left`}
            </span>
          </div>
          {invoice.payment_reference && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span>{invoice.payment_reference}</span>
            </div>
          )}
          {isPaid && invoice.payment_date && (
            <div className="flex justify-between text-green-700">
              <span>Paid on</span>
              <span>{formatDateAU(invoice.payment_date)} · {invoice.payment_method?.replace('_', ' ')}</span>
            </div>
          )}
          {invoice.notes && (
            <div className="pt-1 text-xs text-gray-500">Notes: {invoice.notes}</div>
          )}
        </div>

        {isSent && <OverdueTimeline sentAt={invoice.sent_at} status={badgeStatus} />}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />Edit
          </Button>
          {isDraft && (
            <Button
              className="h-11 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleMarkSent}
              disabled={isMarkingSent}
            >
              {isMarkingSent ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Mark Sent
            </Button>
          )}
          {isSent && (
            <Button
              className="h-11 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setPaidDialogOpen(true)}
              disabled={isMarkingPaid}
            >
              {isMarkingPaid ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Mark Paid
            </Button>
          )}
          {isPaid && <div className="h-11" />}
          {isVoid && <div className="h-11" />}
        </div>

        {!isPaid && !isVoid && (
          <Button
            variant="ghost"
            className="w-full h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setVoidDialogOpen(true)}
          >
            Void Invoice
          </Button>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>Update the tracked invoice details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Amount (AUD, inc. GST)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={reference} onChange={e => setReference(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>Record payment details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <Label>Payment Date</Label>
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
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid} disabled={isMarkingPaid} className="bg-green-600 hover:bg-green-700">
              {isMarkingPaid ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Void this invoice?</DialogTitle>
            <DialogDescription>It will stay in history but cannot be reactivated.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleVoid}>Void Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
