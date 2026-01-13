import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface DashboardStats {
  totalLeadsThisMonth: {
    count: number;
    previousMonth: number;
    percentageChange: number;
    trend: 'up' | 'down' | 'neutral';
  };
  activeJobs: {
    count: number;
    previousWeek: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  completedToday: {
    count: number;
    yesterday: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  monthlyRevenue: {
    amount: number;
    previousMonth: number;
    percentageChange: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

export interface RecentLead {
  id: string;
  lead_number: string;
  status: string;
  lead_source: string;
  full_name: string | null;
  suburb: string;
  created_at: string;
  display_name: string;
}

// Helper to determine trend
function getTrend(change: number): 'up' | 'down' | 'neutral' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}

// Hook: Fetch Total Leads This Month
export function useTotalLeadsThisMonth() {
  return useQuery({
    queryKey: ['dashboard', 'total-leads-this-month'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const startOfPreviousMonth = new Date(startOfMonth);
      startOfPreviousMonth.setMonth(startOfPreviousMonth.getMonth() - 1);

      // Current month count
      const { count: currentMonth, error: currentError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      if (currentError) throw currentError;

      // Previous month count
      const { count: previousMonth, error: previousError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfPreviousMonth.toISOString())
        .lt('created_at', startOfMonth.toISOString());

      if (previousError) throw previousError;

      const currentCount = currentMonth || 0;
      const previousCount = previousMonth || 0;

      const percentageChange = previousCount === 0
        ? 0
        : ((currentCount - previousCount) / previousCount) * 100;

      return {
        count: currentCount,
        previousMonth: previousCount,
        percentageChange: Math.round(percentageChange * 10) / 10,
        trend: getTrend(currentCount - previousCount),
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook: Fetch Active Jobs (Stage 1: leads being worked on)
export function useActiveJobs() {
  return useQuery({
    queryKey: ['dashboard', 'active-jobs'],
    queryFn: async () => {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfPreviousWeek = new Date(startOfWeek);
      startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);

      // Stage 1 active statuses: inspection_waiting, approve_inspection_report, inspection_email_approval
      const activeStatuses = ['inspection_waiting', 'approve_inspection_report', 'inspection_email_approval'];

      // Current active jobs count
      const { count: currentCount, error: currentError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', activeStatuses);

      if (currentError) throw currentError;

      // Previous week active jobs (for comparison)
      const { count: previousWeekCount, error: previousError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', activeStatuses)
        .gte('updated_at', startOfPreviousWeek.toISOString())
        .lt('updated_at', startOfWeek.toISOString());

      if (previousError) throw previousError;

      const current = currentCount || 0;
      const previous = previousWeekCount || 0;
      const change = current - previous;

      return {
        count: current,
        previousWeek: previous,
        change,
        trend: getTrend(change),
      };
    },
    refetchInterval: 60000,
  });
}

// Hook: Fetch Completed Today (Stage 1: leads moved to "closed" today)
export function useCompletedToday() {
  return useQuery({
    queryKey: ['dashboard', 'completed-today'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Completed today count (leads with status "closed" updated today)
      const { count: todayCount, error: todayError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'closed')
        .gte('updated_at', today.toISOString())
        .lt('updated_at', tomorrow.toISOString());

      if (todayError) throw todayError;

      // Completed yesterday count
      const { count: yesterdayCount, error: yesterdayError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'closed')
        .gte('updated_at', yesterday.toISOString())
        .lt('updated_at', today.toISOString());

      if (yesterdayError) throw yesterdayError;

      const today_count = todayCount || 0;
      const yesterday_count = yesterdayCount || 0;
      const change = today_count - yesterday_count;

      return {
        count: today_count,
        yesterday: yesterday_count,
        change,
        trend: getTrend(change),
      };
    },
    refetchInterval: 60000,
  });
}

// Hook: Fetch Monthly Revenue (Stage 1: quoted_amount from closed leads)
export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ['dashboard', 'monthly-revenue'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const startOfPreviousMonth = new Date(startOfMonth);
      startOfPreviousMonth.setMonth(startOfPreviousMonth.getMonth() - 1);

      // Current month revenue (quoted_amount from closed leads updated this month)
      const { data: currentData, error: currentError } = await supabase
        .from('leads')
        .select('quoted_amount')
        .eq('status', 'closed')
        .gte('updated_at', startOfMonth.toISOString());

      if (currentError) throw currentError;

      // Previous month revenue
      const { data: previousData, error: previousError } = await supabase
        .from('leads')
        .select('quoted_amount')
        .eq('status', 'closed')
        .gte('updated_at', startOfPreviousMonth.toISOString())
        .lt('updated_at', startOfMonth.toISOString());

      if (previousError) throw previousError;

      const currentRevenue = currentData?.reduce(
        (sum, lead) => sum + (Number(lead.quoted_amount) || 0),
        0
      ) || 0;

      const previousRevenue = previousData?.reduce(
        (sum, lead) => sum + (Number(lead.quoted_amount) || 0),
        0
      ) || 0;

      const percentageChange = previousRevenue === 0
        ? 0
        : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

      return {
        amount: currentRevenue,
        previousMonth: previousRevenue,
        percentageChange: Math.round(percentageChange * 10) / 10,
        trend: getTrend(currentRevenue - previousRevenue),
      };
    },
    refetchInterval: 60000,
  });
}

// Hook: Fetch Recent Leads
export function useRecentLeads(limit: number = 10) {
  return useQuery({
    queryKey: ['dashboard', 'recent-leads', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, lead_number, status, lead_source, full_name, property_address_suburb, created_at')
        .eq('status', 'new_lead')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Add display_name field and rename suburb
      return data.map(lead => ({
        ...lead,
        suburb: lead.property_address_suburb,
        display_name: lead.lead_source === 'hipages'
          ? `HiPages Lead - ${lead.property_address_suburb}`
          : (lead.full_name || 'Lead'),
      })) as RecentLead[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Combined hook for all dashboard stats
export function useDashboardStats() {
  const totalLeads = useTotalLeadsThisMonth();
  const activeJobs = useActiveJobs();
  const completedToday = useCompletedToday();
  const monthlyRevenue = useMonthlyRevenue();

  return {
    totalLeadsThisMonth: totalLeads,
    activeJobs,
    completedToday,
    monthlyRevenue,
    isLoading:
      totalLeads.isLoading ||
      activeJobs.isLoading ||
      completedToday.isLoading ||
      monthlyRevenue.isLoading,
    error:
      totalLeads.error ||
      activeJobs.error ||
      completedToday.error ||
      monthlyRevenue.error,
  };
}
