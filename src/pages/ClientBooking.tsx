import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  DollarSign,
  Wrench,
} from "lucide-react";
import logo from "@/assets/Logo.png";

interface InspectionData {
  reportNumber: string;
  inspector: string;
  inspectionDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyAddress: string;
  suburb: string;
  zone: number;
  jobDuration: string;
  equipmentDuration: string;
  totalTimeline: string;
  totalCost: number;
  pdfUrl?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  technician: string;
  available: boolean;
  reason?: string;
  recommended?: boolean;
}

type BookingStatus = "loading" | "valid" | "expired" | "already-booked" | "error";

export default function ClientBooking() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("loading");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [contactMethod, setContactMethod] = useState<"phone" | "email" | "sms">("phone");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [confirmations, setConfirmations] = useState({
    detailsCorrect: false,
    authorizeWork: false,
    agreeTerms: false,
  });
  const [bookingReference, setBookingReference] = useState("");

  // Mock inspection data (would come from API based on token)
  const inspectionData: InspectionData = {
    reportNumber: "MRC-2025-0042",
    inspector: "Sarah Martinez",
    inspectionDate: "14 March 2025",
    clientName: "John Smith",
    clientEmail: "john.smith@email.com",
    clientPhone: "0412 345 678",
    propertyAddress: "45 High St, Croydon VIC 3136",
    suburb: "Croydon",
    zone: 2,
    jobDuration: "1 day (8 hours)",
    equipmentDuration: "3-5 days",
    totalTimeline: "4 days",
    totalCost: 4076.26,
    pdfUrl: "#",
  };

  // Mock available dates (would come from API based on suburb, zone, existing bookings)
  const getAvailableDates = () => {
    const today = new Date();
    const availableDates: Date[] = [];
    
    // For Zone 2 (Croydon): Mon-Fri availability
    for (let i = 2; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends for most zones
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        // Simulate some dates being unavailable (existing bookings)
        if (i !== 5 && i !== 12 && i !== 19) {
          availableDates.push(date);
        }
      }
    }
    
    return availableDates;
  };

  const availableDates = getAvailableDates();

  // Mock time slots based on selected date (would come from API)
  const getTimeSlots = (date: Date | undefined): TimeSlot[] => {
    if (!date) return [];

    // Mock conditional logic based on date, suburb, existing bookings
    return [
      {
        startTime: "8:00 AM",
        endTime: "4:00 PM",
        technician: "Michael Chen",
        available: true,
        recommended: true,
      },
      {
        startTime: "9:00 AM",
        endTime: "5:00 PM",
        technician: "Sarah Martinez",
        available: true,
      },
      {
        startTime: "10:00 AM",
        endTime: "6:00 PM",
        technician: "Michael Chen",
        available: true,
      },
      {
        startTime: "7:00 AM",
        endTime: "3:00 PM",
        technician: "Sarah Martinez",
        available: false,
        reason: "Technician booked",
      },
      {
        startTime: "1:00 PM",
        endTime: "9:00 PM",
        technician: "Michael Chen",
        available: false,
        reason: "Conflicts with equipment",
      },
    ];
  };

  const timeSlots = getTimeSlots(selectedDate);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setBookingStatus("expired");
      return;
    }

    // Simulate token validation (would be API call)
    setTimeout(() => {
      // Mock validation logic
      if (token === "expired") {
        setBookingStatus("expired");
      } else if (token === "booked") {
        setBookingStatus("already-booked");
      } else if (token === "valid" || token) {
        setBookingStatus("valid");
      } else {
        setBookingStatus("error");
      }
    }, 500);
  }, [token]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTimeSlot("");
    if (date) {
      setStep(2);
    }
  };

  const handleTimeSlotSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    setStep(3);
  };

  const handleConfirmBooking = () => {
    if (!confirmations.detailsCorrect || !confirmations.authorizeWork || !confirmations.agreeTerms) {
      toast.error("Please confirm all checkboxes to proceed");
      return;
    }

    // Simulate booking creation (would be API call)
    const reference = `MRC-JOB-${inspectionData.reportNumber.split("-")[1]}-${Math.floor(Math.random() * 1000)}`;
    setBookingReference(reference);

    // Show success
    toast.success("Booking confirmed successfully!");
    setStep(4);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(
      (availableDate) =>
        availableDate.getDate() === date.getDate() &&
        availableDate.getMonth() === date.getMonth() &&
        availableDate.getFullYear() === date.getFullYear()
    );
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Error states
  if (bookingStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (bookingStatus === "expired") {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground shadow-md py-4">
          <div className="container mx-auto px-4 flex items-center justify-center">
            <img src={logo} alt="MRC" className="h-10" />
            <span className="ml-4 text-xl font-semibold">Book Your Remediation</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-6 w-6" />
                Booking Link Expired
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>This booking link has expired or is invalid.</p>
              <p>Booking links are valid for 30 days from the report date.</p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold mb-2">Please contact us to receive a new link:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>Phone: 1300 665 673</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Email: info@mrc.com.au</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (bookingStatus === "already-booked") {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground shadow-md py-4">
          <div className="container mx-auto px-4 flex items-center justify-center">
            <img src={logo} alt="MRC" className="h-10" />
            <span className="ml-4 text-xl font-semibold">Book Your Remediation</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <CheckCircle className="h-6 w-6" />
                Already Booked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>This job has already been booked!</p>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Booking Reference:</strong> MRC-JOB-2025-0042
                  </div>
                  <div>
                    <strong>Scheduled:</strong> Friday, 15 March 2025
                  </div>
                  <div>
                    <strong>Time:</strong> 8:00 AM - 4:00 PM
                  </div>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold mb-2">Need to reschedule?</p>
                <p className="text-sm">Contact: 1300 665 673</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Main booking flow
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md py-4">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <img src={logo} alt="MRC" className="h-10" />
          <span className="ml-4 text-xl font-semibold">Book Your Remediation</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl pb-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full font-semibold",
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              1
            </div>
            <div className={cn("h-1 w-12", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full font-semibold",
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              2
            </div>
            <div className={cn("h-1 w-12", step >= 3 ? "bg-primary" : "bg-muted")} />
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full font-semibold",
                step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              3
            </div>
            <div className={cn("h-1 w-12", step >= 4 ? "bg-primary" : "bg-muted")} />
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full font-semibold",
                step >= 4 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              ✓
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-2">
            <span>Select Date</span>
            <span>Select Time</span>
            <span>Confirm</span>
            <span>Done</span>
          </div>
        </div>

        {step < 4 && (
          <>
            {/* Inspection Summary */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Your Inspection Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Report Number</div>
                    <div className="font-semibold">{inspectionData.reportNumber}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Inspector</div>
                    <div className="font-semibold">{inspectionData.inspector}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Inspection Date</div>
                    <div className="font-semibold">{inspectionData.inspectionDate}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Property Address</div>
                    <div className="font-semibold">{inspectionData.propertyAddress}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Quote Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Job Duration</div>
                      <div className="font-semibold">{inspectionData.jobDuration}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Equipment Required</div>
                      <div className="font-semibold">{inspectionData.equipmentDuration}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Timeline</div>
                      <div className="font-semibold">{inspectionData.totalTimeline}</div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total Cost:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${inspectionData.totalCost.toFixed(2)} <span className="text-sm">(inc GST)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {inspectionData.pdfUrl && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(inspectionData.pdfUrl)}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Full Report
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Step 1: Select Date */}
            {step >= 1 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Step 1: Select Your Preferred Date
                  </CardTitle>
                  <CardDescription>
                    We operate Monday to Friday, 7am-7pm. Available dates are shown based on your suburb ({inspectionData.suburb} - Zone {inspectionData.zone})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // Minimum 2 days from today
                        const minDate = new Date(today);
                        minDate.setDate(today.getDate() + 2);
                        
                        if (date < minDate) return true;
                        
                        return !isDateAvailable(date);
                      }}
                      className="rounded-md border"
                    />
                  </div>

                  {selectedDate && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">Selected: {formatDate(selectedDate)}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                      <span>Available dates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-muted border border-border rounded opacity-50" />
                      <span>Unavailable dates</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Select Time */}
            {step >= 2 && selectedDate && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Step 2: Select Your Preferred Start Time
                  </CardTitle>
                  <CardDescription>{formatDate(selectedDate)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedTimeSlot} onValueChange={handleTimeSlotSelect}>
                    <div className="space-y-3">
                      {timeSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start gap-4 p-4 border rounded-lg transition-colors",
                            slot.available
                              ? "hover:bg-muted cursor-pointer"
                              : "opacity-50 cursor-not-allowed bg-muted/50",
                            selectedTimeSlot === `${slot.startTime}-${slot.endTime}` && "border-primary bg-primary/5"
                          )}
                        >
                          <RadioGroupItem
                            value={`${slot.startTime}-${slot.endTime}`}
                            disabled={!slot.available}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              {slot.recommended && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                            {slot.available ? (
                              <div className="text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span>Technician: {slot.technician}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-red-600">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <span>(Unavailable - {slot.reason})</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Confirm Details */}
            {step >= 3 && selectedDate && selectedTimeSlot && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Step 3: Confirm Your Booking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Booking Summary */}
                  <div>
                    <h4 className="font-semibold mb-3">Booking Summary</h4>
                    <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>Date: {formatDate(selectedDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Time: {selectedTimeSlot}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Technician:{" "}
                          {timeSlots.find((s) => `${s.startTime}-${s.endTime}` === selectedTimeSlot)?.technician}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Location: {inspectionData.propertyAddress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Total Cost: ${inspectionData.totalCost.toFixed(2)} (inc GST)</span>
                      </div>
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Payment: Due within 14 days of completion
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h4 className="font-semibold mb-3">Contact Information</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Name</Label>
                        <Input value={inspectionData.clientName} disabled />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input value={inspectionData.clientPhone} disabled />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input value={inspectionData.clientEmail} disabled />
                      </div>

                      <div>
                        <Label className="mb-2 block">Best contact method:</Label>
                        <RadioGroup value={contactMethod} onValueChange={(v) => setContactMethod(v as any)}>
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="phone" id="phone" />
                              <Label htmlFor="phone" className="cursor-pointer">
                                Phone
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="email" id="email" />
                              <Label htmlFor="email" className="cursor-pointer">
                                Email
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sms" id="sms" />
                              <Label htmlFor="sms" className="cursor-pointer">
                                SMS
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div>
                    <h4 className="font-semibold mb-3">Special Instructions (Optional)</h4>
                    <Textarea
                      placeholder='e.g., "Please call 30 mins before arrival"'
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Confirmations */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="details"
                        checked={confirmations.detailsCorrect}
                        onCheckedChange={(checked) =>
                          setConfirmations({ ...confirmations, detailsCorrect: checked as boolean })
                        }
                      />
                      <Label htmlFor="details" className="cursor-pointer leading-relaxed">
                        I confirm the details above are correct
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="authorize"
                        checked={confirmations.authorizeWork}
                        onCheckedChange={(checked) =>
                          setConfirmations({ ...confirmations, authorizeWork: checked as boolean })
                        }
                      />
                      <Label htmlFor="authorize" className="cursor-pointer leading-relaxed">
                        I authorize MRC to proceed with the work
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={confirmations.agreeTerms}
                        onCheckedChange={(checked) =>
                          setConfirmations({ ...confirmations, agreeTerms: checked as boolean })
                        }
                      />
                      <Label htmlFor="terms" className="cursor-pointer leading-relaxed">
                        I agree to the{" "}
                        <button className="text-primary underline hover:no-underline" onClick={() => {}}>
                          terms and conditions
                        </button>
                      </Label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleConfirmBooking} className="flex-1" size="lg">
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Confirm Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Step 4: Booking Confirmation */}
        {step === 4 && (
          <Card className="border-green-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-green-600">Booking Confirmed!</CardTitle>
              <CardDescription className="text-lg">
                Thank you, {inspectionData.clientName.split(" ")[0]}!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center">Your remediation work has been successfully scheduled.</p>

              {/* Booking Details */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Reference:</span>
                    <span className="font-mono font-semibold">{bookingReference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-semibold">{selectedTimeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Technician:</span>
                    <span className="font-semibold">
                      {timeSlots.find((s) => `${s.startTime}-${s.endTime}` === selectedTimeSlot)?.technician}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg">${inspectionData.totalCost.toFixed(2)} (inc GST)</span>
                  </div>
                </div>
              </div>

              {/* What Happens Next */}
              <div>
                <h4 className="font-semibold mb-3">What Happens Next?</h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                      1
                    </span>
                    <span>You'll receive a confirmation email with all details and our contact info</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                      2
                    </span>
                    <span>
                      {timeSlots.find((s) => `${s.startTime}-${s.endTime}` === selectedTimeSlot)?.technician} will call
                      you 1 day before to confirm arrival time
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                      3
                    </span>
                    <span>
                      On the day, the technician will arrive between{" "}
                      {selectedTimeSlot.split("-")[0].trim().replace("00", "45")} -{" "}
                      {selectedTimeSlot.split("-")[0].trim().replace("00", "15")}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                      4
                    </span>
                    <span>Work typically takes 1 full day, with equipment running for 3-5 days after</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                      5
                    </span>
                    <span>Invoice will be sent after completion</span>
                  </li>
                </ol>
              </div>

              {/* Contact Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-2">Need to Make Changes?</h4>
                <p className="text-sm mb-3">
                  Please have your booking reference ready: <span className="font-mono font-semibold">{bookingReference}</span>
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>Phone: 1300 665 673</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>Email: info@mrc.com.au</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Confirmation (PDF)
                </Button>
                <Button variant="outline" className="w-full">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Add to Calendar
                </Button>
                <Button variant="outline" className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Confirmation to Me
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
