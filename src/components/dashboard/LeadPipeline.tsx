import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function LeadPipeline() {
  const stages = [
    { label: "NEW LEADS", count: 12, percentage: 60, color: "bg-blue-500" },
    { label: "CONTACTED", count: 8, percentage: 40, color: "bg-purple-500" },
    { label: "QUALIFIED", count: 5, percentage: 25, color: "bg-amber-500" },
    { label: "BOOKED", count: 3, percentage: 15, color: "bg-green-500" },
  ];

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
              <span className="font-semibold text-foreground">25%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Time to Book:</span>
              <span className="font-semibold text-foreground">4.2 days</span>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
