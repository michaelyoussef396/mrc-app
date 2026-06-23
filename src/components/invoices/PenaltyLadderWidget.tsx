import { ShieldAlert, ShieldX, CalendarClock } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { formatDateAU } from '@/lib/dateUtils'
import { getDaysOverdue, getPenaltyTier } from '@/lib/calculations/penaltyLadder'
import type { InvoiceRow } from '@/lib/api/invoices'

/**
 * T&Cs penalty-ladder timeline. DISPLAY ONLY — no fee or interest shown here is
 * ever charged by MRC; Xero owns the real calculation post-integration.
 *
 * Milestone dates are derived from `due_date` (not days-since-sent), so the
 * ladder stays correct across the 7/14/30/60-day payment-terms selector.
 * Drives entirely off getPenaltyTier() — single source of truth with the
 * inline LeadDetail card and the AdminInvoiceHelper page.
 */
interface Props {
  invoice: Pick<InvoiceRow, 'due_date' | 'status' | 'sent_at'>
  now?: Date
  className?: string
}

interface Milestone {
  offsetDays: number // relative to due_date (0 = due date)
  label: string
  detail: string
  severity: 'amber' | 'red'
}

const MILESTONES: Milestone[] = [
  { offsetDays: 0, label: 'Payment due', detail: 'End of payment terms', severity: 'amber' },
  { offsetDays: 1, label: 'Overdue — warranty suspended', detail: '$65 admin fee · 10% p.a. interest begins', severity: 'red' },
  { offsetDays: 8, label: 'Second reminder', detail: '+$65 admin fee', severity: 'red' },
  { offsetDays: 15, label: 'Final notice', detail: '+$65 admin fee', severity: 'red' },
  { offsetDays: 16, label: 'Warranty VOID', detail: '35% p.a. combined interest', severity: 'red' },
  { offsetDays: 29, label: 'Ongoing fees', detail: '$65 every 14 days', severity: 'red' },
]

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function PenaltyLadderWidget({ invoice, now, className }: Props) {
  if (!invoice.due_date) return null

  const daysOverdue = getDaysOverdue(invoice, now)
  const tier = getPenaltyTier(daysOverdue)

  // Index of the latest milestone reached (none until actually overdue).
  const currentIdx = MILESTONES.reduce(
    (acc, m, i) => (daysOverdue > 0 && daysOverdue >= m.offsetDays ? i : acc),
    -1,
  )

  return (
    <div className={className}>
      {tier.warrantyVoid && (
        <Alert className="border-red-300 bg-red-50 text-red-900 mb-3">
          <ShieldX className="h-4 w-4 !text-red-600" />
          <AlertTitle className="text-red-800">Warranty void · {daysOverdue} days overdue</AlertTitle>
          <AlertDescription className="text-red-700">{tier.description}</AlertDescription>
        </Alert>
      )}
      {tier.warrantySuspended && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 mb-3">
          <ShieldAlert className="h-4 w-4 !text-amber-600" />
          <AlertTitle className="text-amber-800">Warranty suspended · {daysOverdue} days overdue</AlertTitle>
          <AlertDescription className="text-amber-700">{tier.description}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            T&amp;Cs Penalty Ladder
          </p>
          <Badge
            className={
              tier.warrantyVoid
                ? 'bg-red-100 text-red-700 border-red-200 font-semibold'
                : tier.warrantySuspended
                  ? 'bg-amber-100 text-amber-800 border-amber-200 font-semibold'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold'
            }
          >
            {tier.label}
          </Badge>
        </div>

        {invoice.sent_at && (
          <p className="text-[11px] text-gray-500">
            Invoice sent {formatDateAU(invoice.sent_at)} · due {formatDateAU(invoice.due_date)}
          </p>
        )}

        <ol className="space-y-1">
          {MILESTONES.map((m, i) => {
            const isCurrent = i === currentIdx
            const isPast = currentIdx >= 0 && i < currentIdx
            const milestoneDate = addDaysISO(invoice.due_date as string, m.offsetDays)
            const tone =
              isCurrent && m.severity === 'red' ? 'border-red-500 bg-red-50 text-red-700'
                : isCurrent ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : isPast ? 'border-gray-300 bg-white text-gray-500 opacity-70'
                    : 'border-gray-200 bg-white text-gray-600 opacity-80'
            return (
              <li key={m.offsetDays} className={`flex items-start gap-2 rounded border-l-2 pl-2 py-1 ${tone}`}>
                <span className="text-[11px] font-mono tabular-nums w-[68px] flex-shrink-0 font-semibold">
                  {formatDateAU(milestoneDate)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">{m.label}</p>
                  <p className="text-[11px] text-gray-500 leading-tight">{m.detail}</p>
                </div>
                {isCurrent && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0">Now</span>
                )}
              </li>
            )
          })}
        </ol>

        <p className="text-[11px] text-gray-400 leading-tight pt-1 border-t border-gray-200">
          Fees and interest shown are informational (per T&amp;Cs). MRC does not charge them —
          Xero calculates and collects after integration.
        </p>
      </div>
    </div>
  )
}
