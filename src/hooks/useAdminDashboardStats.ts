import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  todaysJobs: number;
  leadsToAssign: number;
  completedThisWeek: number;
  revenueThisWeek: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for fetching real-time dashboard statistics from Supabase.
 *
 * Stats:
 * - todaysJobs: Inspections scheduled for today
 * - leadsToAssign: New leads without an assigned technician
 * - completedThisWeek: Jobs completed this week (Monday-Sunday)
 * - revenueThisWeek: Total revenue from completed inspections this week
 */
export function useAdminDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({
    todaysJobs: 0,
    leadsToAssign: 0,
    completedThisWeek: 0,
    revenueThisWeek: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get today's date in YYYY-MM-DD format (Melbourne timezone)
      const melbToday = new Date(new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' }));
      const today = `${melbToday.getFullYear()}-${String(melbToday.getMonth() + 1).padStart(2, '0')}-${String(melbToday.getDate()).padStart(2, '0')}`;

      // Get start of week (Monday) in Melbourne timezone
      const now = new Date();
      const melbourneNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
      const dayOfWeek = melbourneNow.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days back, else dayOfWeek - 1
      const startOfWeek = new Date(melbourneNow);
      startOfWeek.setDate(melbourneNow.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekISO = startOfWeek.toISOString();


      // Run all queries in parallel for better performance
      const [
        todaysJobsResult,
        leadsToAssignResult,
        completedThisWeekResult,
        revenueResult,
      ] = await Promise.all([
        // 1. Today's Jobs - count inspections scheduled for today
        supabase
          .from('inspections')
          .select('*', { count: 'exact', head: true })
          .eq('inspection_date', today),

        // 2. Leads to Assign - new leads without technician assigned
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .is('assigned_to', null)
          .in('status', ['new_lead', 'hipages_lead']),

        // 3. Completed This Week - leads that moved to completed status this week
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .in('status', ['job_completed', 'paid', 'finished', 'invoicing_sent'])
          .gte('updated_at', startOfWeekISO),

        // 4. Revenue This Week - sum of total_inc_gst from inspections created this week
        supabase
          .from('inspections')
          .select('total_inc_gst')
          .gte('created_at', startOfWeekISO)
          .not('total_inc_gst', 'is', null),
      ]);

      // Check for errors
      if (todaysJobsResult.error) {
        console.error('[Dashboard Stats] Today\'s jobs error:', todaysJobsResult.error);
        throw todaysJobsResult.error;
      }
      if (leadsToAssignResult.error) {
        console.error('[Dashboard Stats] Leads to assign error:', leadsToAssignResult.error);
        throw leadsToAssignResult.error;
      }
      if (completedThisWeekResult.error) {
        console.error('[Dashboard Stats] Completed this week error:', completedThisWeekResult.error);
        throw completedThisWeekResult.error;
      }
      if (revenueResult.error) {
        console.error('[Dashboard Stats] Revenue error:', revenueResult.error);
        throw revenueResult.error;
      }

      // Calculate total revenue
      const totalRevenue = revenueResult.data?.reduce((sum, inspection) => {
        const amount = inspection.total_inc_gst;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0) || 0;

      const newStats = {
        todaysJobs: todaysJobsResult.count || 0,
        leadsToAssign: leadsToAssignResult.count || 0,
        completedThisWeek: completedThisWeekResult.count || 0,
        revenueThisWeek: totalRevenue,
        isLoading: false,
        error: null,
      };

      setStats(newStats);

    } catch (err) {
      console.error('[Dashboard Stats] Error fetching stats:', err);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load dashboard stats',
      }));
    }
  };

  return stats;
}
