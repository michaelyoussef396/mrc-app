import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInvoiceByLeadId,
  getOutstandingInvoices,
  markInvoicePaid,
  markInvoiceSent,
  type InvoiceRow,
  type PaymentMethod,
} from '@/lib/api/invoices'
import { getDaysOverdue, getPenaltyTier, type PenaltyTier } from '@/lib/calculations/penaltyLadder'

/**
 * Payment tracking hook for a lead.
 * Fetches the invoice, exposes mutations to mark sent/paid, and computes
 * client-side overdue status from due_date.
 */
export function usePaymentTracking(leadId: string | null) {
  const queryClient = useQueryClient()

  const invoiceQuery = useQuery({
    queryKey: ['invoice-by-lead', leadId],
    queryFn: async (): Promise<InvoiceRow | null> => {
      if (!leadId) return null
      return getInvoiceByLeadId(leadId)
    },
    enabled: !!leadId,
  })

  const invoice = invoiceQuery.data ?? null

  const markPaidMutation = useMutation({
    mutationFn: async ({ method, reference, paymentDate }: { method: PaymentMethod; reference?: string; paymentDate?: string }) => {
      if (!invoice) throw new Error('No invoice to mark paid')
      await markInvoicePaid(invoice.id, method, reference, paymentDate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-by-lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice?.id] })
    },
  })

  const markSentMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('No invoice to mark sent')
      await markInvoiceSent(invoice.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-by-lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice?.id] })
    },
  })

  // Overdue calculation — only meaningful for 'sent' and 'viewed' statuses
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = invoice?.due_date ? new Date(invoice.due_date + 'T00:00:00') : null
  const diffMs = dueDate ? dueDate.getTime() - today.getTime() : 0
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const isOverdue =
    invoice != null &&
    (invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'overdue') &&
    diffDays < 0

  const daysUntilDue = diffDays >= 0 ? diffDays : null
  const daysPastDue = diffDays < 0 ? -diffDays : null

  return {
    invoice,
    isLoading: invoiceQuery.isLoading,
    error: invoiceQuery.error,
    refetch: invoiceQuery.refetch,
    markPaid: (method: PaymentMethod, reference?: string, paymentDate?: string) =>
      markPaidMutation.mutateAsync({ method, reference, paymentDate }),
    markSent: () => markSentMutation.mutateAsync(),
    isMarkingPaid: markPaidMutation.isPending,
    isMarkingSent: markSentMutation.isPending,
    isOverdue,
    daysUntilDue,
    daysPastDue,
    // Penalty-ladder tier for the current invoice (DISPLAY ONLY). null when no invoice.
    penaltyTier: invoice ? getPenaltyTier(getDaysOverdue(invoice)) : null,
  }
}

/** One outstanding invoice enriched with its derived penalty-ladder position. */
export interface OutstandingInvoice {
  invoice: InvoiceRow
  daysOverdue: number
  penaltyTier: PenaltyTier
}

/**
 * All issued-but-unpaid invoices for the admin Outstanding Invoices widget.
 * `outstanding` = every sent/viewed/overdue invoice; `overdue` = the subset
 * actually past its due_date (derived client-side, so it catches past-due rows
 * the overdue-flagging cron hasn't touched yet). Totals use total_amount.
 * Penalty fees/interest in each tier are DISPLAY ONLY — never charged by MRC.
 */
export function useOverdueInvoices() {
  const query = useQuery({
    queryKey: ['outstanding-invoices'],
    queryFn: getOutstandingInvoices,
  })

  const outstanding: OutstandingInvoice[] = (query.data ?? []).map(invoice => {
    const daysOverdue = getDaysOverdue(invoice)
    return { invoice, daysOverdue, penaltyTier: getPenaltyTier(daysOverdue) }
  })

  const overdue = outstanding.filter(row => row.daysOverdue > 0)
  const sumTotal = (rows: OutstandingInvoice[]) =>
    rows.reduce((sum, row) => sum + Number(row.invoice.total_amount ?? 0), 0)

  return {
    outstanding,
    overdue,
    outstandingCount: outstanding.length,
    outstandingTotal: sumTotal(outstanding),
    overdueCount: overdue.length,
    overdueTotal: sumTotal(overdue),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
