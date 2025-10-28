import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function RecentActivity() {
  const activities = [
    {
      icon: "🟢",
      text: "Report sent to John Smith",
      time: "2 hours ago",
    },
    {
      icon: "📝",
      text: "New lead: Alex Brown",
      time: "3 hours ago",
    },
    {
      icon: "📅",
      text: "Inspection booked: Lisa Taylor",
      time: "5 hours ago",
    },
    {
      icon: "💰",
      text: "Quote accepted: Emma Wilson",
      time: "Yesterday",
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4">🕒 Recent Activity</h2>

      <Card className="p-6">
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-0"
            >
              <span className="text-xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.text}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}

          <Button variant="link" className="w-full text-primary p-0 h-auto mt-4">
            See All Activity
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </section>
  );
}
