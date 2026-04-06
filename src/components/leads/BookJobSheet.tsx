import { useState, useEffect, useMemo, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, User, Loader2, AlertTriangle, FileText, Wrench, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { captureBusinessError } from '@/lib/sentry'
import { checkBookingConflict } from '@/lib/bookingService'
import { formatCurrency, EQUIPMENT_RATES } from '@/lib/calculations/pricing'
import { sendEmail, buildJobBookingConfirmationHtml } from '@/lib/api/notifications'

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_HOURS_PER_DAY = 8

// ============================================================================
// TYPES
// ============================================================================

interface BookJobSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadNumber: string
  customerName: string
  propertyAddress: string
  propertySuburb?: string
  onBooked?: () => void
}

interface TechnicianUser {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  is_active: boolean
}

interface InspectionSummary {
  nonDemoHours: number
  demolitionHours: number
  subfloorHours: number
  totalHours: number
  dehumidifierQty: number
  airMoverQty: number
  rcdQty: number
  optionSelected: number | null
  totalIncGst: number | null
  treatmentMethods: string[]
}

interface ScheduledDay {
  dayNumber: number
  dateStr: string         // YYYY-MM-DD
  hours: number
  start: Date
  end: Date
  hasConflict: boolean
  conflictDetails?: string
}

// ============================================================================
// HELPERS
// ============================================================================

/** YYYY-MM-DD in Melbourne timezone (matches inspection form pattern) */
function toDateInputValue(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(date)
}

/** Tomorrow as YYYY-MM-DD (default start date per confirmed spec) */
function getTomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toDateInputValue(d)
}

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/** Format YYYY-MM-DD as "Mon 13 Apr" for display */
function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}

