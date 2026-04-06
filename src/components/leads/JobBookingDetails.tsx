import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Calendar, CheckCircle2, Clock, Hammer, Loader2, RefreshCw, User, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface JobBookingDetailsProps {
  leadId: string
  onReschedule: () => void
}

interface JobBookingRow {
  id: string
  title: string | null
  start_datetime: string
  end_datetime: string
  assigned_to: string | null
  status: string | null
  description: string | null
}

interface TechnicianUser {
  id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
}

async function fetchJobBookings(leadId: string): Promise<JobBookingRow[]> {
  const { data, error } = await supabase
    .from('calendar_bookings')
    .select('id, title, start_datetime, end_datetime, assigned_to, status, description')
    .eq('lead_id', leadId)
    .eq('event_type', 'job')
    .order('start_datetime', { ascending: true })

  if (error) throw error
  return (data ?? []) as JobBookingRow[]
}

async function fetchTechnicianName(userId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 'Unknown'

  try {
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
    if (!result.success) return 'Unknown'

    const user = (result.users as TechnicianUser[]).find((u) => u.id === userId)
    if (!user) return 'Unknown'
    return user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email
  } catch {
    return 'Unknown'
  }
}

function formatDay(isoDate: string): string {
  const d = new Date(isoDate)
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Melbourne',
  }).format(d)
}

function formatTime(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Australia/Melbourne',
  })
}

function hoursBetween(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completed" />
  if (status === 'cancelled') return <XCircle className="h-4 w-4 text-red-500" aria-label="Cancelled" />
  return <Clock className="h-4 w-4 text-blue-500" aria-label="Scheduled" />
}

export function JobBookingDetails({ leadId, onReschedule }: JobBookingDetailsProps) {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['job-bookings', leadId],
    queryFn: () => fetchJobBookings(leadId),
    staleTime: 30_000,
  })

  const technicianId = bookings[0]?.assigned_to ?? null

  const { data: technicianName = 'Loading...' } = useQuery({
    queryKey: ['technician-name', technicianId],
    queryFn: () => (technicianId ? fetchTechnicianName(technicianId) : Promise.resolve('—')),
    enabled: !!technicianId,
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-2 text-sm text-[#86868b]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading job schedule...
      </div>
    )
  }

  if (bookings.length === 0) {
    return null
  }

  const totalHours = bookings.reduce(
    (sum, b) => sum + hoursBetween(b.start_datetime, b.end_datetime),
    0
  )
  const firstNotes = bookings.find((b) => b.description)?.description

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Hammer className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-[#1d1d1f]">Job Schedule</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm pb-3 border-b border-gray-100">
        <div>
          <div className="text-xs text-[#86868b]">Technician</div>
          <div className="flex items-center gap-1.5 font-medium text-[#1d1d1f]">
            <User className="h-3.5 w-3.5" />
            {technicianName}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#86868b]">Total</div>
          <div className="font-medium text-[#1d1d1f]">
            {totalHours} hrs across {bookings.length} {bookings.length === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {bookings.map((b, idx) => {
          const dayHours = hoursBetween(b.start_datetime, b.end_datetime)
          return (
            <div
              key={b.id}
              className={`flex items-center justify-between gap-3 text-sm py-2 ${
                idx > 0 ? 'border-t border-gray-50' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <StatusIcon status={b.status} />
                <span className="text-xs font-semibold text-[#86868b] w-11">
                  Day {idx + 1}
                </span>
                <span className="font-medium text-[#1d1d1f]">
                  {formatDay(b.start_datetime)}
                </span>
              </div>
              <div className="text-xs text-[#86868b] whitespace-nowrap">
                {formatTime(b.start_datetime)} – {formatTime(b.end_datetime)}{' '}
                <span className="font-semibold text-[#1d1d1f]">({dayHours}h)</span>
              </div>
            </div>
          )
        })}
      </div>

      {firstNotes && (
        <div className="pt-3 border-t border-gray-100">
          <div className="text-xs text-[#86868b] mb-1">Notes</div>
          <p className="text-sm text-[#1d1d1f] whitespace-pre-wrap">{firstNotes}</p>
        </div>
      )}

      <Button variant="outline" className="w-full h-11" onClick={onReschedule}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Reschedule Job
      </Button>
    </div>
  )
}
