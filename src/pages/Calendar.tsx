import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Car,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";

type ViewMode = "month" | "week" | "day";
type AppointmentType = "inspection" | "job";

interface Appointment {
  id: string;
  type: AppointmentType;
  clientName: string;
  address: string;
  suburb: string;
  phone: string;
  email: string;
  technician: "Sarah Martinez" | "Michael Chen";
  startTime: Date;
  endTime: Date;
  duration: number;
  status: "scheduled" | "in-progress" | "completed";
  leadId?: string;
  jobType?: string;
  value?: string;
  equipment?: string[];
  notes?: string;
}

const dummyAppointments: Appointment[] = [
  {
    id: "1",
    type: "inspection",
    clientName: "John Smith",
    address: "45 High St, Croydon",
    suburb: "Croydon",
    phone: "0412 345 678",
    email: "john.smith@email.com",
    technician: "Sarah Martinez",
    startTime: new Date(2025, 2, 14, 9, 0),
    endTime: new Date(2025, 2, 14, 11, 0),
    duration: 2,
    status: "scheduled",
    leadId: "MRC-2025-0042",
    notes: "Customer wants quote same day if possible",
  },
  {
    id: "2",
    type: "job",
    clientName: "Emma Wilson",
    address: "12 Oak Ave, Ringwood",
    suburb: "Ringwood",
    phone: "0423 456 789",
    email: "emma.wilson@gmail.com",
    technician: "Michael Chen",
    startTime: new Date(2025, 2, 14, 14, 0),
    endTime: new Date(2025, 2, 14, 22, 0),
    duration: 8,
    status: "scheduled",
    jobType: "Demo",
    value: "$1,798.90",
    equipment: ["2x Dehumidifier", "3x Air Mover"],
  },
  {
    id: "3",
    type: "inspection",
    clientName: "Lisa Brown",
    address: "89 Beach Rd, Frankston",
    suburb: "Frankston",
    phone: "0467 890 123",
    email: "lisa.brown22@gmail.com",
    technician: "Sarah Martinez",
    startTime: new Date(2025, 2, 15, 8, 0),
    endTime: new Date(2025, 2, 15, 10, 0),
    duration: 2,
    status: "scheduled",
  },
  {
    id: "4",
    type: "job",
    clientName: "Robert Kim",
    address: "56 River Rd, Doncaster",
    suburb: "Doncaster",
    phone: "0456 789 012",
    email: "rob.kim@company.com",
    technician: "Michael Chen",
    startTime: new Date(2025, 2, 15, 13, 0),
    endTime: new Date(2025, 2, 15, 21, 0),
    duration: 8,
    status: "scheduled",
    jobType: "Construction",
    value: "$1,507.95",
    equipment: ["1x Dehumidifier", "2x Air Mover"],
  },
  {
    id: "5",
    type: "job",
    clientName: "Jennifer Lee",
    address: "67 Lake Dr, Clayton",
    suburb: "Clayton",
    phone: "0489 012 345",
    email: "jen.lee@company.com.au",
    technician: "Michael Chen",
    startTime: new Date(2025, 2, 17, 8, 0),
    endTime: new Date(2025, 2, 17, 16, 0),
    duration: 8,
    status: "scheduled",
    jobType: "Subfloor",
    value: "$6,400 (3 days)",
    equipment: ["3x Dehumidifier", "4x Air Mover", "RCD"],
    notes: "Day 1 of 3 - Multi-day job",
  },
  {
    id: "6",
    type: "job",
    clientName: "Jennifer Lee",
    address: "67 Lake Dr, Clayton",
    suburb: "Clayton",
    phone: "0489 012 345",
    email: "jen.lee@company.com.au",
    technician: "Michael Chen",
    startTime: new Date(2025, 2, 18, 8, 0),
    endTime: new Date(2025, 2, 18, 16, 0),
    duration: 8,
    status: "scheduled",
    jobType: "Subfloor",
    value: "$6,400 (3 days)",
    equipment: ["3x Dehumidifier", "4x Air Mover", "RCD"],
    notes: "Day 2 of 3 - Multi-day job",
  },
  {
    id: "7",
    type: "inspection",
    clientName: "David Martinez",
    address: "34 Hill St, Carlton",
    suburb: "Carlton",
    phone: "0478 901 234",
    email: "david.m@email.com",
    technician: "Sarah Martinez",
    startTime: new Date(2025, 2, 18, 10, 0),
    endTime: new Date(2025, 2, 18, 12, 0),
    duration: 2,
    status: "scheduled",
  },
  {
    id: "8",
    type: "job",
    clientName: "Jennifer Lee",
    address: "67 Lake Dr, Clayton",
    suburb: "Clayton",
    phone: "0489 012 345",
    email: "jen.lee@company.com.au",
    technician: "Michael Chen",
    startTime: new Date(2025, 2, 19, 8, 0),
    endTime: new Date(2025, 2, 19, 16, 0),
    duration: 8,
    status: "scheduled",
    jobType: "Subfloor",
    value: "$6,400 (3 days)",
    equipment: ["3x Dehumidifier", "4x Air Mover", "RCD"],
    notes: "Day 3 of 3 - Multi-day job",
  },
  {
    id: "9",
    type: "inspection",
    clientName: "Sophie Martin",
    address: "45 Park Ave, Kew",
    suburb: "Kew",
    phone: "0492 234 567",
    email: "sophie.m@gmail.com",
    technician: "Sarah Martinez",
    startTime: new Date(2025, 2, 19, 14, 0),
    endTime: new Date(2025, 2, 19, 16, 0),
    duration: 2,
    status: "scheduled",
  },
];

