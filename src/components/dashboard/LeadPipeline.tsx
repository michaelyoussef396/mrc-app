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
        contacted: statusCounts?.["contacted"] || 0,
        inspectionWaiting: statusCounts?.["inspection_waiting"] || 0,
        jobWaiting: statusCounts?.["job_waiting"] || 0,
        totalLeads,
      };
    },
  });

  const stages = [
    {
      label: "NEW LEADS",
      count: pipelineData?.newLeads || 0,
      percentage:
        ((pipelineData?.newLeads || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-blue-500",
    },
    {
      label: "CONTACTED",
      count: pipelineData?.contacted || 0,
      percentage:
        ((pipelineData?.contacted || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-purple-500",
    },
    {
      label: "INSPECTION BOOKED",
      count: pipelineData?.inspectionWaiting || 0,
      percentage:
        ((pipelineData?.inspectionWaiting || 0) /
          (pipelineData?.totalLeads || 1)) *
        100,
      color: "bg-amber-500",
    },
    {
      label: "JOB BOOKED",
      count: pipelineData?.jobWaiting || 0,
      percentage:
        ((pipelineData?.jobWaiting || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-green-500",
    },
  ];

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">📊 Lead Pipeline</h2>
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

  const conversionRate = pipelineData?.totalLeads
    ? Math.round(
        ((pipelineData.jobWaiting || 0) / pipelineData.totalLeads) * 100
      )
    : 0;

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4">📊 Lead Pipeline</h2>

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
