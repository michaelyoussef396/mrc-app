import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculatePropertyZone, cleanPhoneNumber } from "@/lib/leadUtils";
import { sendSlackNotification } from "@/lib/api/notifications";

interface LeadUpdatePayload {
  full_name?: string;
  email?: string;
  phone?: string;
  property_address_street?: string;
  property_address_suburb?: string;
  property_address_state?: string;
  property_address_postcode?: string;
  property_lat?: number | null;
  property_lng?: number | null;
  property_type?: string | null;
  lead_source?: string | null;
  lead_source_other?: string | null;
  urgency?: string | null;
  issue_description?: string | null;
  internal_notes?: string | null;
  notes?: string | null;
  access_instructions?: string | null;
  special_requests?: string | null;
  inspection_scheduled_date?: string | null;
  scheduled_time?: string | null;
}

export function useLeadUpdate(leadId: string) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateLead = async (payload: LeadUpdatePayload, originalLead: Record<string, unknown>) => {
    setIsUpdating(true);
    try {
      const updates: Record<string, unknown> = { ...payload };

      // Recalculate property_zone if suburb changed
      if (
        payload.property_address_suburb &&
        payload.property_address_suburb !== originalLead.property_address_suburb
      ) {
        updates.property_zone = calculatePropertyZone(payload.property_address_suburb);
      }

      // Clean phone if changed
      if (payload.phone && payload.phone !== originalLead.phone) {
        updates.phone = cleanPhoneNumber(payload.phone);
      }

      // Build list of changed field names for activity log
      const changedFields = Object.keys(payload).filter((key) => {
        const k = key as keyof LeadUpdatePayload;
        return payload[k] !== originalLead[k];
      });

      if (changedFields.length === 0) {
        toast.info("No changes to save");
        return true;
      }

      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", leadId);

      if (error) throw error;

      // Insert activity log
      const { data: { user } } = await supabase.auth.getUser();
      const fieldLabels = changedFields.map((f) => f.replace(/_/g, " ")).join(", ");

      await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "lead_updated",
        title: "Lead Details Updated",
        description: `Updated: ${fieldLabels}`,
        user_id: user?.id ?? null,
        metadata: {
          changes: changedFields.map((field) => ({
            field,
            from: originalLead[field] ?? null,
            to: payload[field as keyof LeadUpdatePayload] ?? null,
          })),
        },
      });

      sendSlackNotification({
        event: 'lead_updated',
        leadId,
        leadName: (payload.full_name || String(originalLead.full_name)) || 'Unknown',
        changedFields: fieldLabels,
      });

      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated successfully");
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update lead";
      toast.error(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateLead, isUpdating };
}
