import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

interface BookInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadNumber: string;
  customerName: string;
  propertyAddress: string;
}

export function BookInspectionModal({
  open,
  onOpenChange,
  leadId,
  leadNumber,
  customerName,
  propertyAddress,
}: BookInspectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    inspectionDate: "",
    inspectionTime: "09:00",
    assignedTo: "",
    notes: "",
    sendSMS: true,
  });

  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time - Fixed 1 hour duration (system) but tell customer 45 mins
      const startDateTime = new Date(`${formData.inspectionDate}T${formData.inspectionTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Always 1 hour

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

      // Update lead status to "contacted"
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          status: "contacted",
          inspection_scheduled_date: formData.inspectionDate,
        })
        .eq("id", leadId);

      if (leadError) throw leadError;

      // Create activity log
      await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "inspection_booked",
        title: "Inspection Booked",
        description: `Inspection scheduled for ${formData.inspectionDate} at ${formData.inspectionTime}`,
      });

      toast.success("Inspection booked successfully!");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error booking inspection:", error);
      toast.error("Failed to book inspection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Inspection - {leadNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Customer:</strong> {customerName}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Property:</strong> {propertyAddress}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspectionDate">
              Inspection Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inspectionDate"
              type="date"
              required
              value={formData.inspectionDate}
              onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspectionTime">
              Inspection Time <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.inspectionTime}
              onValueChange={(value) => setFormData({ ...formData, inspectionTime: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="07:00">07:00 AM</SelectItem>
                <SelectItem value="08:00">08:00 AM</SelectItem>
                <SelectItem value="09:00">09:00 AM</SelectItem>
                <SelectItem value="10:00">10:00 AM</SelectItem>
                <SelectItem value="11:00">11:00 AM</SelectItem>
                <SelectItem value="12:00">12:00 PM</SelectItem>
                <SelectItem value="13:00">01:00 PM</SelectItem>
                <SelectItem value="14:00">02:00 PM</SelectItem>
                <SelectItem value="15:00">03:00 PM</SelectItem>
                <SelectItem value="16:00">04:00 PM</SelectItem>
                <SelectItem value="17:00">05:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="bg-muted/50 p-3 rounded-md border">
              <p className="text-sm text-muted-foreground">
                ℹ️ <strong>Duration:</strong> 1 hour (system booking)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                💬 Customer told: Approximately 45 minutes
              </p>
            </div>
          </div>

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

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Booking..." : "Book Inspection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
