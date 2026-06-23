import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError, addBusinessBreadcrumb } from '@/lib/sentry'
import { GST_RATE, MAX_DISCOUNT, EQUIPMENT_RATES, calculateCostEstimate } from '@/lib/calculations/pricing'
import { notifyInvoiceSent, notifyPaymentReceived } from '@/lib/api/notifications'

// ============================================================
// TYPES
// ============================================================

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void'
export type PaymentMethod = 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'cheque'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
  is_equipment: boolean
}

export interface InvoiceTotals {
  subtotal: number
  equipment_subtotal: number
  discount_amount: number
  subtotal_after_discount: number
  gst_amount: number
  total_amount: number
}

export interface InvoiceRow {
  id: string
  lead_id: string | null
  job_completion_id: string | null
  invoice_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  property_address: string | null
  line_items: InvoiceLineItem[]
  subtotal: number
  discount_percentage: number
  discount_amount: number
  subtotal_after_discount: number
  gst_amount: number
  total_amount: number
  equipment_subtotal: number
  status: InvoiceStatus
  payment_method: PaymentMethod | null
  payment_date: string | null
  payment_reference: string | null
  invoice_date: string
  due_date: string
  sent_at: string | null
  paid_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateInvoiceInput {
  lead_id: string
  job_completion_id?: string | null
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  property_address?: string | null
  line_items?: InvoiceLineItem[]
  discount_percentage?: number
  due_date?: string  // ISO date
  notes?: string | null
}

// ============================================================
// PURE CALCULATION FUNCTIONS
// ============================================================

/**
 * Calculate invoice totals from line items + discount.
 *
 * SACRED RULES enforced here:
 * - 13% maximum discount (MAX_DISCOUNT from pricing.ts) — NEVER exceed
 * - Discount applies ONLY to non-equipment line items
 * - Equipment (is_equipment=true) is NEVER discounted
 * - GST is 10% on (discounted services + equipment)
 */
export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  discountPercentage: number,
): InvoiceTotals {
  // Clamp discount at the cap — defence against bad input
  const cap = MAX_DISCOUNT * 100  // 13
  const clampedPct = Math.max(0, Math.min(cap, discountPercentage))
  const discountDecimal = clampedPct / 100

  const equipmentItems = lineItems.filter(item => item.is_equipment)
  const serviceItems = lineItems.filter(item => !item.is_equipment)

  const equipment_subtotal = equipmentItems.reduce((sum, item) => sum + item.total, 0)
  const serviceSubtotal = serviceItems.reduce((sum, item) => sum + item.total, 0)

  const subtotal = serviceSubtotal + equipment_subtotal

  // Discount applies only to services
  const discount_amount = round2(serviceSubtotal * discountDecimal)
  const servicesAfterDiscount = round2(serviceSubtotal - discount_amount)

  const subtotal_after_discount = round2(servicesAfterDiscount + equipment_subtotal)

  const gst_amount = round2(subtotal_after_discount * GST_RATE)
  const total_amount = round2(subtotal_after_discount + gst_amount)

  return {
    subtotal: round2(subtotal),
    equipment_subtotal: round2(equipment_subtotal),
    discount_amount,
    subtotal_after_discount,
    gst_amount,
    total_amount,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ============================================================
// QUERIES
// ============================================================

export async function getInvoiceByLeadId(leadId: string): Promise<InvoiceRow | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    captureBusinessError('Failed to fetch invoice by lead', { leadId, error: error.message })
    throw new Error(`Failed to fetch invoice: ${error.message}`)
  }
  return data as InvoiceRow | null
}

/**
 * All issued-but-unpaid invoices (sent / viewed / overdue), ordered by soonest due.
 * Used by the admin Outstanding Invoices widget. We include 'sent' and 'viewed'
 * (not just persisted 'overdue') so a past-due invoice surfaces even if the
 * overdue-flagging cron hasn't run yet — past-due is derived client-side from
 * due_date via getDaysOverdue, not from the stored status.
 */
export async function getOutstandingInvoices(): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['sent', 'viewed', 'overdue'])
    .order('due_date', { ascending: true })

  if (error) {
    captureBusinessError('Failed to fetch outstanding invoices', { error: error.message })
    throw new Error(`Failed to fetch outstanding invoices: ${error.message}`)
  }
  return (data ?? []) as InvoiceRow[]
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceRow> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (error) {
    captureBusinessError('Failed to fetch invoice', { invoiceId, error: error.message })
    throw new Error(`Failed to fetch invoice: ${error.message}`)
  }
  return data as InvoiceRow
}

