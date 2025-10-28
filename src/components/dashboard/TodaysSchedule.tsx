import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User } from "lucide-react";

export function TodaysSchedule() {
  const inspections = [
    {
      time: "9:00 AM - 11:00 AM",
      client: "John Smith",
      address: "45 High St, Croydon",
      technician: "Sarah Martinez",
      status: "SCHEDULED",
    },
    {
      time: "1:00 PM - 3:00 PM",
      client: "Emma Wilson",
      address: "12 Oak Ave, Ringwood",
      technician: "Michael Chen",
      status: "SCHEDULED",
    },
    {
      time: "4:00 PM - 6:00 PM",
      client: "Lisa Taylor",
      address: "78 Main Rd, Croydon Hills",
      technician: "Sarah Martinez",
      status: "SCHEDULED",
    },
  ];

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-foreground">📅 Today's Schedule</h2>
        <Badge variant="secondary" className="rounded-full">
          {inspections.length}
        </Badge>
      </div>

      <div className="space-y-4">
        {inspections.map((inspection, index) => (
          <Card key={index} className="p-5">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">
                      {inspection.time}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {inspection.client}
                  </h3>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{inspection.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{inspection.technician}</span>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {inspection.status}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button size="sm" className="flex-1">
                  Start Inspection
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
