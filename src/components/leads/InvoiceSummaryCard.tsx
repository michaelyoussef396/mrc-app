import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCopy, FileText, Loader2, Send } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  autoPopulateFromLead, calculateInvoiceTotals, markInvoiceSent,
  type CreateInvoiceInput, type InvoiceLineItem, type InvoiceTotals,
} from '@/lib/api/invoices'
import { formatCurrency } from '@/lib/calculations/pricing'

interface Props {
  leadId: string
  onRefresh: () => void
}

interface SummaryData {
  populated: CreateInvoiceInput
  totals: InvoiceTotals
  jobNumber: string | null
  completionDate: string | null
}

function formatDateAU(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function defaultDueDate(days = 14): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function buildClipboardText(d: SummaryData): string {
  const p = d.populated
  const lines: string[] = []
  lines.push(`INVOICE SUMMARY — ${p.customer_name}`)
  if (d.jobNumber) lines.push(`Job: ${d.jobNumber}`)
  if (d.completionDate) lines.push(`Completion: ${formatDateAU(d.completionDate)}`)
  lines.push('')
  lines.push(`Customer: ${p.customer_name}`)
  if (p.customer_email) lines.push(`Email: ${p.customer_email}`)
  if (p.customer_phone) lines.push(`Phone: ${p.customer_phone}`)
  if (p.property_address) lines.push(`Property: ${p.property_address}`)
  lines.push('')
  lines.push('LINE ITEMS')
  for (const li of (p.line_items ?? [])) {
    const tag = li.is_equipment ? ' [EQUIP]' : ''
    lines.push(`  ${li.description}${tag} — ${formatCurrency(li.total)}`)
  }
  lines.push('')
  lines.push(`Services subtotal:  ${formatCurrency(d.totals.subtotal - d.totals.equipment_subtotal)}`)
  lines.push(`Equipment subtotal: ${formatCurrency(d.totals.equipment_subtotal)}  (never discounted)`)
  if (d.totals.discount_amount > 0) {
    lines.push(`Discount (${p.discount_percentage ?? 0}% on services): -${formatCurrency(d.totals.discount_amount)}`)
  }
  lines.push(`Subtotal (ex GST):  ${formatCurrency(d.totals.subtotal_after_discount)}`)
  lines.push(`GST 10%:            ${formatCurrency(d.totals.gst_amount)}`)
  lines.push(`TOTAL inc GST:      ${formatCurrency(d.totals.total_amount)}`)
  return lines.join('\n')
}

export function InvoiceSummaryCard({ leadId, onRefresh }: Props) {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const populated = await autoPopulateFromLead(leadId)
        const totals = calculateInvoiceTotals(
          populated.line_items ?? [],
          populated.discount_percentage ?? 0,
        )
        const { data: jc } = await supabase
          .from('job_completions')
          .select('job_number, completion_date')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        setData({
          populated,
          totals,
          jobNumber: jc?.job_number ?? null,
          completionDate: jc?.completion_date ?? null,
        })
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load invoice summary')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [leadId])

  async function handleCopySummary() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(buildClipboardText(data))
      toast.success('Copied — paste into Xero/invoice template')
    } catch {
      toast.error('Clipboard write blocked')
    }
  }

  async function handleStartTracking() {
    if (!data) return
    if (data.totals.total_amount <= 0) {
      toast.error('Invoice total must be greater than 0')
      return
    }
    const p = data.populated
    const dueDate = p.due_date || defaultDueDate(14)
    const total = data.totals.total_amount

    setStarting(true)
    try {
      // 1. Insert invoice (draft)
      const { data: inserted, error: insertErr } = await supabase
        .from('invoices')
        .insert({
          lead_id: leadId,
          job_completion_id: p.job_completion_id ?? null,
          customer_name: p.customer_name,
          customer_email: p.customer_email ?? null,
          customer_phone: p.customer_phone ?? null,
          property_address: p.property_address ?? null,
          line_items: [],
          subtotal: total,
          discount_percentage: 0,
          discount_amount: 0,
          subtotal_after_discount: total,
          equipment_subtotal: 0,
          gst_amount: 0,
          total_amount: total,
          due_date: dueDate,
          status: 'draft',
        })
        .select('id')
        .single()
      if (insertErr || !inserted) throw insertErr ?? new Error('Insert returned no id')

      // 2. Mark sent (also transitions lead.status → invoicing_sent)
      await markInvoiceSent(inserted.id)

      toast.success(`Tracker created for ${formatCurrency(total)} · due ${formatDateAU(dueDate)}`)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start tracking')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">Invoice Summary</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">Invoice summary unavailable: {error ?? 'no data'}</p>
      </div>
    )
  }

  const p = data.populated
  const t = data.totals
  const servicesSubtotal = t.subtotal - t.equipment_subtotal
  const discountPct = p.discount_percentage ?? 0
  const dueDateStr = p.due_date || defaultDueDate(14)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Invoice Summary</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Copy these figures into your external invoice (Xero, etc.)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 flex-shrink-0"
          onClick={handleCopySummary}
        >
          <ClipboardCopy className="h-4 w-4 mr-1" />
          Copy
        </Button>
      </div>

      {/* Customer */}
      <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
        <p className="font-medium">{p.customer_name}</p>
        {p.customer_email && <p className="text-gray-600 break-all">{p.customer_email}</p>}
        {p.customer_phone && <p className="text-gray-600">{p.customer_phone}</p>}
        {p.property_address && <p className="text-gray-600">{p.property_address}</p>}
      </div>

      {/* Job */}
      {(data.jobNumber || data.completionDate) && (
        <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</p>
          {data.jobNumber && (
            <div className="flex justify-between">
              <span className="text-gray-500">Job number</span>
              <span className="font-mono text-xs">{data.jobNumber}</span>
            </div>
          )}
          {data.completionDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Completed</span>
              <span>{formatDateAU(data.completionDate)}</span>
            </div>
          )}
        </div>
      )}

      {/* Line items */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</p>
        {(p.line_items ?? []).length === 0 ? (
          <p className="text-sm text-amber-700">No line items — check inspection/job completion data.</p>
        ) : (
          <ul className="space-y-1.5">
            {(p.line_items ?? []).map((li: InvoiceLineItem, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">{li.description}</p>
                  {li.is_equipment && (
                    <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50">
                      Equipment
                    </Badge>
                  )}
                </div>
                <span className="font-medium tabular-nums whitespace-nowrap">
                  {formatCurrency(li.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="rounded-lg border border-gray-200 p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Services subtotal</span>
          <span className="tabular-nums">{formatCurrency(servicesSubtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Equipment subtotal</span>
          <span className="tabular-nums">{formatCurrency(t.equipment_subtotal)}</span>
        </div>
        {t.discount_amount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount ({discountPct}% on services)</span>
            <span className="tabular-nums">-{formatCurrency(t.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-1">
          <span className="text-gray-600">Subtotal ex GST</span>
          <span className="tabular-nums">{formatCurrency(t.subtotal_after_discount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">GST 10%</span>
          <span className="tabular-nums">{formatCurrency(t.gst_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-300 pt-1.5 mt-1">
          <span className="font-semibold">Total inc GST</span>
          <span className="font-bold text-base tabular-nums">{formatCurrency(t.total_amount)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Button
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleStartTracking}
          disabled={starting || t.total_amount <= 0}
        >
          {starting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating tracker…</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />I've sent the invoice — start tracking</>
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center">
          Creates a {formatCurrency(t.total_amount)} tracker due {formatDateAU(dueDateStr)}. You can edit after.
        </p>
      </div>
    </div>
  )
}
