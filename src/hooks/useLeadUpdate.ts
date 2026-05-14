import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculatePropertyZone, cleanPhoneNumber } from "@/lib/leadUtils";
import { sendSlackNotification } from "@/lib/api/notifications";
import { captureBusinessError } from "@/lib/sentry";
import {
  logFieldEdits,
  logNoteAdded,
  diffPayload,
  type FieldChange,
} from "@/lib/api/fieldEditLog";
import { getFieldLabel } from "@/lib/utils/fieldLabels";
import { useAuth } from "@/contexts/AuthContext";

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
  issue_description?: string | null;
  internal_notes?: string | null;
  access_instructions?: string | null;
  special_requests?: string | null;
  inspection_scheduled_date?: string | null;
  scheduled_time?: string | null;
}

export function useLeadUpdate(leadId: string) {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateLead = async (
    payload: LeadUpdatePayload,
    originalLead: Record<string, unknown>,
  ) => {
    setIsUpdating(true);
    try {
      const updates: Record<string, unknown> = { ...payload };

      // Recalculate property_zone if suburb changed.
      if (
        payload.property_address_suburb &&
        payload.property_address_suburb !== originalLead.property_address_suburb
      ) {
        updates.property_zone = calculatePropertyZone(
          payload.property_address_suburb,
        );
      }

      // Clean phone if changed.
      if (payload.phone && payload.phone !== originalLead.phone) {
        updates.phone = cleanPhoneNumber(payload.phone);
      }

      // Only the columns the caller explicitly changed should diff. property_zone
      // is a derived column — handled by buildDiffChanges below so a suburb edit
      // also surfaces the zone re-mapping in the activity row.
      const diffChanges = buildDiffChanges(payload, updates, originalLead);

      if (diffChanges.length === 0) {
        toast.info("No changes to save");
        return true;
      }

      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", leadId);

      if (error) throw error;

      // internal_notes is an append-only log — split it out from the diff so
      // the activity timeline gets a "Note added" entry instead of a giant
      // diff that's unreadable on a 30-line append.
      const noteChange = diffChanges.find((c) => c.field === "internal_notes");
      const fieldChanges = diffChanges.filter(
        (c) => c.field !== "internal_notes",
      );

      if (noteChange) {
        const appendedNote = extractAppendedNoteText(
          (originalLead.internal_notes as string | null) ?? null,
          (payload.internal_notes as string | null) ?? null,
        );
        const authorName =
          profile?.full_name?.trim() ||
          user?.email ||
          "Unknown user";
        await logNoteAdded({
          leadId,
          noteText: appendedNote,
          authorName,
        });
      }

      if (fieldChanges.length > 0) {
        await logFieldEdits({
          leadId,
          entityType: "lead",
          entityId: leadId,
          changes: fieldChanges,
        });

        // Preserve the existing Slack ping for non-internal-notes field changes.
        const labelSummary = fieldChanges
          .map((c) => getFieldLabel(c.field))
          .join(", ");
        sendSlackNotification({
          event: "lead_updated",
          leadId,
          leadName:
            (payload.full_name || String(originalLead.full_name)) || "Unknown",
          changedFields: labelSummary,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["activity-timeline"] });
      toast.success("Lead updated successfully");
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update lead";
      captureBusinessError("Lead update failed", { leadId, error: message });
      toast.error(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateLead, isUpdating };
}

// Build the diff using the post-transform `updates` (so derived columns like
// property_zone are captured) but only for keys the caller actually touched.
function buildDiffChanges(
  payload: LeadUpdatePayload,
  updates: Record<string, unknown>,
  originalLead: Record<string, unknown>,
): FieldChange[] {
  const touchedKeys = new Set<string>([
    ...Object.keys(payload),
    // include derived keys only if their value actually changed
    ...Object.keys(updates).filter((k) => updates[k] !== originalLead[k]),
  ]);
  const partialNew: Record<string, unknown> = {};
  for (const k of touchedKeys) partialNew[k] = updates[k];
  return diffPayload(originalLead, partialNew);
}

// internal_notes uses appendInternalNote() which prepends "[ts] note\n— author\n\n---\n\n"
// to the existing log. Extract just the appended entry by stripping the previous
// log tail so the "Note added" activity row carries the new entry only.
function extractAppendedNoteText(
  prev: string | null,
  next: string | null,
): string {
  if (!next) return "";
  if (!prev || prev.trim().length === 0) return next;
  if (!next.startsWith(prev)) {
    const separatorIdx = next.indexOf(`\n\n---\n\n${prev}`);
    if (separatorIdx > 0) return next.slice(0, separatorIdx);
    return next;
  }
  return next.slice(prev.length);
}
