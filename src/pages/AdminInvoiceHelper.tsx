import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, CheckCircle2, Clock, FileText, Loader2, Plus, Send, Trash2,
} from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PenaltyLadderWidget } from '@/components/invoices/PenaltyLadderWidget'
import {
  autoPopulateFromLead, getInvoiceByLeadId, logInvoiceActivity, markInvoicePaid, markInvoiceSent,
  saveCalculatedInvoice, LABOUR_LINE_PREFIX, EQUIPMENT_LINE_PREFIX,
  type EquipmentKey, type InvoiceLineItem, type InvoiceRow, type PaymentMethod,
} from '@/lib/api/invoices'
import { calculateCostEstimate, formatCurrency, GST_RATE, round2, EQUIPMENT_RATES } from '@/lib/calculations/pricing'
import { formatDateAU } from '@/lib/dateUtils'

const TERM_OPTIONS = [7, 14, 30, 60] as const
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

function emptyCustomItem(): InvoiceLineItem {
  return { description: '', quantity: 1, unit_price: 0, total: 0, is_equipment: false }
}

interface EquipmentUsage {
  qty: number
  days: number
}

// Rate card is sacred (CLAUDE.md): dehumidifier $132/day, air mover $46/day, RCD $5/day.
// Equipment is never volume-discounted — it feeds the engine as a flat ex-GST cost.
const EQUIPMENT_ROWS: { key: EquipmentKey; label: string; rate: number }[] = [
  { key: 'dehumidifier', label: 'Dehumidifier', rate: EQUIPMENT_RATES.dehumidifier },
  { key: 'airMover', label: 'Air Mover', rate: EQUIPMENT_RATES.airMover },
  { key: 'rcd', label: 'RCD Box', rate: EQUIPMENT_RATES.rcd },
]

/** Seed equipment qty/days from a job_completion row (actual equipment used). */
function seedEquipment(jc: {
  actual_dehumidifier_qty?: number | null
  actual_dehumidifier_days?: number | null
  actual_air_mover_qty?: number | null
  actual_air_mover_days?: number | null
  actual_rcd_qty?: number | null
  actual_rcd_days?: number | null
} | null): Record<EquipmentKey, EquipmentUsage> {
  return {
    dehumidifier: { qty: Number(jc?.actual_dehumidifier_qty ?? 0), days: Number(jc?.actual_dehumidifier_days ?? 0) },
    airMover: { qty: Number(jc?.actual_air_mover_qty ?? 0), days: Number(jc?.actual_air_mover_days ?? 0) },
    rcd: { qty: Number(jc?.actual_rcd_qty ?? 0), days: Number(jc?.actual_rcd_days ?? 0) },
  }
}

function isAutoLine(item: InvoiceLineItem): boolean {
  return item.description.startsWith(LABOUR_LINE_PREFIX) || item.description.startsWith(EQUIPMENT_LINE_PREFIX)
}

const EQUIPMENT_KEYS: EquipmentKey[] = ['dehumidifier', 'airMover', 'rcd']

/**
 * Reconstruct the per-item equipment breakdown from a saved invoice's line_items.
 * Returns null when no structured equipment rows exist (legacy/lump rows or first open),
 * which signals the caller to seed from the job completion instead.
 */
function equipmentFromLineItems(items: InvoiceLineItem[]): Record<EquipmentKey, EquipmentUsage> | null {
  const rows = Array.isArray(items) ? items.filter(li => li.is_equipment && li.equipment_key) : []
  if (rows.length === 0) return null
  const result = seedEquipment(null)
  for (const row of rows) {
    const key = row.equipment_key as EquipmentKey
    if (EQUIPMENT_KEYS.includes(key)) {
      result[key] = { qty: Number(row.equipment_qty ?? 0), days: Number(row.equipment_days ?? 0) }
    }
  }
  return result
}

/**
 * Reconstruct the labour hours breakdown stamped on the saved labour line.
 * Returns null when no labour line carries the breakdown (first open) so the caller
 * seeds hours from the inspection instead.
 */
function hoursFromLineItems(items: InvoiceLineItem[]): { nonDemo: number; demolition: number; subfloor: number } | null {
  if (!Array.isArray(items)) return null
  const labour = items.find(li => li.labour_non_demo_hours !== undefined
    || li.labour_demolition_hours !== undefined
    || li.labour_subfloor_hours !== undefined)
  if (!labour) return null
  return {
    nonDemo: Number(labour.labour_non_demo_hours ?? 0),
    demolition: Number(labour.labour_demolition_hours ?? 0),
    subfloor: Number(labour.labour_subfloor_hours ?? 0),
  }
}