// ============================================================
// MUTATIONS
// ============================================================

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceRow> {
  addBusinessBreadcrumb('Creating invoice', { leadId: input.lead_id })

  const lineItems = input.line_items ?? []
  const discountPct = input.discount_percentage ?? 0
  const totals = calculateInvoiceTotals(lineItems, discountPct)

  const dueDate = input.due_date ?? defaultDueDate(14)

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      lead_id: input.lead_id,
      job_completion_id: input.job_completion_id ?? null,
      customer_name: input.customer_name,
      customer_email: input.customer_email ?? null,
      customer_phone: input.customer_phone ?? null,
      property_address: input.property_address ?? null,
      line_items: lineItems,
      subtotal: totals.subtotal,
      discount_percentage: Math.min(MAX_DISCOUNT * 100, Math.max(0, discountPct)),
      discount_amount: totals.discount_amount,
      subtotal_after_discount: totals.subtotal_after_discount,
      equipment_subtotal: totals.equipment_subtotal,
      gst_amount: totals.gst_amount,
      total_amount: totals.total_amount,
      due_date: dueDate,
      notes: input.notes ?? null,
      created_by: user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    captureBusinessError('Failed to create invoice', { leadId: input.lead_id, error: error.message })
    throw new Error(`Failed to create invoice: ${error.message}`)
  }
  return data as InvoiceRow
}

export async function updateInvoice(
  invoiceId: string,
  updates: Partial<Pick<InvoiceRow,
    'line_items' | 'discount_percentage' | 'notes' | 'customer_name' |
    'customer_email' | 'customer_phone' | 'property_address' | 'due_date'
  >>,
): Promise<InvoiceRow> {
  const patch: Record<string, unknown> = { ...updates }

  if (updates.line_items !== undefined || updates.discount_percentage !== undefined) {
    // Need current state if only one is being changed
    let lineItems = updates.line_items
    let discountPct = updates.discount_percentage

    if (lineItems === undefined || discountPct === undefined) {
      const current = await getInvoiceById(invoiceId)
      if (lineItems === undefined) lineItems = current.line_items
      if (discountPct === undefined) discountPct = current.discount_percentage
    }

    const totals = calculateInvoiceTotals(lineItems, discountPct)
    patch.line_items = lineItems
    patch.discount_percentage = Math.min(MAX_DISCOUNT * 100, Math.max(0, discountPct))
    patch.subtotal = totals.subtotal
    patch.discount_amount = totals.discount_amount
    patch.subtotal_after_discount = totals.subtotal_after_discount
    patch.equipment_subtotal = totals.equipment_subtotal
    patch.gst_amount = totals.gst_amount
    patch.total_amount = totals.total_amount
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    captureBusinessError('Failed to update invoice', { invoiceId, error: error.message })
    throw new Error(`Failed to update invoice: ${error.message}`)
  }
  return data as InvoiceRow
}

// Stable prefixes so the auto-generated labour/equipment lines can be told apart
// from admin-entered custom lines when an invoice is reloaded for editing.
export const LABOUR_LINE_PREFIX = 'Mould remediation labour'
export const EQUIPMENT_LINE_PREFIX = 'Drying & remediation equipment'

export interface CalculatedInvoiceInput {
  lead_id: string
  invoiceId?: string | null
  job_completion_id?: string | null
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  property_address?: string | null
  // Labour hours drive the pricing engine (volume discount is derived, never typed)
  nonDemoHours: number
  demolitionHours: number
  subfloorHours: number
  // Equipment is a direct ex-GST dollar figure (matches the inspection pricing pattern)
  equipmentCost: number
  // Itemised equipment rows (dehumidifier / air mover / RCD). When present these are the
  // source of truth — their sum drives equipment_subtotal and the engine equipment cost,
  // and each is persisted as its own line item. Equipment is NEVER volume-discounted.
  equipmentItems?: InvoiceLineItem[]
  // Variations / miscellaneous — never volume-discounted
  customItems: InvoiceLineItem[]
  due_date: string
  notes?: string | null
}

/**
 * Create or update an invoice from hour-based labour + direct equipment + custom lines,
 * using the canonical pricing engine (calculateCostEstimate) for labour and the volume
 * discount. The 13% cap is enforced by calculateCostEstimate's discount tiers AND the
 * invoices.discount_percentage CHECK constraint — this function never overrides it.
 *
 * The volume discount applies ONLY to labour (as the engine computes it); equipment and
 * custom items are never discounted. We persist the engine's derived figures directly so
 * the stored row matches what the admin sees. line_items carry the final charged amounts
 * (labour after discount, equipment, custom) for the invoice/PDF record.
 *
 * Column mapping (no labour_cost/total_inc_gst columns exist on this table):
 *   subtotal                = gross ex-GST before discount (labour + equipment + custom)
 *   discount_amount/_pct    = labour volume discount
 *   subtotal_after_discount = ex-GST after discount  (the "subtotal ex GST" figure)
 *   equipment_subtotal      = equipment cost (Σ of itemised equipment rows when provided)
 *   gst_amount              = 10% of subtotal_after_discount
 *   total_amount            = inc-GST total
 */