/** Format HH:MM time string to "8:00 AM" */
function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** Build a local Date from YYYY-MM-DD + HH:MM */
function buildLocalDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`)
}

/** Compute the day schedule using pricing.ts day-block logic */
function computeDaySchedule(
  totalHours: number,
  startDate: string,
  startTime: string
): Omit<ScheduledDay, 'hasConflict' | 'conflictDetails'>[] {
  if (totalHours <= 0) return []

  const days: Omit<ScheduledDay, 'hasConflict' | 'conflictDetails'>[] = []
  const fullDays = Math.floor(totalHours / MAX_HOURS_PER_DAY)
  const remainder = totalHours - fullDays * MAX_HOURS_PER_DAY

  let dayNumber = 1
  for (let i = 0; i < fullDays; i++) {
    const dateStr = addDays(startDate, i)
    const start = buildLocalDateTime(dateStr, startTime)
    const end = new Date(start.getTime() + MAX_HOURS_PER_DAY * 60 * 60 * 1000)
    days.push({ dayNumber: dayNumber++, dateStr, hours: MAX_HOURS_PER_DAY, start, end })
  }

  if (remainder > 0) {
    const dateStr = addDays(startDate, fullDays)
    const start = buildLocalDateTime(dateStr, startTime)
    const end = new Date(start.getTime() + remainder * 60 * 60 * 1000)
    days.push({ dayNumber: dayNumber++, dateStr, hours: remainder, start, end })
  }

  return days
}

async function fetchTechnicians(): Promise<TechnicianUser[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    }
  )

  const result = await response.json()
  if (!result.success) throw new Error(result.error || 'Failed to fetch users')
  return (result.users as TechnicianUser[]).filter((u) => u.is_active)
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BookJobSheet({
  open,
  onOpenChange,
  leadId,
  leadNumber,
  customerName,
  propertyAddress,
  propertySuburb: _propertySuburb,
  onBooked,
}: BookJobSheetProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Form state (editable)
  const [technicians, setTechnicians] = useState<TechnicianUser[]>([])
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(getTomorrowStr())
  const [startTime, setStartTime] = useState<string>('08:00')
  const [totalHours, setTotalHours] = useState<number>(8)
  const [notes, setNotes] = useState<string>('')

  // Loading / data state
  const [loading, setLoading] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(true)
  const [inspection, setInspection] = useState<InspectionSummary | null>(null)
  const [conflictMap, setConflictMap] = useState<Record<string, string>>({})
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)
  const [isReschedule, setIsReschedule] = useState(false)

  // ---------- Prefill from inspection + lead on open ----------
  useEffect(() => {
    if (!open) return
    let cancelled = false

    const prefill = async () => {
      setIsPrefilling(true)
      try {
        const [techList, leadResult, inspectionResult, existingJobsResult] = await Promise.all([
          fetchTechnicians(),
          supabase
            .from('leads')
            .select('assigned_to, job_scheduled_date')
            .eq('id', leadId)
            .single(),
          supabase
            .from('inspections')
            .select(
              'no_demolition_hours, demolition_hours, subfloor_hours, commercial_dehumidifier_qty, air_movers_qty, rcd_box_qty, option_selected, total_inc_gst, treatment_methods'
            )
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('calendar_bookings')
            .select('id')
            .eq('lead_id', leadId)
            .eq('event_type', 'job')
            .neq('status', 'cancelled'),
        ])

        if (cancelled) return

        setTechnicians(techList)

        // Pre-select technician from lead.assigned_to
        if (leadResult.data?.assigned_to) {
          setAssignedTo(leadResult.data.assigned_to)
        }

        // Detect reschedule (existing job bookings)
        setIsReschedule((existingJobsResult.data?.length ?? 0) > 0)

        // If there's already a scheduled job date, pre-fill it (reschedule)
        if (leadResult.data?.job_scheduled_date) {
          setStartDate(leadResult.data.job_scheduled_date)
        }

        // Build inspection summary + compute total hours
        if (inspectionResult.data) {
          const nd = Number(inspectionResult.data.no_demolition_hours ?? 0)
          const dm = Number(inspectionResult.data.demolition_hours ?? 0)
          const sf = Number(inspectionResult.data.subfloor_hours ?? 0)
          const total = nd + dm + sf

          const summary: InspectionSummary = {
            nonDemoHours: nd,
            demolitionHours: dm,
            subfloorHours: sf,
            totalHours: total,
            dehumidifierQty: inspectionResult.data.commercial_dehumidifier_qty ?? 0,
            airMoverQty: inspectionResult.data.air_movers_qty ?? 0,
            rcdQty: inspectionResult.data.rcd_box_qty ?? 0,
            optionSelected: inspectionResult.data.option_selected ?? null,
            totalIncGst: inspectionResult.data.total_inc_gst
              ? Number(inspectionResult.data.total_inc_gst)
              : null,
            treatmentMethods: (inspectionResult.data.treatment_methods as string[] | null) ?? [],
          }
          setInspection(summary)
          setTotalHours(total > 0 ? total : 8)
        }
      } catch (err) {
        console.error('[BookJobSheet] Prefill error:', err)
        toast.error('Failed to load job details', {
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    }

    prefill()
    return () => {
      cancelled = true
    }
  }, [open, leadId])

  // ---------- Compute day schedule ----------
  const baseSchedule = useMemo(
    () => computeDaySchedule(totalHours, startDate, startTime),
    [totalHours, startDate, startTime]
  )

  // Merge conflict info into the schedule
  const schedule: ScheduledDay[] = useMemo(
    () =>
      baseSchedule.map((d) => ({
        ...d,
        hasConflict: !!conflictMap[d.dateStr],
        conflictDetails: conflictMap[d.dateStr],
      })),
    [baseSchedule, conflictMap]
  )

  const daysNeeded = schedule.length
  const equipmentDays = Math.max(1, daysNeeded)
  const hasAnyConflict = schedule.some((d) => d.hasConflict)

  // ---------- Check conflicts when schedule or technician changes ----------
  useEffect(() => {
    if (!assignedTo || baseSchedule.length === 0) {
      setConflictMap({})
      return
    }

    let cancelled = false
    setIsCheckingConflicts(true)

    const run = async () => {
      const newMap: Record<string, string> = {}
      for (const day of baseSchedule) {
        const { hasConflict, conflictDetails } = await checkBookingConflict(
          assignedTo,
          day.start,
          day.end
        )
        if (cancelled) return
        if (hasConflict) {
          newMap[day.dateStr] = conflictDetails ?? 'Conflict with existing booking'
        }
      }
      if (!cancelled) {
        setConflictMap(newMap)
        setIsCheckingConflicts(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [assignedTo, baseSchedule])

  // ---------- Derived display values ----------
  const selectedTechName = useMemo(() => {
    const t = technicians.find((u) => u.id === assignedTo)
    return t?.full_name || `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim() || t?.email || ''
  }, [technicians, assignedTo])

  const canSubmit =
    !loading &&
    !isPrefilling &&
    !isCheckingConflicts &&
    !!assignedTo &&
    !!startDate &&
    !!startTime &&
    totalHours > 0 &&
    !hasAnyConflict

  // ---------- Hour stepper ----------
  const adjustHours = useCallback((delta: number) => {
    setTotalHours((h) => Math.max(0.5, Math.round((h + delta) * 2) / 2))
  }, [])

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      // 1. Delete any existing job bookings for this lead (reschedule flow)
      const { error: deleteError } = await supabase
        .from('calendar_bookings')
        .delete()
        .eq('lead_id', leadId)
        .eq('event_type', 'job')
      if (deleteError) throw deleteError

      // 2. Insert one row per day
      const insertRows = schedule.map((day) => ({
        lead_id: leadId,
        event_type: 'job',
        title:
          schedule.length > 1
            ? `Job (Day ${day.dayNumber}/${schedule.length}) - ${customerName}`
            : `Job - ${customerName}`,
        start_datetime: day.start.toISOString(),
        end_datetime: day.end.toISOString(),
        location_address: propertyAddress,
        assigned_to: assignedTo,
        status: 'scheduled',
        description: notes || null,
      }))

      const { error: insertError } = await supabase.from('calendar_bookings').insert(insertRows)
      if (insertError) throw insertError

      // 3. Update lead
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'job_scheduled',
          job_scheduled_date: schedule[0].dateStr,
          scheduled_time: startTime,
          assigned_to: assignedTo,
        })
        .eq('id', leadId)
      if (leadError) throw leadError

      // 4. Activity log
      const firstLabel = formatDayLabel(schedule[0].dateStr)
      const lastLabel = formatDayLabel(schedule[schedule.length - 1].dateStr)
      const dateRange =
        schedule.length > 1 ? `${firstLabel} – ${lastLabel}` : firstLabel

      await supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: isReschedule ? 'job_rescheduled' : 'job_booked',
        title: isReschedule
          ? `Job Rescheduled (${schedule.length} day${schedule.length > 1 ? 's' : ''})`
          : `Job Booked (${schedule.length} day${schedule.length > 1 ? 's' : ''})`,
        description: `${dateRange} at ${formatTimeLabel(startTime)} with ${selectedTechName}. ${totalHours} hours total.`,
        user_id: user?.id,
      })

      // 4.5 Send confirmation email to the customer (fire-and-forget — don't block UI)
      // Fetch email + lead_number from leads, then send via send-email Edge Function
      supabase
        .from('leads')
        .select('email, lead_number')
        .eq('id', leadId)
        .single()
        .then(({ data: leadData }) => {
          if (!leadData?.email) return
          const subject = `Job Booking Confirmed — ${dateRange} | ${leadData.lead_number ?? ''}`.trim()
          const html = buildJobBookingConfirmationHtml({
            customerName,
            leadNumber: leadData.lead_number ?? leadId.slice(0, 8),
            address: propertyAddress,
            firstDate: firstLabel,
            lastDate: formatDayLabel(schedule[schedule.length - 1].dateStr) + ' ' + new Date(schedule[schedule.length - 1].dateStr).getFullYear(),
            startTime: formatTimeLabel(startTime),
            durationDays: schedule.length,
            totalHours,
            technicianName: selectedTechName,
            isSingleDay: schedule.length === 1,
          })
          return sendEmail({
            to: leadData.email,
            subject,
            html,
            leadId,
            templateName: 'job-booking-confirmation',
          }).then(() => {
            // Log the email send as a separate activity
            return supabase.from('activities').insert({
              lead_id: leadId,
              activity_type: 'email_sent',
              title: 'Job Booking Confirmation sent',
              description: `Sent to ${leadData.email} — "${subject}"`,
              user_id: user?.id,
            })
          }).catch((err) => {
            console.error('[BookJobSheet] Failed to send confirmation email:', err)
          })
        })

      // 5. Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads-to-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-calendar'] })
      queryClient.invalidateQueries({ queryKey: ['job-bookings', leadId] })

      toast.success(
        isReschedule
          ? `Job rescheduled across ${schedule.length} day${schedule.length > 1 ? 's' : ''}`
          : `Job booked across ${schedule.length} day${schedule.length > 1 ? 's' : ''}`
      )

      onBooked?.()
      onOpenChange(false)
    } catch (error) {
      captureBusinessError('Book job sheet failed', {
        leadId,
        error: error instanceof Error ? error.message : String(error),
      })
      toast.error('Failed to book job', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  // ---------- Render ----------
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isReschedule ? 'Reschedule Job' : 'Book Job'}
            {leadNumber && <span className="text-sm text-[#86868b] font-normal">#{leadNumber}</span>}
          </SheetTitle>
          <SheetDescription>
            {customerName} · {propertyAddress}
          </SheetDescription>
        </SheetHeader>

        {isPrefilling ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
            <p className="text-sm text-[#86868b]">Loading inspection data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-5">
            {/* ============================================================ */}
            {/* SECTION 1: Job Summary (read-only)                            */}
            {/* ============================================================ */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f]">
                <FileText className="h-4 w-4" />
                Job Summary
              </div>

              {inspection ? (
                <>
                  {inspection.optionSelected && (
                    <div className="text-xs text-[#86868b]">
                      Option {inspection.optionSelected}
                      {inspection.optionSelected === 1 && ' (Surface Treatment)'}
                      {inspection.optionSelected === 2 && ' (Comprehensive)'}
                      {inspection.optionSelected === 3 && ' (Both)'}
                    </div>
                  )}

                  {inspection.treatmentMethods.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-[#86868b] font-medium">Treatment Methods</div>
                      <ul className="text-xs text-[#1d1d1f] space-y-0.5">
                        {inspection.treatmentMethods.map((m) => (
                          <li key={m}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    <div className="text-xs text-[#86868b] font-medium">Labour Hours</div>
                    <div className="text-xs text-[#1d1d1f] space-y-0.5">
                      <div className="flex justify-between">
                        <span>Non-demolition</span>
                        <span className="font-medium">{inspection.nonDemoHours} hrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Demolition</span>
                        <span className="font-medium">{inspection.demolitionHours} hrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subfloor</span>
                        <span className="font-medium">{inspection.subfloorHours} hrs</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-300 font-semibold">
                        <span>TOTAL</span>
                        <span>
                          {inspection.totalHours} hrs ({Math.max(1, Math.ceil(inspection.totalHours / MAX_HOURS_PER_DAY))} days)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    <div className="text-xs text-[#86868b] font-medium">
                      Equipment (× {equipmentDays} {equipmentDays === 1 ? 'day' : 'days'})
                    </div>
                    <div className="text-xs text-[#1d1d1f] space-y-0.5">
                      <div className="flex justify-between">
                        <span>
                          <Wrench className="h-3 w-3 inline mr-1" />
                          Dehumidifier
                        </span>
                        <span className="font-medium">
                          {inspection.dehumidifierQty} × ${EQUIPMENT_RATES.dehumidifier}/day
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          <Wrench className="h-3 w-3 inline mr-1" />
                          Air Movers
                        </span>
                        <span className="font-medium">
                          {inspection.airMoverQty} × ${EQUIPMENT_RATES.airMover}/day
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          <Wrench className="h-3 w-3 inline mr-1" />
                          RCD Boxes
                        </span>
                        <span className="font-medium">
                          {inspection.rcdQty} × ${EQUIPMENT_RATES.rcd}/day
                        </span>
                      </div>
                    </div>
                  </div>

                  {inspection.totalIncGst !== null && (
                    <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-semibold">
                      <span>Quoted Total</span>
                      <span className="text-emerald-700">
                        {formatCurrency(inspection.totalIncGst)} inc GST
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#86868b]">No inspection data found for this lead.</p>
              )}
            </section>

            {/* ============================================================ */}
            {/* SECTION 2: Booking Details (editable)                        */}
            {/* ============================================================ */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f]">
                <Calendar className="h-4 w-4" />
                Booking Details
              </div>

              {/* Technician */}
              <div className="space-y-1.5">
                <Label htmlFor="technician" className="flex items-center gap-1.5 text-sm">
                  <User className="h-4 w-4" />
                  Technician <span className="text-destructive">*</span>
                </Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger id="technician" className="h-12">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name ||
                          `${tech.first_name} ${tech.last_name}`.trim() ||
                          tech.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#86868b]">Assigned during inspection</p>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-4 w-4" />
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  min={toDateInputValue(new Date())}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-4 w-4" />
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  min="07:00"
                  max="19:00"
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-12"
                  required
                />
                <p className="text-xs text-[#86868b]">Operating hours: 7:00 AM – 7:00 PM</p>
              </div>

              {/* Total Hours with stepper */}
              <div className="space-y-1.5">
                <Label htmlFor="totalHours" className="text-sm">
                  Total Hours (from inspection)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 text-lg font-bold"
                    onClick={() => adjustHours(-1)}
                    aria-label="Decrease hours"
                  >
                    −
                  </Button>
                  <Input
                    id="totalHours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={totalHours}
                    onChange={(e) => setTotalHours(parseFloat(e.target.value) || 0)}
                    className="h-12 text-center flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 text-lg font-bold"
                    onClick={() => adjustHours(1)}
                    aria-label="Increase hours"
                  >
                    +
                  </Button>
                  <span className="text-sm text-[#86868b] whitespace-nowrap pl-2">
                    = {daysNeeded} {daysNeeded === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="text-xs text-[#86868b]">
                  Editing hours only changes the schedule, not the invoice.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">
                  Notes from Call
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Access instructions, special requirements..."
                  className="resize-none"
                />
              </div>
            </section>

            {/* ============================================================ */}
            {/* SECTION 3: Day Schedule (auto-generated)                      */}
            {/* ============================================================ */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f]">
                  <CalendarDays className="h-4 w-4" />
                  Day Schedule
                </div>
                {isCheckingConflicts && (
                  <span className="flex items-center gap-1 text-xs text-[#86868b]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {schedule.length === 0 ? (
                  <div className="p-4 text-xs text-[#86868b] text-center">
                    Enter hours to see the schedule
                  </div>
                ) : (
                  schedule.map((day, idx) => {
                    const endTimeLabel = day.end.toLocaleTimeString('en-AU', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                    return (
                      <div
                        key={day.dateStr}
                        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${
                          idx > 0 ? 'border-t border-gray-100' : ''
                        } ${day.hasConflict ? 'bg-red-50' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-semibold text-[#86868b] w-10">
                            Day {day.dayNumber}
                          </span>
                          <span className="font-medium text-[#1d1d1f]">
                            {formatDayLabel(day.dateStr)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#86868b] whitespace-nowrap">
                          <span>
                            {formatTimeLabel(startTime)} – {endTimeLabel}
                          </span>
                          <span className="font-semibold text-[#1d1d1f]">({day.hours}h)</span>
                          {day.hasConflict && (
                            <AlertTriangle className="h-4 w-4 text-red-600" aria-label={day.conflictDetails} />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {schedule.length > 0 && (
                <p className="text-xs text-[#86868b] text-center">
                  {schedule.length} consecutive {schedule.length === 1 ? 'day' : 'days'} · {totalHours} hours total
                </p>
              )}

              {hasAnyConflict && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-900">
                    <p className="font-semibold">Booking conflict detected</p>
                    <p className="mt-1">
                      The selected technician has existing bookings on one or more of these days. Pick a
                      different start date or technician.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* ============================================================ */}
            {/* SECTION 4: Submit                                             */}
            {/* ============================================================ */}
            <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 bg-amber-600 hover:bg-amber-700"
                disabled={!canSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    {isReschedule ? 'Reschedule' : 'Confirm Booking'} — {daysNeeded}{' '}
                    {daysNeeded === 1 ? 'day' : 'days'}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