export default function AdminInvoiceHelper() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  // Labour (hour-based) + equipment (per-item qty × days, seeded from the job completion)
  const [nonDemoHours, setNonDemoHours] = useState(0)
  const [demolitionHours, setDemolitionHours] = useState(0)
  const [subfloorHours, setSubfloorHours] = useState(0)
  const [equipment, setEquipment] = useState<Record<EquipmentKey, EquipmentUsage>>(() => seedEquipment(null))

  // Custom / variation line items (never volume-discounted)
  const [customItems, setCustomItems] = useState<InvoiceLineItem[]>([])

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
        const populated = await autoPopulateFromLead(leadId)
        const [{ data: jc }, { data: inspection }] = await Promise.all([
          supabase
            .from('job_completions')
            .select('id, job_number, actual_dehumidifier_qty, actual_dehumidifier_days, actual_air_mover_qty, actual_air_mover_days, actual_rcd_qty, actual_rcd_days')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('inspections')
            .select('no_demolition_hours, demolition_hours, subfloor_hours')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        if (cancelled) return

        setJobNumber(jc?.job_number ?? null)

        // Customer/header — prefer the persisted invoice, fall back to auto-populate
        setCustomerName(existing?.customer_name ?? populated.customer_name)
        setCustomerEmail(existing?.customer_email ?? populated.customer_email ?? null)
        setCustomerPhone(existing?.customer_phone ?? populated.customer_phone ?? null)
        setPropertyAddress(existing?.property_address ?? populated.property_address ?? null)
        setJobCompletionId(existing?.job_completion_id ?? populated.job_completion_id ?? null)

        // Equipment + hours: prefer the breakdown persisted in the saved invoice's line_items so
        // admin edits survive reload. Only seed from the job completion / inspection on first open,
        // when no structured breakdown exists yet (new invoice or legacy lump row).
        const savedEquipment = existing ? equipmentFromLineItems(existing.line_items) : null
        setEquipment(savedEquipment ?? seedEquipment(jc))

        const savedHours = existing ? hoursFromLineItems(existing.line_items) : null
        setNonDemoHours(savedHours ? savedHours.nonDemo : Number(inspection?.no_demolition_hours ?? 0))
        setDemolitionHours(savedHours ? savedHours.demolition : Number(inspection?.demolition_hours ?? 0))
        setSubfloorHours(savedHours ? savedHours.subfloor : Number(inspection?.subfloor_hours ?? 0))

        if (existing) {
          setInvoiceId(existing.id)
          setInvoiceRow(existing)
          setStatus(existing.status)
          setNotes(existing.notes ?? '')
          setInvoiceDate(existing.invoice_date)
          const diff = daysBetween(existing.invoice_date, existing.due_date)
          setTermDays((TERM_OPTIONS as readonly number[]).includes(diff) ? diff : 14)
          setCustomItems(existing.line_items.filter(li => !isAutoLine(li) && !li.is_equipment))
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

  // Itemised equipment lines (qty × days × rate) — the source of truth for equipment cost.
  // Zero-total rows are dropped so they never reach the saved invoice / PDF.
  const equipmentLineItems = useMemo<InvoiceLineItem[]>(
    () => EQUIPMENT_ROWS.map(row => {
      const { qty, days } = equipment[row.key]
      const total = round2(qty * days * row.rate)
      return {
        description: `${row.label} (${qty} × ${days} ${days === 1 ? 'day' : 'days'} @ ${formatCurrency(row.rate)}/day)`,
        quantity: qty * days,
        unit_price: row.rate,
        total,
        is_equipment: true,
        equipment_key: row.key,
        equipment_qty: qty,
        equipment_days: days,
      }
    }).filter(it => it.total > 0),
    [equipment],
  )

  const equipmentCost = useMemo(
    () => round2(equipmentLineItems.reduce((sum, it) => sum + it.total, 0)),
    [equipmentLineItems],
  )

  // Labour + volume discount via the canonical pricing engine (13% cap enforced inside).
  // Equipment enters as a flat ex-GST cost and is never discounted.
  const estimate = useMemo(
    () => calculateCostEstimate({ nonDemoHours, demolitionHours, subfloorHours, equipmentCost }),
    [nonDemoHours, demolitionHours, subfloorHours, equipmentCost],
  )

  const customTotal = useMemo(
    () => round2(customItems.reduce((sum, ci) => sum + (ci.total || 0), 0)),
    [customItems],
  )

  // Grand totals = labour/equipment estimate (engine) + undiscounted custom items
  const subtotalExGst = round2(estimate.subtotalExGst + customTotal)
  const gstAmount = round2(subtotalExGst * GST_RATE)
  const totalIncGst = round2(subtotalExGst + gstAmount)

  const dueDate = useMemo(() => addDaysISO(invoiceDate, termDays), [invoiceDate, termDays])
  const isSentLike = status === 'sent' || status === 'viewed' || status === 'overdue'
  const isPaid = status === 'paid'

  function updateEquipment(key: EquipmentKey, field: keyof EquipmentUsage, value: number) {
    setEquipment(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function updateCustomItem(index: number, patch: { description?: string; amount?: number }) {
    setCustomItems(prev => prev.map((ci, i) => {
      if (i !== index) return ci
      const next = { ...ci }
      if (patch.description !== undefined) next.description = patch.description
      if (patch.amount !== undefined) {
        next.unit_price = patch.amount
        next.quantity = 1
        next.total = round2(patch.amount)
      }
      return next
    }))
  }

  function addCustomItem() {
    setCustomItems(prev => [...prev, emptyCustomItem()])
  }

  function removeCustomItem(index: number) {
    setCustomItems(prev => prev.filter((_, i) => i !== index))
  }

  /** Persist via the pricing engine. Returns the invoice id, or null on failure. */
  async function persist(): Promise<string | null> {
    try {
      const row = await saveCalculatedInvoice({
        lead_id: leadId as string,
        invoiceId,
        job_completion_id: jobCompletionId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        property_address: propertyAddress,
        nonDemoHours,
        demolitionHours,
        subfloorHours,
        equipmentCost,
        equipmentItems: equipmentLineItems,
        customItems,
        due_date: dueDate,
        notes: notes || null,
      })
      setInvoiceId(row.id)
      setInvoiceRow(row)
      setStatus(row.status)
      return row.id
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice')
      return null
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    const id = await persist()
    setSaving(false)
    if (id) {
      void logInvoiceActivity(leadId as string, 'invoice_updated', {
        invoice_id: id,
        total_amount: totalIncGst,
        status,
        saved_at: new Date().toISOString(),
      })
      toast.success('Draft saved')
    }
  }

  async function handleConfirmSent() {
    setSaving(true)
    try {
      const id = await persist()
      if (!id) return
      await markInvoiceSent(id)
      void logInvoiceActivity(leadId as string, 'invoice_sent', {
        invoice_id: id,
        total_amount: totalIncGst,
        due_date: dueDate,
        sent_at: new Date().toISOString(),
      })
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

      {/* B — Labour (hour-based) */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-600" />
          <h2 className="font-semibold">Labour &amp; Equipment</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="nonDemoHours" className="text-xs text-gray-500">Non-demolition hours</Label>
            <Input
              id="nonDemoHours"
              type="number"
              min={0}
              step="0.5"
              value={nonDemoHours || ''}
              disabled={saving}
              onChange={e => setNonDemoHours(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="demolitionHours" className="text-xs text-gray-500">Demolition hours</Label>
            <Input
              id="demolitionHours"
              type="number"
              min={0}
              step="0.5"
              value={demolitionHours || ''}
              disabled={saving}
              onChange={e => setDemolitionHours(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="subfloorHours" className="text-xs text-gray-500">Subfloor hours</Label>
            <Input
              id="subfloorHours"
              type="number"
              min={0}
              step="0.5"
              value={subfloorHours || ''}
              disabled={saving}
              onChange={e => setSubfloorHours(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Equipment used — per-item qty × days, seeded from the job completion. Never discounted. */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs text-gray-500">Equipment used (from job completion)</Label>
            <span className="text-[11px] text-gray-400">qty × days × daily rate</span>
          </div>
          <div className="space-y-2">
            {EQUIPMENT_ROWS.map(row => {
              const { qty, days } = equipment[row.key]
              const lineTotal = round2(qty * days * row.rate)
              return (
                <div key={row.key} className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{row.label}</span>
                    <span className="text-xs text-gray-500">{formatCurrency(row.rate)}/day</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`${row.key}-qty`} className="text-xs text-gray-500">Qty</Label>
                      <Input
                        id={`${row.key}-qty`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step="1"
                        value={qty || ''}
                        disabled={saving}
                        onChange={e => updateEquipment(row.key, 'qty', Number(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${row.key}-days`} className="text-xs text-gray-500">Days</Label>
                      <Input
                        id={`${row.key}-days`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step="1"
                        value={days || ''}
                        disabled={saving}
                        onChange={e => updateEquipment(row.key, 'days', Number(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
                    <span className="text-gray-500">Line total</span>
                    <span className="font-medium tabular-nums">{formatCurrency(lineTotal)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600 font-medium">Equipment subtotal (never discounted)</span>
            <span className="font-semibold tabular-nums">{formatCurrency(equipmentCost)}</span>
          </div>
        </div>

        {/* Live labour readout from calculateCostEstimate() */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total labour hours</span>
            <span className="tabular-nums">{estimate.totalLabourHours}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Labour before discount</span>
            <span className="tabular-nums">{formatCurrency(estimate.labourSubtotal)}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>
              Volume discount
              <span className="text-xs text-gray-400 ml-1">
                ({(estimate.discountPercent * 100).toFixed(estimate.discountPercent === 0 ? 0 : 2)}% · auto)
              </span>
            </span>
            <span className="tabular-nums">
              {estimate.discountAmount > 0 ? `-${formatCurrency(estimate.discountAmount)}` : formatCurrency(0)}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">{estimate.discountTierDescription} — discount auto-calculated from hours, max 13%.</p>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span className="text-gray-600">Labour after discount</span>
            <span className="tabular-nums">{formatCurrency(estimate.labourAfterDiscount)}</span>
          </div>
        </div>
      </section>

      {/* C — Custom line items (variations / misc, never discounted) */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Custom Line Items</h2>
            <p className="text-xs text-gray-500">Variations &amp; miscellaneous — not volume-discounted.</p>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={addCustomItem} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" />Add item
          </Button>
        </div>

        {customItems.length === 0 ? (
          <p className="text-sm text-gray-400">No custom items.</p>
        ) : (
          <div className="space-y-3">
            {customItems.map((ci, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-gray-500">Description</Label>
                    <Input
                      value={ci.description}
                      disabled={saving}
                      onChange={e => updateCustomItem(i, { description: e.target.value })}
                      placeholder="e.g. Variation — additional containment"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 mt-5 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    onClick={() => removeCustomItem(i)}
                    disabled={saving}
                    aria-label="Remove custom item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="w-40">
                    <Label className="text-xs text-gray-500">Amount (ex GST)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={ci.total || ''}
                      disabled={saving}
                      onChange={e => updateCustomItem(i, { amount: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <span className="font-medium tabular-nums pb-2">{formatCurrency(ci.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invoice totals */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Labour (after discount)</span>
            <span className="tabular-nums">{formatCurrency(estimate.labourAfterDiscount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Equipment</span>
            <span className="tabular-nums">{formatCurrency(equipmentCost)}</span>
          </div>
          {customTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Custom items</span>
              <span className="tabular-nums">{formatCurrency(customTotal)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span className="text-gray-600">Subtotal ex GST</span>
            <span className="tabular-nums">{formatCurrency(subtotalExGst)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">GST 10%</span>
            <span className="tabular-nums">{formatCurrency(gstAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-300 pt-1.5 mt-1">
            <span className="font-semibold">Total inc GST</span>
            <span className="font-bold text-base tabular-nums">{formatCurrency(totalIncGst)}</span>
          </div>
        </div>
      </section>

      {/* Payment terms */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <h2 className="font-semibold">Payment Terms</h2>
        <div className="flex items-center gap-3">
          <Select
            value={String(termDays)}
            disabled={saving}
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

      {/* Notes */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <Label htmlFor="notes" className="font-semibold">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          disabled={saving}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes for this invoice"
        />
      </section>

      {/* Penalty ladder — shown whenever a due date exists (draft included) so the admin can
          preview the upcoming timeline before sending. Fed from live state, not just the saved row. */}
      {dueDate && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <PenaltyLadderWidget invoice={{ due_date: dueDate, status, sent_at: invoiceRow?.sent_at ?? null }} />
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

      {/* Sticky actions — invoice stays editable at every status (admin can correct + resend) */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur p-3 z-10">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 min-w-[140px] h-12"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Draft
          </Button>
          <Button
            className="flex-1 min-w-[140px] h-12 bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => setSentConfirmOpen(true)}
            disabled={saving || totalIncGst <= 0}
          >
            <Send className="h-4 w-4 mr-2" />Mark Invoice as Sent to Client
          </Button>
          {invoiceId && !isPaid && (
            <Button
              className="flex-1 min-w-[140px] h-12 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setPaidOpen(true)}
              disabled={saving}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Mark as Sent confirm */}
      <Dialog open={sentConfirmOpen} onOpenChange={setSentConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark invoice as sent to client?</DialogTitle>
            <DialogDescription>
              Have you created this invoice in Xero and are ready to mark it as sent? This advances
              the pipeline to <strong>Invoicing Sent</strong> and notifies the team on Slack.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm flex justify-between">
            <span className="text-gray-600">Total inc GST</span>
            <span className="font-bold tabular-nums">{formatCurrency(totalIncGst)}</span>
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
