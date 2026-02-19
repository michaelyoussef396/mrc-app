/**
 * Reports Page
 * Analytics dashboard with KPIs, charts, and data visualizations
 */

import { useState } from 'react';
import { useReportsData, TimePeriod } from '@/hooks/useReportsData';
import {
  PeriodFilter,
  KPICard,
  StatusChart,
  SourcesChart,
  TimelineChart,
} from '@/components/reports';
import { Users, TrendingUp, Clock, DollarSign, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  return `${hours} hrs`;
}

// ============================================================================
// COMPONENT
// ============================================================================

const Reports = () => {
  const [period, setPeriod] = useState<TimePeriod>('month');
  const { kpis, statusBreakdown, sourceBreakdown, timeline, isLoading, error } = useReportsData(period);

  // Loading state
  if (isLoading) {
    return (
      <AdminPageLayout
        title="Reports"
        subtitle="Analytics and insights for your lead pipeline"
        icon="assessment"
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      >
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-slate-500">Loading reports...</p>
            </div>
          </div>
        </div>
      </AdminPageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminPageLayout
        title="Reports"
        subtitle="Analytics and insights for your lead pipeline"
        icon="assessment"
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      >
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-red-50 p-4 rounded-full">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Failed to load reports</p>
                <p className="text-sm text-slate-500 mt-1">{error.message}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="Reports"
      subtitle="Analytics and insights for your lead pipeline"
      icon="assessment"
      actions={<PeriodFilter value={period} onChange={setPeriod} />}
    >
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Leads"
            value={kpis.totalLeads}
            icon={<Users className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            subtitle="New leads in period"
          />
          <KPICard
            title="Conversion Rate"
            value={`${kpis.conversionRate}%`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            subtitle="Leads to closed jobs"
          />
          <KPICard
            title="Avg Response Time"
            value={formatHours(kpis.avgResponseTime)}
            icon={<Clock className="w-5 h-5 text-orange-600" />}
            iconBg="bg-orange-50"
            subtitle="Time to first contact"
          />
          <KPICard
            title="Total Revenue"
            value={formatCurrency(kpis.totalRevenue)}
            icon={<DollarSign className="w-5 h-5 text-purple-600" />}
            iconBg="bg-purple-50"
            subtitle="From completed inspections"
          />
        </div>

        {/* Timeline Chart - Full Width */}
        <TimelineChart data={timeline} title="Lead Volume Over Time" />

        {/* Status and Sources Charts - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusChart data={statusBreakdown} />
          <SourcesChart data={sourceBreakdown} />
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Source */}
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Top Lead Source</p>
              {sourceBreakdown.length > 0 ? (
                <p className="text-lg font-semibold text-slate-900">
                  {sourceBreakdown[0].label}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    ({sourceBreakdown[0].count} leads)
                  </span>
                </p>
              ) : (
                <p className="text-slate-400">No data</p>
              )}
            </div>

            {/* Most Common Status */}
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Most Common Status</p>
              {statusBreakdown.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusBreakdown[0].color }}
                  />
                  <p className="text-lg font-semibold text-slate-900">
                    {statusBreakdown[0].label}
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      ({statusBreakdown[0].count})
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-slate-400">No data</p>
              )}
            </div>

            {/* Pipeline Health */}
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Pipeline Health</p>
              <p className="text-lg font-semibold text-slate-900">
                {kpis.conversionRate >= 30 ? (
                  <span className="text-emerald-600">Healthy</span>
                ) : kpis.conversionRate >= 15 ? (
                  <span className="text-orange-600">Average</span>
                ) : (
                  <span className="text-red-600">Needs Attention</span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                Based on conversion rate
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-400 pb-8">
          Data refreshes automatically every minute. Last updated: {new Date().toLocaleTimeString('en-AU')}
        </p>
      </div>
    </AdminPageLayout>
  );
};

export default Reports;
