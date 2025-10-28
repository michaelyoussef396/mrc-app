import { Card } from "@/components/ui/card";
import { TrendingUp, Minus } from "lucide-react";

export function RevenueOverview() {
  const stats = [
    {
      label: "TODAY",
      value: "$2,400",
      subtext: "1 job",
      trend: "+20%",
      trendUp: true,
    },
    {
      label: "THIS WEEK",
      value: "$12,800",
      subtext: "5 jobs",
      trend: "+15%",
      trendUp: true,
    },
    {
      label: "THIS MONTH",
      value: "$45,600",
      subtext: "19 jobs",
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "OUTSTANDING",
      value: "$8,800",
      subtext: "4 quotes",
      trend: "Stable",
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
