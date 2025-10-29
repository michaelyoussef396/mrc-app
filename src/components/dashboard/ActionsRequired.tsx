import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function ActionsRequired() {
  const { data: actionCounts, isLoading } = useQuery({
    queryKey: ["actionItems"],
    queryFn: async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Leads needing follow-up
      const { data: followUpLeads, error: leadsError } = await supabase
        .from("leads")
        .select("id")
        .eq("status", "contacted")
        .lt("updated_at", twoDaysAgo.toISOString());

      // Quotes awaiting response (leads with quoted_amount but not yet accepted)
      const { data: quotes, error: quotesError } = await supabase
        .from("leads")
        .select("id, quoted_amount")
        .not("quoted_amount", "is", null)
        .in("status", ["inspection_report_pdf_completed", "inspection_completed"]);

      // Pending reports
      const { data: pendingReports, error: reportsError } = await supabase
        .from("inspections")
        .select("id, job_number")
        .eq("report_generated", true)
        .is("report_sent_date", null);

      if (leadsError || quotesError || reportsError) {
        throw new Error("Failed to load action items");
      }

      const totalQuoteValue = quotes?.reduce(
        (sum, q) => sum + (q.quoted_amount || 0),
        0
      );

      return {
        followUpCount: followUpLeads?.length || 0,
        quotesCount: quotes?.length || 0,
        quotesTotal: totalQuoteValue || 0,
        reportsCount: pendingReports?.length || 0,
        firstReportNumber: pendingReports?.[0]?.job_number || null,
      };
    },
  });

  const totalActions =
    (actionCounts?.followUpCount || 0) +
    (actionCounts?.quotesCount || 0) +
    (actionCounts?.reportsCount || 0);

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">⚡ Actions Required</h2>
          <Skeleton className="h-6 w-8 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const actions = [
    {
      icon: AlertCircle,
      iconColor: "text-red-600",
      title: `${actionCounts?.followUpCount || 0} leads need follow-up`,
      subtext: "(Contacted 2+ days ago)",
      buttonText: "Review Now",
      count: actionCounts?.followUpCount || 0,
    },
    {
      icon: DollarSign,
      iconColor: "text-amber-600",
      title: `${actionCounts?.quotesCount || 0} quotes awaiting response`,
      subtext: `Total: $${(actionCounts?.quotesTotal || 0).toLocaleString()}`,
      buttonText: "Follow Up",
      count: actionCounts?.quotesCount || 0,
    },
    {
      icon: FileText,
      iconColor: "text-blue-600",
      title: `${actionCounts?.reportsCount || 0} report${
        actionCounts?.reportsCount !== 1 ? "s" : ""
      } pending delivery`,
      subtext: actionCounts?.firstReportNumber || "No reports pending",
      buttonText: "Send Now",
      count: actionCounts?.reportsCount || 0,
    },
  ];

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-foreground">⚡ Actions Required</h2>
        {totalActions > 0 && (
          <Badge variant="destructive" className="rounded-full">
            {totalActions}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3">
                <Icon className={`h-6 w-6 mt-1 ${action.iconColor}`} />
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    {action.title}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {action.subtext}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={action.count === 0}
                  >
                    {action.buttonText}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
