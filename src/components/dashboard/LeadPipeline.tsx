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
        inspectionCompleted: statusCounts?.["inspection_completed"] || 0,
        reportPdfReady: statusCounts?.["inspection_report_pdf_completed"] || 0,
        jobWaiting: statusCounts?.["job_waiting"] || 0,
        jobCompleted: statusCounts?.["job_completed"] || 0,
        jobReportSent: statusCounts?.["job_report_pdf_sent"] || 0,
        invoicingSent: statusCounts?.["invoicing_sent"] || 0,
        paid: statusCounts?.["paid"] || 0,
        googleReview: statusCounts?.["google_review"] || 0,
        finished: statusCounts?.["finished"] || 0,
        totalLeads,
      };
    },
  });

  const stages = [
    {
      label: "🆕 New Leads",
      count: pipelineData?.newLeads || 0,
      percentage: ((pipelineData?.newLeads || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-blue-500",
    },
    {
      label: "✅ Contacted",
      count: pipelineData?.contacted || 0,
      percentage: ((pipelineData?.contacted || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-green-500",
    },
    {
      label: "⏳ Inspections Waiting",
      count: pipelineData?.inspectionWaiting || 0,
      percentage: ((pipelineData?.inspectionWaiting || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-amber-500",
    },
    {
      label: "📝 Inspections Done",
      count: pipelineData?.inspectionCompleted || 0,
      percentage: ((pipelineData?.inspectionCompleted || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-indigo-500",
    },
    {
      label: "📄 Reports Ready",
      count: pipelineData?.reportPdfReady || 0,
      percentage: ((pipelineData?.reportPdfReady || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-purple-500",
    },
    {
      label: "📅 Jobs Waiting",
      count: pipelineData?.jobWaiting || 0,
      percentage: ((pipelineData?.jobWaiting || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-orange-500",
    },
    {
      label: "🛠️ Jobs In Progress",
      count: pipelineData?.jobCompleted || 0,
      percentage: ((pipelineData?.jobCompleted || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-green-600",
    },
    {
      label: "💰 Invoiced",
      count: pipelineData?.invoicingSent || 0,
      percentage: ((pipelineData?.invoicingSent || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-yellow-500",
    },
    {
      label: "✅ Paid",
      count: pipelineData?.paid || 0,
      percentage: ((pipelineData?.paid || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-emerald-500",
    },
    {
      label: "⭐ Review Stage",
      count: pipelineData?.googleReview || 0,
      percentage: ((pipelineData?.googleReview || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-amber-400",
    },
    {
      label: "🎉 Finished",
      count: pipelineData?.finished || 0,
      percentage: ((pipelineData?.finished || 0) / (pipelineData?.totalLeads || 1)) * 100,
      color: "bg-green-700",
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
