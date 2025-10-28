import { useState } from "react";
import { TopNavigation } from "@/components/dashboard/TopNavigation";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  FileText,
  Download,
  Printer,
  Mail,
  AlertCircle,
  CheckCircle,
  Package,
  MapPin,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Award,
} from "lucide-react";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("this-month");

  // Mock data for this month (March 2025)
  const metrics = {
    totalRevenue: 156432,
    revenueChange: 23,
    jobsCompleted: 45,
    jobsChange: 12,
    avgJobValue: 3476,
    outstanding: 18250,
    outstandingChange: -8,
    overdueInvoices: 7,
    conversionRate: 68,
    conversionChange: 5,
    leadsTotal: 45,
    jobsBooked: 31,
  };

  const revenueBreakdown = [
    { type: "Subfloor", amount: 65430, percentage: 42, color: "bg-blue-500" },
    { type: "Demo", amount: 52250, percentage: 33, color: "bg-green-500" },
    { type: "Construction", amount: 28120, percentage: 18, color: "bg-purple-500" },
    { type: "Surface", amount: 10632, percentage: 7, color: "bg-amber-500" },
  ];

  const paymentBreakdown = [
    { status: "Paid", amount: 138182, percentage: 88, color: "bg-green-500" },
    { status: "Outstanding", amount: 18250, percentage: 12, color: "bg-amber-500" },
  ];

  const monthlyPerformance = [
    { month: "Sep", revenue: 95000, jobs: 32 },
    { month: "Oct", revenue: 108000, jobs: 35 },
    { month: "Nov", revenue: 121000, jobs: 38 },
    { month: "Dec", revenue: 135000, jobs: 41 },
    { month: "Jan", revenue: 142000, jobs: 43 },
    { month: "Feb", revenue: 127000, jobs: 38 },
    { month: "Mar", revenue: 156432, jobs: 45 },
  ];

  const outstandingInvoices = [
    { invoice: "INV-2025-038", client: "Lisa Brown", amount: 3200, days: 45, status: "overdue" },
    { invoice: "INV-2025-041", client: "Tom Anderson", amount: 2450, days: 32, status: "overdue" },
    { invoice: "INV-2025-043", client: "Sarah Lee", amount: 2770, days: 28, status: "due-soon" },
    { invoice: "INV-2025-045", client: "Mike Davis", amount: 3100, days: 15, status: "recent" },
    { invoice: "INV-2025-047", client: "Emma Clark", amount: 2895, days: 12, status: "recent" },
    { invoice: "INV-2025-048", client: "John White", amount: 2280, days: 8, status: "recent" },
    { invoice: "INV-2025-049", client: "Amy Brown", amount: 1555, days: 3, status: "recent" },
  ];

  const topClients = [
    { name: "Jennifer Lee", property: "Commercial Property - Clayton", jobs: 3, revenue: 18450, status: "All paid" },
    { name: "Michael Chen", property: "Residential - Box Hill", jobs: 2, revenue: 12320, status: "All paid" },
    { name: "Sarah Taylor", property: "Residential - Glen Waverley", jobs: 2, revenue: 9870, status: "1 outstanding" },
    { name: "Robert Kim", property: "Residential - Doncaster", jobs: 2, revenue: 8650, status: "All paid" },
    { name: "Lisa Brown", property: "Residential - Frankston", jobs: 1, revenue: 8200, status: "Overdue" },
  ];

  const technicians = [
    { name: "Sarah Martinez", jobs: 25, revenue: 87450, avg: 3498, rating: 4.9 },
    { name: "Michael Chen", jobs: 20, revenue: 68982, avg: 3449, rating: 4.8 },
  ];

  const equipment = [
    { name: "Dehumidifiers", units: 4, usage: 87, revenue: 10296, inUse: 2, available: 2 },
    { name: "Air Movers", units: 8, usage: 74, revenue: 8096, inUse: 5, available: 3 },
    { name: "RCD Boxes", units: 6, usage: 65, revenue: 600, inUse: 4, available: 2 },
  ];

  const serviceAreas = [
    { zone: "Zone 1 (Inner Melbourne)", jobs: 18, revenue: 67432, avg: 3746, percentage: 43 },
    { zone: "Zone 2 (Middle Melbourne)", jobs: 15, revenue: 52100, avg: 3473, percentage: 33 },
    { zone: "Zone 3 (Outer Melbourne)", jobs: 8, revenue: 24600, avg: 3075, percentage: 16 },
    { zone: "Zone 4 (Extended)", jobs: 4, revenue: 12300, avg: 3075, percentage: 8 },
  ];

  const profitAnalysis = {
    revenue: 156432,
    costs: {
      labor: 62573,
      equipment: 8450,
      materials: 11520,
      overhead: 15643,
      marketing: 4693,
    },
    netProfit: 53553,
    profitMargin: 34,
    lastMonthMargin: 31,
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "text-red-500";
      case "due-soon":
        return "text-amber-500";
      default:
        return "text-green-500";
    }
  };

  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case "overdue":
        return "🔴";
      case "due-soon":
        return "🟡";
      default:
        return "🟢";
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const TrendIcon = ({ change }: { change: number }) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Business Reports</h1>
            <p className="text-muted-foreground">Financial intelligence and operational analytics</p>
          </div>

          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button variant="outline">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <TrendIcon change={metrics.revenueChange} />
                <span className={metrics.revenueChange > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(metrics.revenueChange)}% vs last month
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">This Month (March 2025)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Jobs Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.jobsCompleted}</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <TrendIcon change={metrics.jobsChange} />
                <span className={metrics.jobsChange > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(metrics.jobsChange)}% vs last month
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Average: {formatCurrency(metrics.avgJobValue)} per job
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(metrics.outstanding)}</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <TrendIcon change={metrics.outstandingChange} />
                <span className={metrics.outstandingChange < 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(metrics.outstandingChange)}% vs last month
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{metrics.overdueInvoices} invoices overdue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.conversionRate}%</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <TrendIcon change={metrics.conversionChange} />
                <span className={metrics.conversionChange > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(metrics.conversionChange)}% vs last month
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.leadsTotal} leads → {metrics.jobsBooked} jobs booked
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Monthly Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Performance
                </CardTitle>
                <CardDescription>Revenue and job trends over last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-end h-48">
                    {monthlyPerformance.map((month, index) => (
                      <div key={month.month} className="flex flex-col items-center gap-2 flex-1">
                        <div className="text-xs font-medium text-muted-foreground">{month.jobs}</div>
                        <div
                          className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                          style={{
                            height: `${(month.revenue / Math.max(...monthlyPerformance.map((m) => m.revenue))) * 100}%`,
                            minHeight: "20px",
                          }}
                        />
                        <div className="text-xs font-medium">{month.month}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(month.revenue / 1000)}k
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-muted-foreground">Trend</div>
                      <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                        <ArrowUp className="h-4 w-4" />
                        Growth trajectory positive
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Best Month</div>
                      <div className="text-sm font-medium">March 2025 ({formatCurrency(156432)})</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Monthly</div>
                      <div className="text-sm font-medium">{formatCurrency(126285)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights & Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Strong Performance Areas
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Revenue up 23% month-over-month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Profit margin improved to 34%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Conversion rate above industry average</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>High equipment utilization (87%)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-amber-600 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Areas for Attention
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium">7 invoices overdue (total {formatCurrency(8420)})</div>
                      </div>
                      <Button size="sm" variant="outline">
                        Send Reminders
                      </Button>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Zone 4 underperforming (only 4 jobs)</div>
                      </div>
                      <Button size="sm" variant="outline">
                        Review Marketing
                      </Button>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Equipment demand exceeding supply</div>
                      </div>
                      <Button size="sm" variant="outline">
                        Consider Purchase
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Goals This Quarter
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Reach $500k revenue</span>
                        <span className="font-medium">67% complete</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Maintain 35%+ profit margin</span>
                        <span className="font-medium">97% complete</span>
                      </div>
                      <Progress value={97} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Reduce overdue invoices to &lt;5%</span>
                        <span className="font-medium">42% complete</span>
                      </div>
                      <Progress value={42} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Job Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {revenueBreakdown.map((item) => (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{item.type}:</span>
                        <span>
                          {formatCurrency(item.amount)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentBreakdown.map((item) => (
                    <div key={item.status}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{item.status}:</span>
                        <span>
                          {formatCurrency(item.amount)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Profit Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Profit Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Total Revenue:</span>
                    <span className="text-lg font-bold">{formatCurrency(profitAnalysis.revenue)}</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Costs:</h4>
                    {Object.entries(profitAnalysis.costs).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="capitalize">• {key} (wages):</span>
                        <span className="text-red-600">
                          -{formatCurrency(value)} ({Math.round((value / profitAnalysis.revenue) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-b">
                    <span className="font-medium">Total Costs:</span>
                    <span className="text-red-600">
                      -{formatCurrency(Object.values(profitAnalysis.costs).reduce((a, b) => a + b, 0))} (
                      {Math.round(
                        (Object.values(profitAnalysis.costs).reduce((a, b) => a + b, 0) / profitAnalysis.revenue) * 100
                      )}
                      %)
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-green-50 dark:bg-green-950 px-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                    <span className="font-bold text-lg">NET PROFIT:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(profitAnalysis.netProfit)} ({profitAnalysis.profitMargin}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Profit Margin Trend</div>
                      <div className="text-sm font-medium">
                        Last Month: {profitAnalysis.lastMonthMargin}% | This Month: {profitAnalysis.profitMargin}%
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                        <ArrowUp className="h-4 w-4" />
                        Improving (+{profitAnalysis.profitMargin - profitAnalysis.lastMonthMargin}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Target</div>
                      <div className="text-sm font-medium">35% | Gap: 1%</div>
                      <div className="text-sm text-green-600 mt-1">On track to exceed target next month!</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Outstanding Invoices
                </CardTitle>
                <CardDescription>
                  Total Outstanding: {formatCurrency(metrics.outstanding)} | Overdue (&gt;30 days):{" "}
                  {formatCurrency(8420)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm">
                        <th className="pb-3 font-medium">Invoice</th>
                        <th className="pb-3 font-medium">Client</th>
                        <th className="pb-3 font-medium text-right">Amount</th>
                        <th className="pb-3 font-medium text-right">Days</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingInvoices.map((invoice) => (
                        <tr key={invoice.invoice} className="border-b">
                          <td className="py-3 font-mono text-sm">{invoice.invoice}</td>
                          <td className="py-3 text-sm">{invoice.client}</td>
                          <td className="py-3 text-sm text-right font-medium">
                            {formatCurrency(invoice.amount)}
                          </td>
                          <td className="py-3 text-sm text-right">{invoice.days}</td>
                          <td className="py-3">
                            <span className={getInvoiceStatusColor(invoice.status)}>
                              {getInvoiceStatusIcon(invoice.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
                  <div className="text-xs space-y-1">
                    <div>🔴 Overdue (&gt;30 days)</div>
                    <div>🟡 Due soon (15-30 days)</div>
                    <div>🟢 Recent (&lt;15 days)</div>
                  </div>
                  <div className="flex gap-2 sm:ml-auto">
                    <Button variant="outline" size="sm">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reminder
                    </Button>
                    <Button variant="outline" size="sm">
                      View All Invoices
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            {/* Top Clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Clients (This Year)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topClients.map((client, index) => (
                    <div key={client.name} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{client.name}</div>
                            <div className="text-sm text-muted-foreground">{client.property}</div>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span>
                                {client.jobs} job{client.jobs > 1 ? "s" : ""}
                              </span>
                              <span className="font-semibold text-primary">{formatCurrency(client.revenue)}</span>
                              <span>
                                <Badge variant={client.status === "All paid" ? "default" : "destructive"}>
                                  {client.status}
                                </Badge>
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View History
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Area Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Revenue by Service Area
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviceAreas.map((area) => (
                  <div key={area.zone}>
                    <div className="flex justify-between text-sm mb-2">
                      <div>
                        <span className="font-medium">{area.zone}</span>
                        <div className="text-xs text-muted-foreground mt-1">
                          Jobs: {area.jobs} | Revenue: {formatCurrency(area.revenue)} | Avg: {formatCurrency(area.avg)}
                        </div>
                      </div>
                      <span className="font-medium">{area.percentage}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${area.percentage}%` }} />
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-3">Top Suburbs:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>1. Croydon (Zone 2):</span>
                      <span className="font-medium">{formatCurrency(18450)} - 5 jobs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Box Hill (Zone 2):</span>
                      <span className="font-medium">{formatCurrency(15230)} - 4 jobs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3. Richmond (Zone 1):</span>
                      <span className="font-medium">{formatCurrency(14890)} - 4 jobs</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {/* Technician Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Technician Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {technicians.map((tech) => (
                  <div key={tech.name} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{tech.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.floor(tech.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                            />
                          ))}
                          <span className="text-sm font-medium ml-2">({tech.rating}/5.0)</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-lg">
                        {tech.jobs} jobs
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Revenue:</span>
                        <span className="font-semibold">{formatCurrency(tech.revenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average per Job:</span>
                        <span className="font-semibold">{formatCurrency(tech.avg)}</span>
                      </div>
                      <Progress value={(tech.jobs / 45) * 100} className="h-2 mt-3" />
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-muted rounded-lg border-2">
                  <h4 className="font-semibold mb-3">Overall Team Performance</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Jobs</div>
                      <div className="text-2xl font-bold">{metrics.jobsCompleted}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Job Value</div>
                      <div className="text-2xl font-bold">{formatCurrency(metrics.avgJobValue)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Customer Satisfaction</div>
                      <div className="text-2xl font-bold">4.85/5.0</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">On-time Completion</div>
                      <div className="text-2xl font-bold">96%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6">
            {/* Equipment Utilization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Equipment Utilization & Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {equipment.map((item) => (
                  <div key={item.name} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{item.name} ({item.units} units)</h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          Status: {item.inUse} in use, {item.available} available
                        </div>
                      </div>
                      <Badge
                        variant={item.usage >= 80 ? "default" : item.usage >= 60 ? "secondary" : "outline"}
                        className="text-lg"
                      >
                        {item.usage}%
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Usage (26/30 days):</span>
                        <span className="font-semibold">{item.usage}%</span>
                      </div>
                      <Progress value={item.usage} className="h-2" />

                      <div className="flex justify-between text-sm pt-2">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Recommendation</div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        Purchase 2 more dehumidifiers - high demand detected (87% utilization)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg border-2">
                  <h4 className="font-semibold mb-3">Equipment Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Equipment Revenue</div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(18992)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Utilization</div>
                      <div className="text-2xl font-bold">75%</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-muted-foreground">ROI Assessment</div>
                      <div className="text-lg font-bold text-green-600">Excellent</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            {/* Sales Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Sales Pipeline Analysis
                </CardTitle>
                <CardDescription>Lead to payment conversion funnel (This Month)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { stage: "New Leads", count: 65, conversion: 68, next: "Contacted" },
                    { stage: "Contacted", count: 44, conversion: 77, next: "Inspection Scheduled" },
                    { stage: "Inspection Scheduled", count: 34, conversion: 94, next: "Reports Sent" },
                    { stage: "Reports Sent", count: 32, conversion: 72, next: "Jobs Booked" },
                    { stage: "Jobs Booked", count: 23, conversion: 96, next: "Completed & Paid" },
                    { stage: "Completed & Paid", count: 22, conversion: null, next: null },
                  ].map((stage, index) => (
                    <div key={stage.stage}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{stage.stage}</span>
                            <span className="text-2xl font-bold">{stage.count}</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(stage.count / 65) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {stage.conversion && (
                        <div className="flex items-center gap-2 mt-2 ml-4 text-sm text-muted-foreground">
                          <ArrowDown className="h-4 w-4" />
                          <span>{stage.conversion}% conversion to {stage.next}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-4 border-t space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-semibold">Overall Lead → Paid:</span>
                      <span className="text-2xl font-bold text-green-600">34% (22/65)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Industry Average</div>
                        <div className="font-semibold">25%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Performance</div>
                        <div className="font-semibold text-green-600 flex items-center gap-1">
                          <ArrowUp className="h-4 w-4" />
                          Excellent (+36%)
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Time to Close</div>
                        <div className="font-semibold">18 days</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav />
    </div>
  );
}
