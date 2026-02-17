import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, User, Loader2, Star, Check, MapPin, Clock, Info, AlertTriangle } from "lucide-react";
import { useBookingValidation, formatTimeDisplay, type DateRecommendation } from "@/hooks/useBookingValidation";
import { cn } from "@/lib/utils";
import { AddressAutocomplete, type AddressValue } from "@/components/booking";
import { sendEmail, sendSlackNotification, buildBookingConfirmationHtml } from "@/lib/api/notifications";
import { checkBookingConflict } from "@/lib/bookingService";

interface BookInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadNumber: string;
  customerName: string;
  propertyAddress: string;
  propertySuburb?: string;
}

interface UserType {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
}

// Fetch users for technician dropdown
const fetchUsers = async (): Promise<UserType[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.users.filter((u: UserType) => u.is_active);
};

// Time slots for the day (8 AM to 5 PM)
const ALL_TIME_SLOTS = [
  { time: "08:00", label: "8 AM", period: "morning" },
  { time: "09:00", label: "9 AM", period: "morning" },
  { time: "10:00", label: "10 AM", period: "morning" },
  { time: "11:00", label: "11 AM", period: "morning" },
  { time: "12:00", label: "12 PM", period: "afternoon" },
  { time: "13:00", label: "1 PM", period: "afternoon" },
  { time: "14:00", label: "2 PM", period: "afternoon" },
  { time: "15:00", label: "3 PM", period: "afternoon" },
  { time: "16:00", label: "4 PM", period: "afternoon" },
];