export async function saveCalculatedInvoice(input: CalculatedInvoiceInput): Promise<InvoiceRow> {
  addBusinessBreadcrumb('Saving calculated invoice', { leadId: input.lead_id, invoiceId: input.invoiceId ?? null })

  // Equipment is the sum of its itemised rows when provided (the source of truth), else the
  // direct ex-GST figure. Either way it feeds the engine as a flat cost and is NEVER discounted.
  const equipmentItems: InvoiceLineItem[] = (input.equipmentItems ?? [])
    .filter(it => it.total > 0)
    .map(it => ({ ...it, is_equipment: true }))
  const equipment_subtotal = equipmentItems.length > 0
    ? round2(equipmentItems.reduce((sum, it) => sum + it.total, 0))
    : round2(input.equipmentCost)

  const est = calculateCostEstimate({
    nonDemoHours: input.nonDemoHours,
    demolitionHours: input.demolitionHours,
    subfloorHours: input.subfloorHours,
    equipmentCost: equipment_subtotal,
  })

  // calculateCostEstimate caps the volume discount at MAX_DISCOUNT (≤13%). Clamp again as
  // defence-in-depth before it reaches the discount_percentage CHECK (0–13) column.
  const discount_percentage = Math.min(MAX_DISCOUNT * 100, Math.max(0, round2(est.discountPercent * 100)))
  const discount_amount = round2(est.discountAmount)

  const cleanCustom: InvoiceLineItem[] = input.customItems
    .filter(ci => ci.description.trim().length > 0 && ci.total > 0)
    .map(ci => ({ ...ci, is_equipment: false }))
  const customTotal = round2(cleanCustom.reduce((sum, ci) => sum + ci.total, 0))

  const subtotal = round2(est.labourSubtotal + equipment_subtotal + customTotal)
  const subtotal_after_discount = round2(est.subtotalExGst + customTotal)
  const gst_amount = round2(subtotal_after_discount * GST_RATE)
  const total_amount = round2(subtotal_after_discount + gst_amount)

  const line_items: InvoiceLineItem[] = []
  if (est.labourAfterDiscount > 0) {
    const labour = round2(est.labourAfterDiscount)
    const discountNote = est.discountPercent > 0 ? `, ${round2(est.discountPercent * 100)}% volume discount` : ''
    line_items.push({
      description: `${LABOUR_LINE_PREFIX} (${est.totalLabourHours}h${discountNote})`,
      quantity: 1,
      unit_price: labour,
      total: labour,
      is_equipment: false,
    })
  }
  if (equipmentItems.length > 0) {
    line_items.push(...equipmentItems)
  } else if (equipment_subtotal > 0) {
    line_items.push({
      description: EQUIPMENT_LINE_PREFIX,
      quantity: 1,
      unit_price: equipment_subtotal,
      total: equipment_subtotal,
      is_equipment: true,
    })
  }
  line_items.push(...cleanCustom)

  const payload = {
    customer_name: input.customer_name,
    customer_email: input.customer_email ?? null,
    customer_phone: input.customer_phone ?? null,
    property_address: input.property_address ?? null,
    job_completion_id: input.job_completion_id ?? null,
    line_items,
    subtotal,
    discount_percentage,
    discount_amount,
    subtotal_after_discount,
    equipment_subtotal,
    gst_amount,
    total_amount,
    due_date: input.due_date,
    notes: input.notes ?? null,
  }

  if (input.invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', input.invoiceId)
      .select()
      .single()
    if (error) {
      captureBusinessError('Failed to update calculated invoice', { invoiceId: input.invoiceId, error: error.message })
      throw new Error(`Failed to save invoice: ${error.message}`)
    }
    return data as InvoiceRow
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('invoices')
    .insert({ lead_id: input.lead_id, ...payload, created_by: user?.id ?? null })
    .select()
    .single()
  if (error) {
    captureBusinessError('Failed to create calculated invoice', { leadId: input.lead_id, error: error.message })
    throw new Error(`Failed to create invoice: ${error.message}`)
  }
  return data as InvoiceRow
}

/**
 * Manual total override for a tracked invoice (Edit dialog).
 *
 * The admin types a GST-inclusive total that intentionally stops deriving from
 * line items (e.g. an externally-agreed figure). We keep the row internally
 * consistent — subtotal = total / (1 + GST), gst = the remainder — instead of
 * stamping the same number onto three columns and leaving gst_amount stale.
 * equipment_subtotal / discount_amount / line_items / discount_percentage are
 * preserved as stored: an override means the total no longer derives from
 * components, not that those components vanish.
 */
export async function applyManualInvoiceTotal(
  invoiceId: string,
  totalIncGst: number,
  fields: { due_date?: string; payment_reference?: string | null; notes?: string | null },
): Promise<InvoiceRow> {
  if (totalIncGst <= 0) {
    throw new Error('Invoice total must be greater than 0')
  }

  const subtotal = round2(totalIncGst / (1 + GST_RATE))
  const total_amount = round2(totalIncGst)
  const gst_amount = round2(total_amount - subtotal)

  const patch: Record<string, unknown> = {
    subtotal,
    subtotal_after_discount: subtotal,
    gst_amount,
    total_amount,
  }
  if (fields.due_date !== undefined) patch.due_date = fields.due_date
  if (fields.payment_reference !== undefined) patch.payment_reference = fields.payment_reference
  if (fields.notes !== undefined) patch.notes = fields.notes

  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    captureBusinessError('Failed to apply manual invoice total', { invoiceId, error: error.message })
    throw new Error(`Failed to update invoice: ${error.message}`)
  }
  return data as InvoiceRow
}

