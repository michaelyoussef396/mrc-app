import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPaidInvoices, sumPaidRevenue } from '@/lib/api/invoices';
import { isConvertedStatus } from '@/lib/statusFlow';
import { toLocalDayKey } from '@/lib/dateUtils';

// ============================================================================
// TYPES
// ============================================================================

export type TimePeriod = 'today' | 'week' | 'month' | 'year';

export interface KPIData {
  totalLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  totalRevenue: number;
}

export interface StatusData {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface SourceData {
  source: string;
  label: string;
  count: number;
}

export interface TimelineData {
  date: string;
  label: string;
  leads: number;
}

export interface ReportsData {
  kpis: KPIData;
  statusBreakdown: StatusData[];
  sourceBreakdown: SourceData[];
  timeline: TimelineData[];
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// HELPERS
// ============================================================================

export function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  const melbourneNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
  const end = new Date(melbourneNow);
  end.setHours(23, 59, 59, 999);

  const start = new Date(melbourneNow);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      // Already set to today
      break;
    case 'week':
      // Go back 7 days
      start.setDate(start.getDate() - 6);
      break;
    case 'month':
      // Go back 30 days
      start.setDate(start.getDate() - 29);
      break;
    case 'year':
      // Go back 365 days
      start.setDate(start.getDate() - 364);
      break;
  }

  return { start, end };
}

// Status display configuration
const statusConfig: Record<string, { label: string; color: string }> = {
  new_lead: { label: 'New Lead', color: '#10B981' },
  hipages_lead: { label: 'HiPages Lead', color: '#06B6D4' },
  inspection_waiting: { label: 'Awaiting Inspection', color: '#F97316' },
  approve_inspection_report: { label: 'Approve Report', color: '#1E293B' },
  inspection_email_approval: { label: 'Email Approval', color: '#8B5CF6' },
  closed: { label: 'Closed', color: '#3B82F6' },
  not_landed: { label: 'Not Landed', color: '#EF4444' },
  job_completed: { label: 'Job Completed', color: '#22C55E' },
  paid: { label: 'Paid', color: '#14B8A6' },
  finished: { label: 'Finished', color: '#6366F1' },
  invoicing_sent: { label: 'Invoice Sent', color: '#EC4899' },
};

// Source display configuration — canonical 8 values (Phase 7 / BUG-011)
const sourceConfig: Record<string, string> = {
  website: 'Website',
  hipages: 'HiPages',
  google: 'Google',
  referral: 'Referral',
  repeat: 'Repeat Customer',
  facebook: 'Facebook',
  instagram: 'Instagram',
  other: 'Other',
};

// ============================================================================
// HOOK
// ============================================================================

export function useReportsData(period: TimePeriod = 'month'): ReportsData {
  const { start, end } = getDateRange(period);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // Fetch all leads in period
  const leadsQuery = useQuery({
    queryKey: ['reports', 'leads', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, status, lead_source, created_at, quoted_amount')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .is('archived_at', null);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Revenue is money received, so it comes from paid invoices — not from
  // inspections.total_inc_gst, which is only the quote.
  const revenueQuery = useQuery({
    queryKey: ['reports', 'paid-invoices', period],
    queryFn: () => getPaidInvoices(start, end),
    refetchInterval: 60000,
  });

  // Fetch calendar bookings for response time calculation
  const bookingsQuery = useQuery({
    queryKey: ['reports', 'bookings', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_bookings')
        .select('id, lead_id, created_at')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Process data
  const isLoading = leadsQuery.isLoading || revenueQuery.isLoading || bookingsQuery.isLoading;
  const error = leadsQuery.error || revenueQuery.error || bookingsQuery.error;
  const leads = leadsQuery.data || [];

  // Calculate KPIs
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => isConvertedStatus(l.status)).length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // Average response time: hours between lead creation and first booking creation
  const bookings = bookingsQuery.data || [];
  const earliestBookingByLead: Record<string, string> = {};
  bookings.forEach(b => {
    if (b.lead_id && (!earliestBookingByLead[b.lead_id] || b.created_at < earliestBookingByLead[b.lead_id])) {
      earliestBookingByLead[b.lead_id] = b.created_at;
    }
  });
  const responseTimes: number[] = [];
  leads.forEach(lead => {
    const bookingCreated = earliestBookingByLead[lead.id];
    if (bookingCreated) {
      const hours = (new Date(bookingCreated).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);
      if (hours >= 0) responseTimes.push(hours);
    }
  });
  // Kept fractional — rounding to whole hours here collapsed every sub-30-minute
  // response to 0 before the formatter could render it in minutes.
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, h) => sum + h, 0) / responseTimes.length
    : 0;

  // Money actually collected in the period, including invoices that trace to no
  // technician — the org total must not under-report what was banked.
  const totalRevenue = sumPaidRevenue(revenueQuery.data || []);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  leads.forEach(lead => {
    const status = lead.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const statusBreakdown: StatusData[] = Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      label: statusConfig[status]?.label || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      count,
      color: statusConfig[status]?.color || '#94A3B8',
    }))
    .sort((a, b) => b.count - a.count);

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  leads.forEach(lead => {
    const source = lead.lead_source || 'other';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const sourceBreakdown: SourceData[] = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      label: sourceConfig[source] || source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Timeline data
  const timeline = generateTimeline(leads, period, start, end);

  return {
    kpis: {
      totalLeads,
      conversionRate,
      avgResponseTime,
      totalRevenue,
    },
    statusBreakdown,
    sourceBreakdown,
    timeline,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Bucket key for a point in time, in LOCAL time.
 *
 * Data points and axis buckets MUST derive their key from this one function.
 * When the day branch used `toISOString()` the two sides disagreed by a day in
 * UTC+10: every point plotted one day late, and any lead created after 10:00
 * local fell past the last generated bucket and vanished from the chart while
 * still being counted by the Total Leads KPI.
 */
function bucketKey(date: Date, period: TimePeriod): string {
  const day = toLocalDayKey(date);
  if (period === 'year') return day.slice(0, 7);
  if (period === 'today') return `${day}T${String(date.getHours()).padStart(2, '0')}`;
  return day;
}

// Generate timeline data points. Exported for regression tests — the
// KPI-vs-chart agreement invariant lives here.
export function generateTimeline(
  leads: Array<{ created_at: string }>,
  period: TimePeriod,
  start: Date,
  end: Date
): TimelineData[] {
  const timeline: TimelineData[] = [];
  const leadsByDate: Record<string, number> = {};

  leads.forEach(lead => {
    const key = bucketKey(new Date(lead.created_at), period);
    leadsByDate[key] = (leadsByDate[key] || 0) + 1;
  });

  // Generate all date points
  const current = new Date(start);
  while (current <= end) {
    const key = bucketKey(current, period);
    let label: string;

    if (period === 'year') {
      label = current.toLocaleDateString('en-AU', { month: 'short' });
      current.setMonth(current.getMonth() + 1);
    } else if (period === 'today') {
      label = current.toLocaleTimeString('en-AU', { hour: 'numeric', hour12: true }).replace(/\b[ap]m\b/gi, (m) => m.toUpperCase());
      current.setHours(current.getHours() + 1);
    } else {
      label = current.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
      current.setDate(current.getDate() + 1);
    }

    // Avoid duplicates for year view
    if (!timeline.find(t => t.date === key)) {
      timeline.push({
        date: key,
        label,
        leads: leadsByDate[key] || 0,
      });
    }
  }

  return timeline;
}