export function BookInspectionModal({
  open,
  onOpenChange,
  leadId,
  leadNumber,
  customerName,
  propertyAddress,
  propertySuburb,
}: BookInspectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [formData, setFormData] = useState({
    inspectionDate: "",
    inspectionTime: "",
    assignedTo: "",
    notes: "",
  });
  const [recommendations, setRecommendations] = useState<DateRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [manualStartAddress, setManualStartAddress] = useState<AddressValue | undefined>(undefined);
  const [hasMissingAddressWarning, setHasMissingAddressWarning] = useState(false);

  const queryClient = useQueryClient();
  const { getRecommendedDates, checkAvailability, isLoading: validationLoading, result: validationResult } = useBookingValidation();

  // Fetch users for technician dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['manage-users'],
    queryFn: fetchUsers,
    enabled: open,
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setDurationMinutes(60);
      setFormData({
        inspectionDate: "",
        inspectionTime: "",
        assignedTo: "",
        notes: "",
      });
      setRecommendations([]);
      setAvailableSlots([]);
      setShowManualDatePicker(false);
      setManualStartAddress(undefined);
      setHasMissingAddressWarning(false);
    }
  }, [open]);

  // Fetch recommendations when technician is selected
  useEffect(() => {
    if (formData.assignedTo && open) {
      fetchRecommendations();
    }
  }, [formData.assignedTo]);

  // Extract suburb from address if not provided
  const getSuburb = (): string => {
    if (propertySuburb) return propertySuburb;
    const parts = propertyAddress.split(',');
    if (parts.length >= 2) {
      return parts[1].trim();
    }
    return '';
  };

  // Fetch date recommendations
  const fetchRecommendations = async () => {
    if (!formData.assignedTo) return;

    setIsLoadingRecommendations(true);
    try {
      const result = await getRecommendedDates({
        technicianId: formData.assignedTo,
        destinationAddress: propertyAddress,
        destinationSuburb: getSuburb(),
        daysAhead: 7,
        durationMinutes,
      });

      if (result?.recommendations) {
        setRecommendations(result.recommendations);
        // Check if any day has missing address warning
        setHasMissingAddressWarning(result.has_missing_address_warning || false);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Handle date selection from recommendations
  const handleRecommendedDateSelect = (rec: DateRecommendation) => {
    setFormData(prev => ({ ...prev, inspectionDate: rec.date, inspectionTime: "" }));
    setAvailableSlots(rec.available_slots);
    setShowManualDatePicker(false);
  };

  // Handle manual date change
  const handleManualDateChange = async (dateValue: string) => {
    setFormData(prev => ({ ...prev, inspectionDate: dateValue, inspectionTime: "" }));

    // Find if this date is in recommendations
    const rec = recommendations.find(r => r.date === dateValue);
    if (rec) {
      setAvailableSlots(rec.available_slots);
    } else {
      // Default all slots available for manual dates
      setAvailableSlots(ALL_TIME_SLOTS.map(s => s.time));
    }
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setFormData(prev => ({ ...prev, inspectionTime: time }));

    // Validate the time slot if technician is selected
    if (formData.assignedTo && formData.inspectionDate) {
      checkAvailability({
        technicianId: formData.assignedTo,
        date: new Date(formData.inspectionDate + 'T00:00:00'),
        requestedTime: time,
        destinationAddress: `${propertyAddress}, ${getSuburb()}, VIC, Australia`,
        overrideStartAddress: manualStartAddress?.fullAddress,
      });
    }
  };

  // Recalculate with manual start address
  const handleRecalculateWithManualAddress = () => {
    if (!manualStartAddress?.fullAddress || !formData.inspectionTime) return;

    checkAvailability({
      technicianId: formData.assignedTo,
      date: new Date(formData.inspectionDate + 'T00:00:00'),
      requestedTime: formData.inspectionTime,
      destinationAddress: `${propertyAddress}, ${getSuburb()}, VIC, Australia`,
      overrideStartAddress: manualStartAddress.fullAddress,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.inspectionDate}T${formData.inspectionTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      // Check for booking conflicts before inserting
      if (formData.assignedTo) {
        const { hasConflict, conflictDetails } = await checkBookingConflict(
          formData.assignedTo,
          startDateTime,
          endDateTime
        );
        if (hasConflict) {
          toast.error(`Technician already booked at this time. ${conflictDetails}`);
          setLoading(false);
          return;
        }
      }

      // Create calendar event
      const { error: calendarError } = await supabase
        .from("calendar_bookings")
        .insert({
          lead_id: leadId,
          event_type: "inspection",
          title: `Inspection - ${customerName}`,
          start_datetime: startDateTime.toISOString(),
          end_datetime: endDateTime.toISOString(),
          location_address: propertyAddress,
          assigned_to: formData.assignedTo || null,
          status: "scheduled",
          description: formData.notes || null,
        });

      if (calendarError) throw calendarError;

      // Update lead with status, inspection date, time, and assigned_to
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          status: "inspection_waiting",
          inspection_scheduled_date: formData.inspectionDate,
          scheduled_time: formData.inspectionTime,
          assigned_to: formData.assignedTo || null,
        })
        .eq("id", leadId);

      if (leadError) throw leadError;

      // Create activity log
      const techName = selectedTechnician?.full_name || selectedTechnician?.first_name || 'technician';
      await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "inspection_booked",
        title: "Inspection Booked",
        description: `Scheduled to ${techName} for ${formData.inspectionDate} at ${formData.inspectionTime}`,
      });

      toast.success("Inspection booked successfully!");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["unscheduled-leads"] });

      // Fire-and-forget notifications
      const displayDate = new Date(formData.inspectionDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const displayTime = formatTimeDisplay(formData.inspectionTime);

      // Slack: inspection_booked
      sendSlackNotification({
        event: 'inspection_booked',
        leadId,
        leadName: customerName,
        propertyAddress,
        technicianName: techName,
        bookingDate: `${displayDate} at ${displayTime}`,
      });

      // Email booking confirmation to customer (fetch email from lead)
      supabase
        .from('leads')
        .select('email')
        .eq('id', leadId)
        .single()
        .then(({ data: leadData }) => {
          if (leadData?.email) {
            sendEmail({
              to: leadData.email,
              subject: `Inspection Booking Confirmed — ${displayDate}`,
              html: buildBookingConfirmationHtml({
                customerName,
                date: displayDate,
                time: displayTime,
                address: propertyAddress,
                technicianName: techName || undefined,
              }),
              leadId,
              templateName: 'booking-confirmation',
            });
          }
        });

      onOpenChange(false);
    } catch (error) {
      console.error("Error booking inspection:", error);
      toast.error("Failed to book inspection");
    } finally {
      setLoading(false);
    }
  };

  // Determine if we can book
  const canBook = formData.inspectionDate && formData.inspectionTime;

  // Get selected technician name
  const selectedTechnician = users.find(u => u.id === formData.assignedTo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Inspection - {leadNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lead Info */}
          <div className="space-y-1.5 pb-3 border-b">
            <p className="text-sm text-muted-foreground">
              <strong>Customer:</strong> {customerName}
            </p>
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              {propertyAddress}
            </p>
          </div>

          {/* Step 1: Technician Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">
              <span className="flex items-center gap-1.5">
                <User size={14} />
                Assign Technician <span className="text-destructive">*</span>
              </span>
            </Label>
            {usersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" />
                Loading users...
              </div>
            ) : (
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value, inspectionDate: "", inspectionTime: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select technician..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Step 2: Date Selection - Only show after technician selected */}
          {formData.assignedTo && (
            <div className="space-y-3">
              <Label>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  Inspection Date <span className="text-destructive">*</span>
                </span>
              </Label>

              {/* Recommended Dates */}
              {isLoadingRecommendations ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 size={14} className="animate-spin" />
                  Finding best dates for {getSuburb() || 'this location'}...
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Recommended for {getSuburb() || 'this location'}:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {recommendations.slice(0, 3).map((rec) => (
                      <button
                        key={rec.date}
                        type="button"
                        onClick={() => handleRecommendedDateSelect(rec)}
                        className={cn(
                          "relative p-3 rounded-lg border-2 text-left transition-all",
                          formData.inspectionDate === rec.date
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                        )}
                      >
                        {rec.rating === 'best' && (
                          <div className="absolute -top-2 -right-2">
                            <span className="flex items-center gap-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              <Star size={10} fill="currentColor" />
                              BEST
                            </span>
                          </div>
                        )}
                        {rec.needs_manual_address && (
                          <div className="absolute -top-2 -right-2">
                            <span className="flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-amber-300">
                              <AlertTriangle size={10} />
                              ?
                            </span>
                          </div>
                        )}
                        <div className="font-semibold text-sm">
                          {rec.day_name} {rec.display_date}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {rec.reason}
                        </div>
                        {formData.inspectionDate === rec.date && (
                          <Check size={16} className="absolute bottom-2 right-2 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                  {hasMissingAddressWarning && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Dates marked with ? have unknown travel time - you'll need to enter a starting address.
                    </p>
                  )}
                </div>
              ) : null}

              {/* Manual Date Picker */}
              <div className="pt-2">
                {!showManualDatePicker && recommendations.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowManualDatePicker(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Customer prefers a specific date? Pick any date
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {recommendations.length > 0 ? 'Or pick any date:' : 'Select a date:'}
                    </p>
                    <Input
                      type="date"
                      value={formData.inspectionDate}
                      onChange={(e) => handleManualDateChange(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="max-w-[200px]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Time Selection - Only show after date selected */}
          {formData.inspectionDate && (
            <div className="space-y-3">
              <Label>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  Inspection Time <span className="text-destructive">*</span>
                </span>
              </Label>

              {/* Morning Slots */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Morning</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_TIME_SLOTS.filter(s => s.period === 'morning').map((slot) => {
                    const isAvailable = availableSlots.includes(slot.time);
                    const isSelected = formData.inspectionTime === slot.time;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleTimeSelect(slot.time)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[60px]",
                          isSelected
                            ? "bg-blue-600 text-white"
                            : isAvailable
                              ? "bg-gray-100 hover:bg-blue-100 hover:text-blue-700"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                        )}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Afternoon Slots */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Afternoon</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_TIME_SLOTS.filter(s => s.period === 'afternoon').map((slot) => {
                    const isAvailable = availableSlots.includes(slot.time);
                    const isSelected = formData.inspectionTime === slot.time;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleTimeSelect(slot.time)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[60px]",
                          isSelected
                            ? "bg-blue-600 text-white"
                            : isAvailable
                              ? "bg-gray-100 hover:bg-blue-100 hover:text-blue-700"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                        )}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Validation Result */}
              {validationLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Checking availability...
                </div>
              )}

              {/* Missing Starting Address Warning */}
              {validationResult?.error === 'no_starting_address' && (
                <div className="rounded-lg p-4 bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">
                        Cannot calculate travel time
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        {validationResult.message || `${validationResult.technician_name}'s starting address is not set.`}
                      </p>
                      <p className="text-sm text-amber-600 mt-2">
                        Enter a starting location for this booking:
                      </p>

                      <div className="mt-3">
                        <AddressAutocomplete
                          label=""
                          placeholder="Enter starting address..."
                          value={manualStartAddress}
                          onChange={(address) => setManualStartAddress(address)}
                        />
                      </div>

                      {manualStartAddress?.fullAddress && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={handleRecalculateWithManualAddress}
                          disabled={validationLoading}
                        >
                          {validationLoading ? (
                            <>
                              <Loader2 size={14} className="animate-spin mr-2" />
                              Calculating...
                            </>
                          ) : (
                            'Recalculate with this address'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Normal Validation Result (when no error) */}
              {validationResult && !validationResult.error && formData.inspectionTime && (
                <div className={cn(
                  "rounded-lg p-3 text-sm",
                  validationResult.requested_time_works
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-amber-50 border border-amber-200 text-amber-800"
                )}>
                  {validationResult.requested_time_works ? (
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      <span>
                        {formatTimeDisplay(formData.inspectionTime)} works!
                        {validationResult.buffer_minutes > 0 && (
                          <span className="text-green-600 ml-1">
                            ({validationResult.buffer_minutes} min buffer)
                          </span>
                        )}
                        {validationResult.used_override_address && (
                          <span className="text-blue-600 ml-1">
                            (using manual starting address)
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p>{formatTimeDisplay(formData.inspectionTime)} may be tight - earliest arrival: {formatTimeDisplay(validationResult.earliest_start)}</p>
                      {validationResult.suggestions.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs">Try:</span>
                          {validationResult.suggestions.map(time => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleTimeSelect(time)}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs hover:bg-amber-100"
                            >
                              {formatTimeDisplay(time)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                Est. Duration
              </span>
            </Label>
            <Select
              value={String(durationMinutes)}
              onValueChange={(value) => {
                const newDuration = Number(value);
                setDurationMinutes(newDuration);
                // Re-fetch recommendations with new duration
                if (formData.assignedTo) {
                  setFormData(prev => ({ ...prev, inspectionDate: "", inspectionTime: "" }));
                  setRecommendations([]);
                  setAvailableSlots([]);
                  setIsLoadingRecommendations(true);
                  getRecommendedDates({
                    technicianId: formData.assignedTo,
                    destinationAddress: propertyAddress,
                    destinationSuburb: getSuburb(),
                    daysAhead: 7,
                    durationMinutes: newDuration,
                  })
                    .then((result) => {
                      if (result?.recommendations) {
                        setRecommendations(result.recommendations);
                        setHasMissingAddressWarning(result.has_missing_address_warning || false);
                      }
                    })
                    .catch(() => {})
                    .finally(() => setIsLoadingRecommendations(false));
                }
              }}
            >
              <SelectTrigger className="max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="150">2.5 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes from Call</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes from the phone call..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !canBook}
              className="flex-1"
            >
              {loading ? "Booking..." : "Book Inspection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
