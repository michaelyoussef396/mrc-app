import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInvoiceByLeadId,
  markInvoicePaid,
  markInvoiceSent,
  type InvoiceRow,
  type PaymentMethod,
} from '@/lib/api/invoices'

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
    mutationFn: async ({ method, reference }: { method: PaymentMethod; reference?: string }) => {
      if (!invoice) throw new Error('No invoice to mark paid')
      await markInvoicePaid(invoice.id, method, reference)
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
    markPaid: (method: PaymentMethod, reference?: string) =>
      markPaidMutation.mutateAsync({ method, reference }),
    markSent: () => markSentMutation.mutateAsync(),
    isMarkingPaid: markPaidMutation.isPending,
    isMarkingSent: markSentMutation.isPending,
    isOverdue,
    daysUntilDue,
    daysPastDue,
  }
}