export default function Calendar() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date(2025, 2, 14)); // March 14, 2025 (Thursday)
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const filteredAppointments = dummyAppointments.filter(
    (apt) => selectedTechnician === "all" || apt.technician === selectedTechnician
  );

  const getTechnicianColor = (technician: string) => {
    if (technician === "Sarah Martinez") return "bg-purple-500";
    if (technician === "Michael Chen") return "bg-blue-500";
    return "bg-gray-500";
  };

  const getAppointmentTypeColor = (type: AppointmentType) => {
    return type === "inspection" ? "text-blue-600 border-blue-600" : "text-orange-600 border-orange-600";
  };

  const goToPrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date(2025, 2, 14)); // Thursday, March 14, 2025
  };

  const getDateRangeText = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d MMM")} - ${format(end, "d MMM yyyy")}`;
    } else {
      return format(currentDate, "EEEE, d MMMM yyyy");
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, "d");
        const cloneDay = day;
        const dayAppointments = filteredAppointments.filter((apt) =>
          isSameDay(apt.startTime, cloneDay)
        );

        days.push(
          <div
            key={day.toString()}
            className={`min-h-24 border border-border p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
              !isSameMonth(day, monthStart) ? "bg-muted/30 text-muted-foreground" : ""
            } ${isSameDay(day, new Date(2025, 2, 14)) ? "ring-2 ring-primary" : ""}`}
            onClick={() => {
              setCurrentDate(cloneDay);
              setViewMode("day");
            }}
          >
            <span className={`text-sm font-semibold ${isSameDay(day, new Date(2025, 2, 14)) ? "text-primary" : ""}`}>
              {formattedDate}
            </span>
            {dayAppointments.length > 0 && (
              <div className="mt-1 space-y-1">
                {dayAppointments.slice(0, 2).map((apt) => (
                  <div
                    key={apt.id}
                    className={`text-xs p-1 rounded ${getTechnicianColor(apt.technician)} text-white truncate`}
                  >
                    {format(apt.startTime, "HH:mm")} {apt.clientName}
                  </div>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayAppointments.length - 2} more
                  </div>
                )}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-0">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div>
        <div className="grid grid-cols-7 gap-0 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-8 border-b sticky top-0 bg-card z-10">
            <div className="p-2 text-center text-sm font-semibold"></div>
            {weekDays.map((day) => (
              <div
                key={day.toString()}
                className={`p-2 text-center ${isSameDay(day, new Date(2025, 2, 14)) ? "bg-primary/10" : ""}`}
              >
                <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                <div className={`text-lg font-semibold ${isSameDay(day, new Date(2025, 2, 14)) ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b" style={{ minHeight: "60px" }}>
                <div className="p-2 text-xs text-muted-foreground text-right border-r">
                  {format(new Date().setHours(hour, 0), "h:mm a")}
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = filteredAppointments.filter(
                    (apt) =>
                      isSameDay(apt.startTime, day) &&
                      apt.startTime.getHours() === hour
                  );
                  return (
                    <div key={day.toString()} className="border-r p-1 relative">
                      {dayAppointments.map((apt) => {
                        const height = apt.duration * 60;
                        return (
                          <div
                            key={apt.id}
                            className={`absolute inset-x-1 ${getTechnicianColor(apt.technician)} text-white rounded p-1 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden`}
                            style={{ height: `${height}px` }}
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setIsDetailDialogOpen(true);
                            }}
                          >
                            <div className="text-xs font-semibold truncate">{apt.clientName}</div>
                            <div className="text-xs truncate">{apt.type === "inspection" ? "Inspection" : apt.jobType}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 25 }, (_, i) => i + 7); // 7 AM to 7 PM (half-hour slots)
    const dayAppointments = filteredAppointments.filter((apt) =>
      isSameDay(apt.startTime, currentDate)
    );

    return (
      <div className="space-y-2">
        {hours.map((hour) => {
          const time = new Date().setHours(hour, 0);
          const halfHourTime = new Date().setHours(hour, 30);
          const appointmentsAtTime = dayAppointments.filter(
            (apt) => apt.startTime.getHours() === hour
          );

          return (
            <div key={hour}>
              {/* Hour slot */}
              <div className="flex items-start gap-4">
                <div className="w-24 text-sm text-muted-foreground text-right pt-2">
                  {format(time, "h:mm a")}
                </div>
                <div className="flex-1">
                  {appointmentsAtTime.map((apt) => (
                    <Card
                      key={apt.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow mb-2"
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge
                            variant="outline"
                            className={`${getAppointmentTypeColor(apt.type)} border-2`}
                          >
                            {apt.type === "inspection" ? "🔵 INSPECTION" : "🟠 JOB"}
                          </Badge>
                          <span className={`text-xs px-2 py-1 rounded-full ${getTechnicianColor(apt.technician)} text-white`}>
                            {apt.technician}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{apt.clientName}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {apt.address}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {apt.duration} hours
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {apt.phone}
                          </p>
                          {apt.value && (
                            <p className="flex items-center gap-2 font-semibold text-foreground">
                              <DollarSign className="h-4 w-4" />
                              {apt.value} + GST
                            </p>
                          )}
                          {apt.equipment && (
                            <p className="flex items-start gap-2">
                              <span className="text-xs">📋</span>
                              <span className="text-xs">Equipment: {apt.equipment.join(", ")}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
                            {apt.type === "inspection" ? "Start Inspection" : "Start Job"}
                          </Button>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            Reschedule
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {appointmentsAtTime.length === 0 && (
                    <div className="h-12 border-2 border-dashed border-border rounded hover:bg-muted/50 transition-colors"></div>
                  )}
                </div>
              </div>
              {/* Half-hour slot */}
              <div className="flex items-start gap-4 mt-2">
                <div className="w-24 text-sm text-muted-foreground text-right">
                  {format(halfHourTime, "h:mm a")}
                </div>
                <div className="flex-1 h-8 border-b border-dashed border-border"></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Calendar</h1>
              
              {/* View Mode Switcher */}
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === "month" ? "default" : "ghost"}
                  onClick={() => setViewMode("month")}
                  className={viewMode === "month" ? "bg-primary text-primary-foreground" : ""}
                >
                  Month
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "week" ? "default" : "ghost"}
                  onClick={() => setViewMode("week")}
                  className={viewMode === "week" ? "bg-primary text-primary-foreground" : ""}
                >
                  Week
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "day" ? "default" : "ghost"}
                  onClick={() => setViewMode("day")}
                  className={viewMode === "day" ? "bg-primary text-primary-foreground" : ""}
                >
                  Day
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger className="w-48 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="all">All Technicians</SelectItem>
                  <SelectItem value="Sarah Martinez">Sarah Martinez</SelectItem>
                  <SelectItem value="Michael Chen">Michael Chen</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: "#121D73", color: "white" }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Book Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Book New Appointment</DialogTitle>
                    <DialogDescription>
                      Schedule an inspection or job
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Appointment Type</Label>
                      <Select defaultValue="inspection">
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          <SelectItem value="inspection">Inspection (1-2 hours)</SelectItem>
                          <SelectItem value="job">Job (2-8+ hours)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Select Client</Label>
                      <Select>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Search leads..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          <SelectItem value="1">John Smith - Croydon</SelectItem>
                          <SelectItem value="2">Emma Wilson - Ringwood</SelectItem>
                          <SelectItem value="3">Lisa Brown - Frankston</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Input type="date" className="bg-background" />
                      </div>
                      <div>
                        <Label>Start Time</Label>
                        <Select defaultValue="09:00">
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="07:00">7:00 AM</SelectItem>
                            <SelectItem value="08:00">8:00 AM</SelectItem>
                            <SelectItem value="09:00">9:00 AM</SelectItem>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                            <SelectItem value="12:00">12:00 PM</SelectItem>
                            <SelectItem value="13:00">1:00 PM</SelectItem>
                            <SelectItem value="14:00">2:00 PM</SelectItem>
                            <SelectItem value="15:00">3:00 PM</SelectItem>
                            <SelectItem value="16:00">4:00 PM</SelectItem>
                            <SelectItem value="17:00">5:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duration</Label>
                        <Select defaultValue="2">
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="2">2 hours</SelectItem>
                            <SelectItem value="4">4 hours</SelectItem>
                            <SelectItem value="8">8 hours (Full day)</SelectItem>
                            <SelectItem value="16">16 hours (2 days)</SelectItem>
                            <SelectItem value="24">24 hours (3 days)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Assign to</Label>
                        <Select defaultValue="sarah">
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="sarah">Sarah Martinez</SelectItem>
                            <SelectItem value="michael">Michael Chen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Special instructions, access codes, parking notes..."
                        className="bg-background"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="notify" />
                      <label htmlFor="notify" className="text-sm">
                        Send confirmation email to client
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setIsBookingDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button style={{ backgroundColor: "#121D73", color: "white" }} className="flex-1">
                        Book Appointment
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={goToToday}>
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-lg font-semibold">{getDateRangeText()}</div>
          </div>
        </div>
      </div>

      {/* Calendar Views */}
      <div className="container mx-auto px-4 py-6">
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
      </div>

      {/* Appointment Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-card max-w-2xl">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedAppointment.type === "inspection" ? "Inspection" : "Job"} Appointment
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {format(selectedAppointment.startTime, "EEEE, d MMMM yyyy")}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(selectedAppointment.startTime, "h:mm a")} - {format(selectedAppointment.endTime, "h:mm a")} ({selectedAppointment.duration} hours)
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Client Details</h3>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {selectedAppointment.clientName}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {selectedAppointment.email}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selectedAppointment.phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {selectedAppointment.address}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Appointment Details</h3>
                  <div className="space-y-2 text-sm">
                    <p>Type: {selectedAppointment.type === "inspection" ? "Inspection" : selectedAppointment.jobType}</p>
                    {selectedAppointment.leadId && <p>Lead ID: {selectedAppointment.leadId}</p>}
                    <p>Status: {selectedAppointment.status}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Assigned To</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full ${getTechnicianColor(selectedAppointment.technician)} text-white text-sm`}>
                      {selectedAppointment.technician}
                    </span>
                  </div>
                </div>

                {selectedAppointment.value && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Job Value</h3>
                    <p className="text-lg font-semibold text-primary">{selectedAppointment.value} + GST</p>
                  </div>
                )}

                {selectedAppointment.equipment && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Equipment</h3>
                    <ul className="list-disc list-inside text-sm">
                      {selectedAppointment.equipment.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button style={{ backgroundColor: "#121D73", color: "white" }} className="flex-1">
                    {selectedAppointment.type === "inspection" ? "Start Inspection" : "Start Job"}
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Reschedule
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
