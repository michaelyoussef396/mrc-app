import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

function getDateRange(period: TimePeriod): { start: Date; end: Date } {
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

// Source display configuration
const sourceConfig: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  google: 'Google',
  hipages: 'HiPages',
  facebook: 'Facebook',
  phone: 'Phone',
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
        .lte('created_at', endISO);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch inspections for revenue
  const inspectionsQuery = useQuery({
    queryKey: ['reports', 'inspections', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select('id, total_inc_gst, created_at')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (error) throw error;
      return data || [];
    },
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
  const isLoading = leadsQuery.isLoading || inspectionsQuery.isLoading || bookingsQuery.isLoading;
  const error = leadsQuery.error || inspectionsQuery.error || bookingsQuery.error;
  const leads = leadsQuery.data || [];
  const inspections = inspectionsQuery.data || [];

  // Calculate KPIs
  const totalLeads = leads.length;
  const closedLeads = leads.filter(l =>
    ['closed', 'job_completed', 'paid', 'finished'].includes(l.status)
  ).length;
  const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

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
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, h) => sum + h, 0) / responseTimes.length)
    : 0;

  // Total revenue from inspections
  const totalRevenue = inspections.reduce((sum, ins) => {
    return sum + (typeof ins.total_inc_gst === 'number' ? ins.total_inc_gst : 0);
  }, 0);

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

// Generate timeline data points
function generateTimeline(
  leads: Array<{ created_at: string }>,
  period: TimePeriod,
  start: Date,
  end: Date
): TimelineData[] {
  const timeline: TimelineData[] = [];
  const leadsByDate: Record<string, number> = {};

  // Count leads by date
  leads.forEach(lead => {
    const date = new Date(lead.created_at);
    let key: string;

    if (period === 'year') {
      // Group by month for year view
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (period === 'today') {
      // Group by hour for today view
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
    } else {
      // Group by day for other views
      key = date.toISOString().split('T')[0];
    }

    leadsByDate[key] = (leadsByDate[key] || 0) + 1;
  });

  // Generate all date points
  const current = new Date(start);
  while (current <= end) {
    let key: string;
    let label: string;

    if (period === 'year') {
      key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      label = current.toLocaleDateString('en-AU', { month: 'short' });

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    } else if (period === 'today') {
      // For today, bucket by hour
      key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}T${String(current.getHours()).padStart(2, '0')}`;
      label = current.toLocaleTimeString('en-AU', { hour: 'numeric', hour12: true });
      current.setHours(current.getHours() + 1);
    } else {
      key = current.toISOString().split('T')[0];
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
