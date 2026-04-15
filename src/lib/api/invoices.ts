import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError, addBusinessBreadcrumb } from '@/lib/sentry'
import { GST_RATE, MAX_DISCOUNT, EQUIPMENT_RATES } from '@/lib/calculations/pricing'
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
): Promise<void> {
  const now = new Date()
  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      payment_reference: paymentReference ?? null,
      payment_date: now.toISOString().split('T')[0],
      paid_at: now.toISOString(),
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
  const { data: inspection } = await supabase
    .from('inspections')
    .select('total_inc_gst, subtotal_ex_gst, labor_cost_ex_gst, equipment_cost_ex_gst, discount_percent')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lineItems: InvoiceLineItem[] = []

  // Labour line
  if (inspection?.labor_cost_ex_gst && Number(inspection.labor_cost_ex_gst) > 0) {
    const labour = Number(inspection.labor_cost_ex_gst)
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

  const discountPct = Number(inspection?.discount_percent ?? 0)

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
