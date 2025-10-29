import { Card } from "@/components/ui/card";
import { TrendingUp, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function RevenueOverview() {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["revenueOverview"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      // Paid invoices for today
      const { data: todayInvoices } = await supabase
        .from("invoices")
        .select("total_inc_gst")
        .eq("status", "paid")
        .gte("paid_date", todayStart.toISOString());

      // Paid invoices for this week
      const { data: weekInvoices } = await supabase
        .from("invoices")
        .select("total_inc_gst")
        .eq("status", "paid")
        .gte("paid_date", weekStart.toISOString());

      // Paid invoices for this month
      const { data: monthInvoices } = await supabase
        .from("invoices")
        .select("total_inc_gst")
        .eq("status", "paid")
        .gte("paid_date", monthStart.toISOString());

      // Outstanding quotes (leads with quoted amounts)
      const { data: outstandingLeads } = await supabase
        .from("leads")
        .select("quoted_amount")
        .not("quoted_amount", "is", null)
        .in("status", ["inspection_report_pdf_completed", "inspection_completed"]);

      const todayTotal =
        todayInvoices?.reduce((sum, inv) => sum + (inv.total_inc_gst || 0), 0) || 0;
      const weekTotal =
        weekInvoices?.reduce((sum, inv) => sum + (inv.total_inc_gst || 0), 0) || 0;
      const monthTotal =
        monthInvoices?.reduce((sum, inv) => sum + (inv.total_inc_gst || 0), 0) || 0;
      const outstandingTotal =
        outstandingLeads?.reduce((sum, lead) => sum + (lead.quoted_amount || 0), 0) ||
        0;

      return {
        today: {
          value: todayTotal,
          count: todayInvoices?.length || 0,
        },
        week: {
          value: weekTotal,
          count: weekInvoices?.length || 0,
        },
        month: {
          value: monthTotal,
          count: monthInvoices?.length || 0,
        },
        outstanding: {
          value: outstandingTotal,
          count: outstandingLeads?.length || 0,
        },
      };
    },
  });

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">💰 Revenue Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const stats = [
    {
      label: "TODAY",
      value: `$${revenueData?.today.value.toLocaleString() || 0}`,
      subtext: `${revenueData?.today.count || 0} job${
        revenueData?.today.count !== 1 ? "s" : ""
      }`,
      trend: "+20%",
      trendUp: true,
    },
    {
      label: "THIS WEEK",
      value: `$${revenueData?.week.value.toLocaleString() || 0}`,
      subtext: `${revenueData?.week.count || 0} job${
        revenueData?.week.count !== 1 ? "s" : ""
      }`,
      trend: "+15%",
      trendUp: true,
    },
    {
      label: "THIS MONTH",
      value: `$${revenueData?.month.value.toLocaleString() || 0}`,
      subtext: `${revenueData?.month.count || 0} job${
        revenueData?.month.count !== 1 ? "s" : ""
      }`,
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "OUTSTANDING",
      value: `$${revenueData?.outstanding.value.toLocaleString() || 0}`,
      subtext: `${revenueData?.outstanding.count || 0} quote${
        revenueData?.outstanding.count !== 1 ? "s" : ""
      }`,
      trend: "Pending",
      trendUp: null,
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4">💰 Revenue Overview</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.subtext}</p>
              <div className="flex items-center gap-1 pt-1">
                {stat.trendUp === true && (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      {stat.trend}
                    </span>
                  </>
                )}
                {stat.trendUp === null && (
                  <>
                    <Minus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {stat.trend}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
