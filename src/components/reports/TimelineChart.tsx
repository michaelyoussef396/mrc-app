/**
 * TimelineChart Component
 * Line chart showing leads over time
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TimelineData } from '@/hooks/useReportsData';

interface TimelineChartProps {
  data: TimelineData[];
  title?: string;
}

export default function TimelineChart({ data, title = 'Leads Over Time' }: TimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  const totalLeads = data.reduce((sum, item) => sum + item.leads, 0);
  const avgPerPeriod = data.length > 0 ? Math.round(totalLeads / data.length) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">
            Total: <span className="font-semibold text-slate-900">{totalLeads}</span>
          </span>
          <span className="text-slate-500">
            Avg: <span className="font-semibold text-slate-900">{avgPerPeriod}/period</span>
          </span>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#64748B' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number) => [value, 'Leads']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: '#1E293B', fontWeight: 500 }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#colorLeads)"
              dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: '#3B82F6', strokeWidth: 2, fill: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
