import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function LeadPipeline() {
  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ["leadPipeline"],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("status");

      if (error) throw error;

      const statusCounts = leads?.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalLeads = leads?.length || 0;

      return {
        newLeads: statusCounts?.["new_lead"] || 0,
        inspectionWaiting: statusCounts?.["inspection_waiting"] || 0,
        approveReport: statusCounts?.["approve_inspection_report"] || 0,
        emailApproval: statusCounts?.["inspection_email_approval"] || 0,
        closed: statusCounts?.["closed"] || 0,
        notLanded: statusCounts?.["not_landed"] || 0,
        totalLeads,
      };
    },
  });

  const stages = [
    {
      label: "New Leads",
      count: pipelineData?.newLeads || 0,
      percentage: ((pipelineData?.newLeads || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-blue-500",
    },
    {
      label: "Awaiting Inspection",
      count: pipelineData?.inspectionWaiting || 0,
      percentage: ((pipelineData?.inspectionWaiting || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-amber-500",
    },
    {
      label: "Approve Report",
      count: pipelineData?.approveReport || 0,
      percentage: ((pipelineData?.approveReport || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-purple-500",
    },
    {
      label: "Email Approval",
      count: pipelineData?.emailApproval || 0,
      percentage: ((pipelineData?.emailApproval || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-sky-500",
    },
    {
      label: "Closed",
      count: pipelineData?.closed || 0,
      percentage: ((pipelineData?.closed || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-green-500",
    },
    {
      label: "Not Landed",
      count: pipelineData?.notLanded || 0,
      percentage: ((pipelineData?.notLanded || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-red-500",
    },
  ];

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">Lead Pipeline</h2>
        <Card className="p-6">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </section>
    );
  }

  // Calculate conversion rate (closed / total leads)
  const conversionRate = pipelineData?.totalLeads
    ? Math.round(
        ((pipelineData.closed || 0) / pipelineData.totalLeads) * 100
      )
    : 0;

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4">Lead Pipeline</h2>

      <Card className="p-6">
        <div className="space-y-6">
          {stages.map((stage, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">
                  {stage.label}
                </span>
                <span className="text-sm font-bold text-primary">
                  {stage.count}
                </span>
              </div>
              <div className="relative">
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} transition-all duration-500`}
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Conversion Rate:</span>
              <span className="font-semibold text-foreground">
                {conversionRate}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Leads:</span>
              <span className="font-semibold text-foreground">
                {pipelineData?.totalLeads || 0}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
