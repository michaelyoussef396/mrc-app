import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const activityIcons: Record<string, string> = {
  lead_created: "📝",
  lead_updated: "✏️",
  inspection_scheduled: "📅",
  inspection_completed: "✅",
  report_sent: "🟢",
  quote_sent: "💰",
  quote_accepted: "🎉",
  job_completed: "🏆",
  payment_received: "💵",
};

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["recentActivities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          lead:leads(lead_number, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">🕒 Recent Activity</h2>
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4">🕒 Recent Activity</h2>

      <Card className="p-6">
        <div className="space-y-4">
          {activities && activities.length > 0 ? (
            <>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-0"
                >
                  <span className="text-xl">
                    {activityIcons[activity.activity_type] || "📌"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}

              <Button variant="link" className="w-full text-primary p-0 h-auto mt-4">
                See All Activity
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}
