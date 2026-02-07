/**
 * SourcesChart Component
 * Horizontal bar chart showing lead sources
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SourceData } from '@/hooks/useReportsData';

interface SourcesChartProps {
  data: SourceData[];
}

// Color palette for sources
const sourceColors: Record<string, string> = {
  website: '#3B82F6',
  referral: '#10B981',
  google: '#F59E0B',
  hipages: '#EC4899',
  facebook: '#6366F1',
  phone: '#14B8A6',
  instagram: '#8B5CF6',
  other: '#94A3B8',
};

export default function SourcesChart({ data }: SourcesChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Lead Sources</h3>
        <div className="h-[300px] flex items-center justify-center text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    color: sourceColors[item.source] || sourceColors.other,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Lead Sources</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748B' }}
              width={70}
            />
            <Tooltip
              formatter={(value: number) => [value, 'Leads']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
