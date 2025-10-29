import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#121D73', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#6366F1'];

export function LeadSourceAnalytics() {
  const [dateRange, setDateRange] = useState("this_month");

  // Query for leads by source
  const { data: leadsBySource, isLoading: loadingBySource } = useQuery({
    queryKey: ["leadsBySource", dateRange],
    queryFn: async () => {
      let startDate = new Date();
      
      if (dateRange === "this_week") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === "this_month") {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (dateRange === "this_quarter") {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (dateRange === "this_year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const { data, error } = await supabase
        .from("leads")
        .select("lead_source, status, created_at, invoice_amount")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      // Group by source
      const sourceGroups: Record<string, any> = {};
      data.forEach((lead) => {
        const source = lead.lead_source || "Other";
        if (!sourceGroups[source]) {
          sourceGroups[source] = {
            name: source,
            total: 0,
            contacted: 0,
            inspected: 0,
            jobs: 0,
            revenue: 0,
          };
        }
        sourceGroups[source].total++;
        
        if (lead.status !== "new_lead") {
          sourceGroups[source].contacted++;
        }
        
        if (lead.status && (lead.status.includes("inspection") || lead.status === "paid" || lead.status === "finished")) {
          sourceGroups[source].inspected++;
        }
        
        if (lead.status === "paid" || lead.status === "finished") {
          sourceGroups[source].jobs++;
          sourceGroups[source].revenue += lead.invoice_amount || 0;
        }
      });

      return Object.values(sourceGroups).sort((a: any, b: any) => b.total - a.total);
    },
  });

  // Query for trend data (last 6 months)
  const { data: trendData } = useQuery({
    queryKey: ["leadSourceTrend"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from("leads")
        .select("lead_source, created_at")
        .gte("created_at", sixMonthsAgo.toISOString());

      if (error) throw error;

      // Group by month and source
      const monthGroups: Record<string, Record<string, number>> = {};
      
      data.forEach((lead) => {
        const date = new Date(lead.created_at);
        const monthKey = date.toLocaleDateString("en-AU", { month: "short" });
        const source = lead.lead_source || "Other";
        
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = {};
        }
        
        monthGroups[monthKey][source] = (monthGroups[monthKey][source] || 0) + 1;
      });

      return Object.entries(monthGroups).map(([month, sources]) => ({
        month,
        ...sources,
      }));
    },
  });

  const totalLeads = leadsBySource?.reduce((sum, s: any) => sum + s.total, 0) || 0;
  const totalRevenue = leadsBySource?.reduce((sum, s: any) => sum + s.revenue, 0) || 0;
  const overallConversion = totalLeads > 0 
    ? ((leadsBySource?.reduce((sum, s: any) => sum + s.jobs, 0) || 0) / totalLeads * 100).toFixed(0)
    : 0;

  // Prepare data for pie chart
  const pieData = leadsBySource?.map((s: any, idx) => ({
    name: s.name,
    value: s.total,
    percentage: ((s.total / totalLeads) * 100).toFixed(0),
    color: COLORS[idx % COLORS.length],
  })) || [];

  // Top 3 sources
  const topSources = leadsBySource?.slice(0, 3) || [];

  if (loadingBySource) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Lead Source Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>📊 Lead Source Analysis</CardTitle>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Leads
            </div>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Conversion Rate
            </div>
            <p className="text-2xl font-bold">{overallConversion}%</p>
          </div>
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Revenue Generated
            </div>
            <p className="text-2xl font-bold">
              ${totalRevenue.toFixed(0)}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Active Sources
            </div>
            <p className="text-2xl font-bold">{leadsBySource?.length || 0}</p>
          </div>
        </div>

        {/* Pie Chart and Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Leads by Source Distribution</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name} (${entry.percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {pieData.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.name}</span>
                      </div>
                      <span className="font-medium">
                        {entry.value} ({entry.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No data available for this period
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Lead Volume by Source</h3>
            {leadsBySource && leadsBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsBySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#121D73" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Sources */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Top Performing Sources</h3>
          <div className="space-y-4">
            {topSources.map((source: any, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
              const conversionRate = source.total > 0 
                ? ((source.jobs / source.total) * 100).toFixed(0)
                : 0;
              
              return (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{medal}</span>
                      <div>
                        <h4 className="font-semibold">{idx + 1}. {source.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary">
                            {source.total} Leads
                          </Badge>
                          <Badge variant="default">
                            {conversionRate}% Conversion
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Contacted</p>
                      <p className="font-medium">{source.contacted} ({source.total > 0 ? ((source.contacted/source.total)*100).toFixed(0) : 0}%)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Inspected</p>
                      <p className="font-medium">{source.inspected} ({source.total > 0 ? ((source.inspected/source.total)*100).toFixed(0) : 0}%)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jobs Won</p>
                      <p className="font-medium">{source.jobs}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-medium">
                        ${source.revenue.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion Funnel Table */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Conversion Funnel by Source</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Source</th>
                  <th className="text-center p-3">Leads</th>
                  <th className="text-center p-3">Contacted</th>
                  <th className="text-center p-3">Inspected</th>
                  <th className="text-center p-3">Jobs</th>
                  <th className="text-center p-3">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {leadsBySource?.map((source: any, idx) => {
                  const convRate = source.total > 0 ? ((source.jobs/source.total)*100).toFixed(0) : 0;
                  return (
                    <tr key={idx} className="border-t">
                      <td className="p-3 font-medium">{source.name}</td>
                      <td className="p-3 text-center">{source.total}</td>
                      <td className="p-3 text-center">{source.contacted}</td>
                      <td className="p-3 text-center">{source.inspected}</td>
                      <td className="p-3 text-center">{source.jobs}</td>
                      <td className="p-3 text-center font-medium">{convRate}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t bg-muted font-bold">
                  <td className="p-3">TOTAL</td>
                  <td className="p-3 text-center">
                    {leadsBySource?.reduce((sum: number, s: any) => sum + s.total, 0) || 0}
                  </td>
                  <td className="p-3 text-center">
                    {leadsBySource?.reduce((sum: number, s: any) => sum + s.contacted, 0) || 0}
                  </td>
                  <td className="p-3 text-center">
                    {leadsBySource?.reduce((sum: number, s: any) => sum + s.inspected, 0) || 0}
                  </td>
                  <td className="p-3 text-center">
                    {leadsBySource?.reduce((sum: number, s: any) => sum + s.jobs, 0) || 0}
                  </td>
                  <td className="p-3 text-center">{overallConversion}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend Over Time */}
        {trendData && trendData.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Lead Source Trend (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Website Form" stroke="#121D73" strokeWidth={2} />
                <Line type="monotone" dataKey="Google Search (Organic)" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="Customer Referral" stroke="#F59E0B" strokeWidth={2} />
                <Line type="monotone" dataKey="Google Ads" stroke="#EF4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Marketing Insights */}
        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold mb-4">💡 Marketing Insights & Recommendations</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">✅ STRENGTHS</h4>
                <ul className="space-y-2 text-sm">
                  {leadsBySource && leadsBySource.length > 0 && (
                    <>
                      <li>• {leadsBySource[0]?.name} generating {((leadsBySource[0]?.total / totalLeads) * 100).toFixed(0)}% of all leads</li>
                      {leadsBySource.some((s: any) => s.name === "Website Form") && (
                        <li>• Website form performing well - optimize for more conversions</li>
                      )}
                      <li>• Overall conversion rate of {overallConversion}%</li>
                    </>
                  )}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-amber-600 mb-2">⚠️ OPPORTUNITIES</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Consider increasing investment in top-performing channels</li>
                  <li>• Develop referral incentive program to boost word-of-mouth</li>
                  <li>• Test new marketing channels (e.g., LinkedIn, local partnerships)</li>
                  <li>• Improve response time for website leads (<4 hours)</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-primary mb-2">🎯 RECOMMENDED ACTIONS</h4>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                <li>Add live chat to website to capture more inquiries</li>
                <li>Start customer referral rewards program</li>
                <li>Test Google Ads campaign ($500/month pilot)</li>
                <li>Increase social media posting frequency</li>
                <li>Partner with real estate agents in key suburbs</li>
                <li>Track response times and set SLA targets</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
