import { useState, useEffect, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, User, Loader2, AlertTriangle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { captureBusinessError } from '@/lib/sentry'
import { checkBookingConflict } from '@/lib/bookingService'

// Max hours a technician can work per day (no overtime)
const MAX_HOURS_PER_DAY = 8
const MAX_MINUTES_PER_DAY = MAX_HOURS_PER_DAY * 60

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

/**
 * Fetch users via manage-users edge function (same pattern as BookInspectionModal).
 */
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

/**
 * Format a Date as YYYY-MM-DD (Melbourne timezone).
 */
function toDateInputValue(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(date)
}

/**
 * Add N days to a YYYY-MM-DD string and return the new YYYY-MM-DD.
 */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/**
 * Build a Date from date string + time string (Melbourne local time).
 * Returns a Date whose ISO representation matches the Melbourne instant.
 */
function buildDateTime(dateStr: string, timeStr: string): Date {
  // Parse in local browser time — acceptable for AU-only product
  return new Date(`${dateStr}T${timeStr}:00`)
}

/**
 * Format DD/MM/YYYY for display (Australian locale).
 */
function formatDateAU(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Australia/Melbourne',
    }).format(date)
  } catch {
    return dateStr
  }
}

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

  // Form state
  const [technicians, setTechnicians] = useState<TechnicianUser[]>([])
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(toDateInputValue(new Date()))
  const [startTime, setStartTime] = useState<string>('08:00')
  const [totalMinutes, setTotalMinutes] = useState<number>(MAX_MINUTES_PER_DAY)
  const [notes, setNotes] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(true)

  // Pre-fill form from inspection data when opened
  useEffect(() => {
    if (!open) return

    let cancelled = false

    const prefill = async () => {
      setIsPrefilling(true)
      try {
        // Load technicians list in parallel with inspection data
        const [techList, leadResult, inspectionResult] = await Promise.all([
          fetchTechnicians(),
          supabase.from('leads').select('assigned_to, job_scheduled_date').eq('id', leadId).single(),
          supabase
            .from('inspections')
            .select('no_demolition_hours, demolition_hours, subfloor_hours')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        if (cancelled) return

        setTechnicians(techList)

        // Pre-select technician from lead.assigned_to
        if (leadResult.data?.assigned_to) {
          setAssignedTo(leadResult.data.assigned_to)
        }

        // If there's already a scheduled job date, pre-fill it (for rescheduling)
        if (leadResult.data?.job_scheduled_date) {
          setStartDate(leadResult.data.job_scheduled_date)
        }

        // Calculate duration from inspection hours (if available)
        if (inspectionResult.data) {
          const hours =
            (inspectionResult.data.no_demolition_hours ?? 0) +
            (inspectionResult.data.demolition_hours ?? 0) +
            (inspectionResult.data.subfloor_hours ?? 0)

          if (hours > 0) {
            setTotalMinutes(Math.round(hours * 60))
          }
        }
      } catch (err) {
        console.error('[BookJobSheet] Prefill error:', err)
        toast.error('Failed to load job details')
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    }

    prefill()
    return () => {
      cancelled = true
    }
  }, [open, leadId])

  // Calculated values
  const daysNeeded = useMemo(() => Math.max(1, Math.ceil(totalMinutes / MAX_MINUTES_PER_DAY)), [totalMinutes])
  const hoursPerDay = useMemo(() => {
    if (daysNeeded === 1) return totalMinutes / 60
    // Distribute evenly across days, capped at 8 per day
    return Math.min(MAX_HOURS_PER_DAY, totalMinutes / 60 / daysNeeded)
  }, [totalMinutes, daysNeeded])

  // Preview the booked dates
  const bookedDates = useMemo(() => {
    return Array.from({ length: daysNeeded }, (_, i) => addDays(startDate, i))
  }, [startDate, daysNeeded])

  const selectedTechnicianName = useMemo(() => {
    const t = technicians.find((u) => u.id === assignedTo)
    return t?.full_name || t?.first_name || ''
  }, [technicians, assignedTo])

  const canSubmit = !loading && !isPrefilling && assignedTo && startDate && startTime && totalMinutes > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)

    try {
      // Build bookings: one per day, each capped at 8 hours
      // For single-day: use exact totalMinutes (might be < 480)
      // For multi-day: 480 min per full day, remainder goes into the last day
      const bookings: Array<{
        start: Date
        end: Date
        dateStr: string
      }> = []

      let remainingMinutes = totalMinutes
      for (let i = 0; i < daysNeeded; i++) {
        const dayDateStr = bookedDates[i]
        const dayMinutes = Math.min(MAX_MINUTES_PER_DAY, remainingMinutes)
        const start = buildDateTime(dayDateStr, startTime)
        const end = new Date(start.getTime() + dayMinutes * 60 * 1000)
        bookings.push({ start, end, dateStr: dayDateStr })
        remainingMinutes -= dayMinutes
      }

      // Check for conflicts on any of the booking days
      for (const b of bookings) {
        const { hasConflict, conflictDetails } = await checkBookingConflict(
          assignedTo,
          b.start,
          b.end
        )
        if (hasConflict) {
          const dateLabel = formatDateAU(b.dateStr)
          toast.error(`Conflict on ${dateLabel}: ${conflictDetails}`)
          setLoading(false)
          return
        }
      }

      // Insert all calendar bookings
      const insertRows = bookings.map((b, i) => ({
        lead_id: leadId,
        event_type: 'job',
        title: daysNeeded > 1
          ? `Job (Day ${i + 1}/${daysNeeded}) - ${customerName}`
          : `Job - ${customerName}`,
        start_datetime: b.start.toISOString(),
        end_datetime: b.end.toISOString(),
        location_address: propertyAddress,
        assigned_to: assignedTo,
        status: 'scheduled',
        description: notes || null,
      }))

      const { error: calendarError } = await supabase
        .from('calendar_bookings')
        .insert(insertRows)

      if (calendarError) throw calendarError

      // Update lead — status + scheduled date + technician
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'job_scheduled',
          job_scheduled_date: startDate,
          scheduled_time: startTime,
          assigned_to: assignedTo,
        })
        .eq('id', leadId)

      if (leadError) throw leadError

      // Log activity
      const dateRange =
        daysNeeded > 1
          ? `${formatDateAU(bookedDates[0])} – ${formatDateAU(bookedDates[daysNeeded - 1])} (${daysNeeded} days)`
          : formatDateAU(startDate)

      await supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'job_booked',
        title: 'Job Booked',
        description: `Job booked for ${dateRange} at ${startTime} with ${selectedTechnicianName || 'technician'}`,
      })

      toast.success(
        daysNeeded > 1
          ? `Job booked across ${daysNeeded} days`
          : 'Job booked successfully'
      )

      // Invalidate queries so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads-to-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-calendar'] })

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Job {leadNumber && `- ${leadNumber}`}
          </SheetTitle>
          <SheetDescription>{customerName} · {propertyAddress}</SheetDescription>
        </SheetHeader>

        {isPrefilling ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
            <p className="text-sm text-[#86868b]">Loading job details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-5">
            {/* Technician */}
            <div className="space-y-2">
              <Label htmlFor="technician" className="flex items-center gap-1.5 text-sm font-medium">
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
                      {tech.full_name || `${tech.first_name} ${tech.last_name}`.trim() || tech.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-1.5 text-sm font-medium">
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
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-1.5 text-sm font-medium">
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
              <p className="text-xs text-[#86868b]">MRC operating hours: 7:00 AM – 7:00 PM</p>
            </div>

            {/* Duration (from inspection) */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">
                Total Duration (hours)
              </Label>
              <Input
                id="duration"
                type="number"
                step="0.5"
                min="0.5"
                value={totalMinutes / 60}
                onChange={(e) => {
                  const hours = parseFloat(e.target.value) || 0
                  setTotalMinutes(Math.round(hours * 60))
                }}
                className="h-12"
              />
              <p className="text-xs text-[#86868b]">Pre-filled from inspection. Edit if needed.</p>
            </div>

            {/* Multi-day summary */}
            {daysNeeded > 1 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                      Multi-day booking: {daysNeeded} consecutive days
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      Max 8 hours/day. {(totalMinutes / 60).toFixed(1)}h total split across {daysNeeded} days (~{hoursPerDay.toFixed(1)}h/day).
                    </p>
                  </div>
                </div>
                <div className="pl-6 space-y-0.5">
                  {bookedDates.map((d, i) => (
                    <p key={d} className="text-xs text-amber-900">
                      Day {i + 1}: {formatDateAU(d)} at {startTime}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Single-day booking: {(totalMinutes / 60).toFixed(1)} hours
                    </p>
                    <p className="text-xs text-blue-800 mt-0.5">
                      {formatDateAU(startDate)} from {startTime}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Access instructions, special requirements..."
                className="resize-none"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3 pt-4 border-t">
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
                    Book Job
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
