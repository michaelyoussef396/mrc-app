import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDaysOverdue } from '@/lib/calculations/penaltyLadder';
import type { InvoiceStatus } from '@/lib/api/invoices';

interface DashboardStats {
  todaysJobs: number;
  leadsToAssign: number;
  completedThisWeek: number;
  revenueThisWeek: number;
  pendingReviews: number;
  overdueInvoicesCount: number;
  overdueInvoicesTotal: number;
  failedWebhooks: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for fetching real-time dashboard statistics from Supabase.
 *
 * Stats:
 * - todaysJobs: Bookings (inspections + jobs) whose span overlaps today
 * - leadsToAssign: New leads without an assigned technician
 * - completedThisWeek: Jobs completed this week (Monday-Sunday)
 * - revenueThisWeek: Revenue received this week — paid invoices by payment_date
 */
export function useAdminDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({
    todaysJobs: 0,
    leadsToAssign: 0,
    completedThisWeek: 0,
    revenueThisWeek: 0,
    pendingReviews: 0,
    overdueInvoicesCount: 0,
    overdueInvoicesTotal: 0,
    failedWebhooks: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get start of week (Monday) in Melbourne timezone
      const now = new Date();
      const melbourneNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
      const dayOfWeek = melbourneNow.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days back, else dayOfWeek - 1
      const startOfWeek = new Date(melbourneNow);
      startOfWeek.setDate(melbourneNow.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekISO = startOfWeek.toISOString();
      // Same Monday boundary as a plain date, for comparing DATE columns
      // (invoices.payment_date) rather than timestamps
      const startOfWeekDate = new Intl.DateTimeFormat('en-CA').format(startOfWeek);

      // Today's Melbourne day window, for booking-overlap queries
      const startOfToday = new Date(melbourneNow);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      const startOfTodayISO = startOfToday.toISOString();
      const endOfTodayISO = endOfToday.toISOString();


      // Run all queries in parallel for better performance
      const sevenDaysAgo = new Date(melbourneNow);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      const [
        todaysJobsResult,
        leadsToAssignResult,
        completedThisWeekResult,
        revenueResult,
        pendingReviewsResult,
        overdueInvoicesResult,
        failedWebhooksResult,
      ] = await Promise.all([
        // 1. Today's Jobs - bookings whose span overlaps today (Melbourne).
        // Overlap predicate (start < end-of-day AND end > start-of-day) so a
        // multi-day booking counts on EVERY day of its span, not just day one.
        supabase
          .from('calendar_bookings')
          .select('*', { count: 'exact', head: true })
          .lt('start_datetime', endOfTodayISO)
          .gt('end_datetime', startOfTodayISO)
          .neq('status', 'cancelled'),

        // 2. Leads to Assign - new leads without technician assigned
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .is('assigned_to', null)
          .in('status', ['new_lead', 'hipages_lead'])
          .is('archived_at', null),

        // 3. Completed This Week - leads that moved to completed status this week
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .in('status', ['job_completed', 'paid', 'finished', 'invoicing_sent'])
          .gte('updated_at', startOfWeekISO)
          .is('archived_at', null),

        // 4. Revenue This Week - money actually received: paid invoices with a
        // payment_date in the current Melbourne week (Mon 00:00 boundary)
        supabase
          .from('invoices')
          .select('total_amount')
          .eq('status', 'paid')
          .gte('payment_date', startOfWeekDate),

        // 5. Pending Reviews - leads flagged by techs for admin review
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_review')
          .is('archived_at', null),

        // 6. Overdue Invoices - issued-but-unpaid set; overdue is derived from
        // due_date below (matches useOverdueInvoices), never the stored status,
        // because the overdue-flagging cron can lag or miss rows
        supabase
          .from('invoices')
          .select('total_amount, due_date, status')
          .in('status', ['sent', 'viewed', 'overdue']),

        // 7. Failed Webhooks - submissions that failed in last 7 days
        supabase
          .from('webhook_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('created_at', sevenDaysAgoISO),
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
      if (pendingReviewsResult.error) {
        console.error('[Dashboard Stats] Pending reviews error:', pendingReviewsResult.error);
        throw pendingReviewsResult.error;
      }
      if (overdueInvoicesResult.error) {
        console.error('[Dashboard Stats] Overdue invoices error:', overdueInvoicesResult.error);
        throw overdueInvoicesResult.error;
      }
      // failedWebhooksResult errors are non-fatal (table may not exist yet)
      if (failedWebhooksResult.error) {
        console.warn('[Dashboard Stats] Failed webhooks query error:', failedWebhooksResult.error);
      }

      // Total revenue received this week (paid invoices)
      const totalRevenue = revenueResult.data?.reduce((sum, invoice) => {
        const amount = Number(invoice.total_amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0) || 0;

      // Calculate overdue invoice totals (past due_date only)
      const overdueData = (overdueInvoicesResult.data || []).filter(
        (inv) => getDaysOverdue({ due_date: inv.due_date, status: inv.status as InvoiceStatus }) > 0
      );
      const overdueTotal = overdueData.reduce((sum, inv) => {
        const amount = inv.total_amount;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);

      const newStats = {
        todaysJobs: todaysJobsResult.count || 0,
        leadsToAssign: leadsToAssignResult.count || 0,
        completedThisWeek: completedThisWeekResult.count || 0,
        revenueThisWeek: totalRevenue,
        pendingReviews: pendingReviewsResult.count || 0,
        overdueInvoicesCount: overdueData.length,
        overdueInvoicesTotal: overdueTotal,
        failedWebhooks: failedWebhooksResult.count || 0,
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