export async function markInvoiceSent(invoiceId: string): Promise<void> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select('lead_id, customer_name, invoice_number, total_amount')
    .single()

  if (error) {
    captureBusinessError('Failed to mark invoice sent', { invoiceId, error: error.message })
    throw new Error(`Failed to mark sent: ${error.message}`)
  }

  if (data?.lead_id) {
    // Transition lead status (await so caller sees new status after refetch)
    const { error: statusErr } = await supabase
      .from('leads')
      .update({ status: 'invoicing_sent' })
      .eq('id', data.lead_id)
    if (statusErr) {
      console.error('Lead status update failed:', statusErr)
    }

    // Fire-and-forget Slack alert
    notifyInvoiceSent({
      leadId: data.lead_id,
      leadName: data.customer_name,
      invoiceNumber: data.invoice_number,
      totalAmount: Number(data.total_amount),
    }).catch(err => console.error('Slack notify failed (non-fatal):', err))
  }
}

export async function markInvoicePaid(
  invoiceId: string,
  paymentMethod: PaymentMethod,
  paymentReference?: string,
  paymentDate?: string,
): Promise<void> {
  const current = await getInvoiceById(invoiceId)
  if (current.status === 'paid') return

  // A custom payment_date records when payment actually landed; default to today.
  // paid_at anchors a custom date to local midday to avoid timezone day-rollover.
  const payment_date = paymentDate ?? new Date().toISOString().split('T')[0]
  const paid_at = paymentDate
    ? new Date(`${paymentDate}T12:00:00`).toISOString()
    : new Date().toISOString()

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      payment_reference: paymentReference ?? null,
      payment_date,
      paid_at,
    })
    .eq('id', invoiceId)
    .select('lead_id, customer_name, invoice_number, total_amount')
    .single()

  if (error) {
    captureBusinessError('Failed to mark invoice paid', { invoiceId, error: error.message })
    throw new Error(`Failed to mark paid: ${error.message}`)
  }

  // Fire-and-forget Slack alert + transition lead to 'paid'
  if (data?.lead_id) {
    notifyPaymentReceived({
      leadId: data.lead_id,
      leadName: data.customer_name,
      invoiceNumber: data.invoice_number,
      totalAmount: Number(data.total_amount),
      paymentMethod,
    }).catch(err => console.error('Slack notify failed (non-fatal):', err))

    // Transition lead status
    supabase.from('leads').update({ status: 'paid' }).eq('id', data.lead_id)
      .then(({ error: err }) => {
        if (err) console.error('Lead status update failed:', err)
      })
  }
}

export async function markInvoiceOverdue(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('id', invoiceId)

  if (error) {
    captureBusinessError('Failed to mark invoice overdue', { invoiceId, error: error.message })
    throw new Error(`Failed to mark overdue: ${error.message}`)
  }
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'void' })
    .eq('id', invoiceId)

  if (error) {
    captureBusinessError('Failed to void invoice', { invoiceId, error: error.message })
    throw new Error(`Failed to void: ${error.message}`)
  }
}

