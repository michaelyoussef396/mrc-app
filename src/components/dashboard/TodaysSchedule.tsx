import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User } from "lucide-react";

export function TodaysSchedule() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["todaysSchedule"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("calendar_events")
        .select(`
          *,
          lead:leads(lead_number, full_name, property_address_street, property_address_suburb)
        `)
        .gte("start_datetime", today.toISOString())
        .lt("start_datetime", tomorrow.toISOString())
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">📅 Today's Schedule</h2>
          <Skeleton className="h-6 w-8 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-foreground">📅 Today's Schedule</h2>
        <Badge variant="secondary" className="rounded-full">
          {events?.length || 0}
        </Badge>
      </div>

      {events && events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        {format(new Date(event.start_datetime), "h:mm a")} -{" "}
                        {format(new Date(event.end_datetime), "h:mm a")}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {event.lead?.full_name || event.title}
                    </h3>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {event.location_address ||
                          `${event.lead?.property_address_street}, ${event.lead?.property_address_suburb}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Assigned Technician</span>
                    </div>
                  </div>
                  <Badge
                    className={
                      event.status === "scheduled"
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        : event.status === "in_progress"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }
                  >
                    {event.status}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  {event.status === "scheduled" && (
                    <Button size="sm" className="flex-1">
                      Start Inspection
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">
            No inspections scheduled for today
          </p>
        </Card>
      )}
    </section>
  );
}
