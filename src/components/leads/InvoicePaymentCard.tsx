import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Receipt, FileText, CheckCircle2, AlertCircle, Send, Loader2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePaymentTracking } from '@/hooks/usePaymentTracking'
import { voidInvoice, type PaymentMethod } from '@/lib/api/invoices'
import { formatCurrency } from '@/lib/calculations/pricing'

interface Props {
  leadId: string
  leadStatus: string
  onRefresh: () => void
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string; icon?: React.ReactNode }> = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3 mr-1" /> },
    viewed: { label: 'Viewed', className: 'bg-indigo-100 text-indigo-700' },
    paid: { label: 'Paid', className: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    void: { label: 'Void', className: 'bg-gray-200 text-gray-500', icon: <XCircle className="h-3 w-3 mr-1" /> },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <Badge className={`${cfg.className} font-semibold flex items-center`} variant="outline">
      {cfg.icon}{cfg.label}
    </Badge>
  )
}

function formatDateAU(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function InvoicePaymentCard({ leadId, leadStatus, onRefresh }: Props) {
  const navigate = useNavigate()
  const { invoice, isLoading, markPaid, isMarkingPaid, isOverdue, daysUntilDue, daysPastDue, refetch } =
    usePaymentTracking(leadId)

  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [paymentReference, setPaymentReference] = useState('')

  async function handleMarkPaid() {
    try {
      await markPaid(paymentMethod, paymentReference || undefined)
      toast.success('Payment recorded')
      setPaidDialogOpen(false)
      setPaymentReference('')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark paid')
    }
  }

  async function handleVoidInvoice() {
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
          <h3 className="font-semibold">Invoice</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  // No invoice yet
  if (!invoice) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">Invoice</h3>
        </div>
        <p className="text-sm text-gray-500">No invoice created yet for this lead.</p>
        <Button
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => navigate(`/admin/invoice/${leadId}`)}
          disabled={!['job_completed', 'job_report_pdf_sent'].includes(leadStatus)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
        {!['job_completed', 'job_report_pdf_sent'].includes(leadStatus) && (
          <p className="text-xs text-gray-400">Complete the job report first to enable invoicing.</p>
        )}
      </div>
    )
  }

  // Existing invoice
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Invoice</h3>
          </div>
          {statusBadge(isOverdue && invoice.status !== 'paid' && invoice.status !== 'void' ? 'overdue' : invoice.status)}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Number</span>
            <span className="font-semibold">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Issued</span>
            <span>{formatDateAU(invoice.invoice_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Due</span>
            <span className={isOverdue && invoice.status !== 'paid' ? 'text-red-600 font-semibold' : ''}>
              {formatDateAU(invoice.due_date)}
              {isOverdue && invoice.status !== 'paid' && daysPastDue != null && ` — ${daysPastDue}d overdue`}
              {!isOverdue && daysUntilDue != null && invoice.status !== 'paid' && ` — ${daysUntilDue}d left`}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-base">{formatCurrency(Number(invoice.total_amount))}</span>
          </div>
          {invoice.status === 'paid' && invoice.payment_date && (
            <div className="flex justify-between text-green-700">
              <span>Paid on</span>
              <span>{formatDateAU(invoice.payment_date)} · {invoice.payment_method?.replace('_', ' ')}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => navigate(`/admin/invoice/${leadId}`)}
          >
            View / Edit
          </Button>
          {invoice.status !== 'paid' && invoice.status !== 'void' && (
            <Button
              className="h-12 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setPaidDialogOpen(true)}
              disabled={isMarkingPaid}
            >
              {isMarkingPaid ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Mark Paid
            </Button>
          )}
        </div>

        {invoice.status !== 'paid' && invoice.status !== 'void' && (
          <Button
            variant="ghost"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-10"
            onClick={() => setVoidDialogOpen(true)}
          >
            Void Invoice
          </Button>
        )}
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>Record how the customer paid this invoice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label>Reference (optional)</Label>
              <Input
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="e.g. bank ref, cheque number"
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
            <DialogDescription>This marks the invoice as void. It will stay in history but cannot be reactivated.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleVoidInvoice}>Void Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