// ============================================================
// AUTO-POPULATE FROM LEAD + JOB COMPLETION + INSPECTION
// ============================================================

/**
 * Auto-populate a draft invoice from lead + job completion + inspection data.
 * Returns a ready-to-pass CreateInvoiceInput. Does not create the invoice.
 */
export async function autoPopulateFromLead(leadId: string): Promise<CreateInvoiceInput> {
  // Lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode')
    .eq('id', leadId)
    .is('archived_at', null)
    .single()

  if (leadError || !lead) {
    throw new Error(`Lead not found: ${leadError?.message}`)
  }

  const address = [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_state,
    lead.property_address_postcode,
  ].filter(Boolean).join(', ')

  // Job completion (most recent)
  const { data: jc } = await supabase
    .from('job_completions')
    .select('id, actual_dehumidifier_qty, actual_dehumidifier_days, actual_air_mover_qty, actual_air_mover_days, actual_rcd_qty, actual_rcd_days')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Inspection (for quoted amount + labour)
  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .select('total_inc_gst, subtotal_ex_gst, labour_cost_ex_gst, equipment_cost_ex_gst, discount_percent')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // A null row (no inspection yet) is legitimate; only a real query error must throw.
  // Swallowing it here previously dropped the labour line + discount silently.
  if (inspectionError) {
    captureBusinessError('Failed to fetch inspection for invoice auto-populate', {
      leadId,
      error: inspectionError.message,
    })
    throw new Error(`Failed to load inspection pricing: ${inspectionError.message}`)
  }

  const lineItems: InvoiceLineItem[] = []

  // Labour line
  if (inspection?.labour_cost_ex_gst && Number(inspection.labour_cost_ex_gst) > 0) {
    const labour = Number(inspection.labour_cost_ex_gst)
    lineItems.push({
      description: 'Mould remediation labour',
      quantity: 1,
      unit_price: labour,
      total: labour,
      is_equipment: false,
    })
  }

  // Equipment lines from job completion actuals (falls back to inspection total if JC not set)
  if (jc) {
    if (jc.actual_dehumidifier_qty && jc.actual_dehumidifier_days) {
      const qty = jc.actual_dehumidifier_qty
      const days = jc.actual_dehumidifier_days
      lineItems.push({
        description: `Commercial dehumidifier (${qty} units × ${days} days)`,
        quantity: qty * days,
        unit_price: EQUIPMENT_RATES.dehumidifier,
        total: round2(qty * days * EQUIPMENT_RATES.dehumidifier),
        is_equipment: true,
      })
    }
    if (jc.actual_air_mover_qty && jc.actual_air_mover_days) {
      const qty = jc.actual_air_mover_qty
      const days = jc.actual_air_mover_days
      lineItems.push({
        description: `Air mover (${qty} units × ${days} days)`,
        quantity: qty * days,
        unit_price: EQUIPMENT_RATES.airMover,
        total: round2(qty * days * EQUIPMENT_RATES.airMover),
        is_equipment: true,
      })
    }
    if (jc.actual_rcd_qty && jc.actual_rcd_days) {
      const qty = jc.actual_rcd_qty
      const days = jc.actual_rcd_days
      lineItems.push({
        description: `RCD safety box (${qty} units × ${days} days)`,
        quantity: qty * days,
        unit_price: EQUIPMENT_RATES.rcd,
        total: round2(qty * days * EQUIPMENT_RATES.rcd),
        is_equipment: true,
      })
    }
  } else if (inspection?.equipment_cost_ex_gst && Number(inspection.equipment_cost_ex_gst) > 0) {
    // Fallback: lump equipment line from inspection
    const equip = Number(inspection.equipment_cost_ex_gst)
    lineItems.push({
      description: 'Drying & remediation equipment hire',
      quantity: 1,
      unit_price: equip,
      total: equip,
      is_equipment: true,
    })
  }

  // inspections.labour_cost_ex_gst is ALREADY net of the volume discount
  // (inspection.discount_percent is baked-in metadata, not a re-applicable rate).
  // Re-applying it here would double-discount the labour line and breach the 13% cap.
  const discountPct = 0

  return {
    lead_id: leadId,
    job_completion_id: jc?.id ?? null,
    customer_name: lead.full_name,
    customer_email: lead.email,
    customer_phone: lead.phone,
    property_address: address,
    line_items: lineItems,
    discount_percentage: Math.min(MAX_DISCOUNT * 100, discountPct),
    due_date: defaultDueDate(14),
  }
}

// ============================================================
// HELPERS
// ============================================================

function defaultDueDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
