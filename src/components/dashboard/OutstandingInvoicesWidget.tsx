import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Receipt } from 'lucide-react'

import { useOverdueInvoices } from '@/hooks/usePaymentTracking'
import { formatCurrency } from '@/lib/calculations/pricing'
import { formatDateAU } from '@/lib/dateUtils'

/**
 * Admin dashboard widget: issued-but-unpaid invoices, soonest-due first, with
 * the past-due ones flagged by their T&Cs penalty tier. Each row opens the
 * AdminInvoiceHelper page. Penalty labels are DISPLAY ONLY (Xero charges fees).
 */
export function OutstandingInvoicesWidget() {
  const navigate = useNavigate()
  const {
    outstanding, outstandingCount, outstandingTotal, overdueCount, isLoading,
  } = useOverdueInvoices()

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm" style={{ border: '1px solid #e5e5e5' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-semibold" style={{ color: '#1d1d1f' }}>
          Outstanding Invoices
        </h2>
        {outstandingCount > 0 && (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: overdueCount > 0 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)',
              color: overdueCount > 0 ? '#FF3B30' : '#34C759',
            }}
          >
            {outstandingCount} · {formatCurrency(outstandingTotal)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : outstanding.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 mx-auto" style={{ color: '#34C759' }} />
          <p className="text-sm" style={{ color: '#86868b' }}>No outstanding invoices</p>
        </div>
      ) : (
        <div className="space-y-3">
          {outstanding.slice(0, 6).map(({ invoice, daysOverdue, penaltyTier }) => {
            const isOverdue = daysOverdue > 0
            const tierColor = penaltyTier.warrantyVoid
              ? { bg: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }
              : penaltyTier.warrantySuspended
                ? { bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9500' }
                : { bg: 'rgba(255, 59, 48, 0.08)', color: '#FF3B30' }
            return (
              <div
                key={invoice.id}
                role="button"
                tabIndex={0}
                onClick={() => invoice.lead_id && navigate(`/admin/invoice/${invoice.lead_id}`)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && invoice.lead_id) {
                    e.preventDefault()
                    navigate(`/admin/invoice/${invoice.lead_id}`)
                  }
                }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer min-h-[56px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
                style={{ border: '1px solid #f0f0f0' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isOverdue ? 'rgba(255, 59, 48, 0.1)' : 'rgba(0, 122, 255, 0.1)' }}
                  >
                    <Receipt className="h-4 w-4" style={{ color: isOverdue ? '#FF3B30' : '#007AFF' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1d1d1f' }}>
                      {invoice.customer_name}
                    </p>
                    <p className="text-xs" style={{ color: '#86868b' }}>
                      Due {formatDateAU(invoice.due_date)}{isOverdue ? ` · ${daysOverdue}d overdue` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-semibold" style={{ color: '#1d1d1f' }}>
                    {formatCurrency(Number(invoice.total_amount))}
                  </p>
                  {isOverdue && (
                    <span
                      className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: tierColor.bg, color: tierColor.color }}
                    >
                      {penaltyTier.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
