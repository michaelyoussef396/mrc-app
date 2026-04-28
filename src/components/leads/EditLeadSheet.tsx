import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  formatPhoneNumber,
  leadSourceOptions,
  propertyTypeOptions,
  urgencyOptions,
  stateOptions,
} from "@/lib/leadUtils";
import { useLeadUpdate } from "@/hooks/useLeadUpdate";
import { logFieldEdits, diffRows } from "@/lib/api/fieldEditLog";
import { appendInternalNote } from "@/lib/utils/internalNotes";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

// DB column → human label for the field_edit activity log.
// Only fields actually editable in this sheet are listed.
// internal_notes is intentionally absent — it is append-only via the
// dedicated "Add internal note" input (logged separately as a note_added
// activity) so a normal field-edit diff would mis-represent the change.
const LEAD_FIELD_MAP: Partial<Record<keyof Lead, string>> = {
  full_name: "Name",
  phone: "Phone",
  email: "Email",
  property_address_street: "Street",
  property_address_suburb: "Suburb",
  property_address_state: "State",
  property_address_postcode: "Postcode",
  property_type: "Property Type",
  lead_source: "Lead Source",
  lead_source_other: "Lead Source (Other)",
  urgency: "Urgency",
  issue_description: "Issue Description",
  notes: "General Notes",
  access_instructions: "Access Instructions",
  special_requests: "Special Requests",
};

const editFormSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  property_address_street: z.string().optional(),
  property_address_suburb: z.string().optional(),
  property_address_state: z.string().default("VIC"),
  property_address_postcode: z.string().optional(),
  property_type: z.string().optional(),
  lead_source: z.string().optional(),
  lead_source_other: z.string().optional(),
  urgency: z.string().optional(),
  issue_description: z.string().max(1000).optional(),
  // append-only: this is a NEW entry to add to the internal_notes log,
  // not the entire field. Empty string = no change to the existing log.
  add_internal_note: z.string().optional(),
  notes: z.string().optional(),
  access_instructions: z.string().optional(),
  special_requests: z.string().optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

interface EditLeadSheetProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLeadSheet({ lead, open, onOpenChange }: EditLeadSheetProps) {
  const { updateLead, isUpdating } = useLeadUpdate(lead.id);
  const { profile, user } = useAuth();
  const authorName = profile?.full_name?.trim() || user?.email || "Unknown user";
  const initialLeadRef = useRef<Lead | null>(null);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: getDefaults(lead),
  });

  // Reset form when lead changes or sheet opens
  useEffect(() => {
    if (open) {
      form.reset(getDefaults(lead));
      initialLeadRef.current = lead;
    } else {
      initialLeadRef.current = null;
    }
  }, [lead.id, open]);

  const watchLeadSource = form.watch("lead_source");

  const onSubmit = async (values: EditFormValues) => {
    // Pull the synthetic add_internal_note out of the form values — it's
    // never written to the leads row directly. If non-empty, it gets
    // appended to lead.internal_notes via the helper.
    const { add_internal_note, ...directFields } = values;

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(directFields)) {
      payload[key] = value === "" ? null : value;
    }

    const trimmedNote = add_internal_note?.trim() ?? "";
    if (trimmedNote) {
      payload.internal_notes = appendInternalNote(
        lead.internal_notes ?? null,
        trimmedNote,
        { authorName },
      );
    }

    const success = await updateLead(
      payload as Parameters<typeof updateLead>[0],
      lead as unknown as Record<string, unknown>,
    );
    if (success) {
      const changes = diffRows(
        initialLeadRef.current as unknown as Record<string, unknown> | null,
        payload,
        LEAD_FIELD_MAP as Partial<Record<string, string>>,
      );
      // The internal_notes column is excluded from LEAD_FIELD_MAP so it
      // does not surface as a "field overwrite" in the activity log; the
      // append is recorded as a dedicated entry that captures only the new
      // text rather than misrepresenting it as a column-wide diff.
      if (trimmedNote) {
        changes.push({
          field: "Internal Note Added",
          old: null,
          new: trimmedNote,
        });
      }
      await logFieldEdits({
        leadId: lead.id,
        entityType: "lead",
        entityId: lead.id,
        changes,
      });
      onOpenChange(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setValue("phone", formatted);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] rounded-t-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b flex-shrink-0">
          <SheetTitle>Edit Lead</SheetTitle>
          <SheetDescription>
            {lead.lead_number ? `#${lead.lead_number}` : lead.full_name}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* CONTACT */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Smith" className="h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="e.g., john@email.com" className="h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="e.g., 0412 345 678"
                          className="h-12"
                          {...field}
                          onChange={handlePhoneChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* PROPERTY */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Property Information</h3>

                <FormField
                  control={form.control}
                  name="property_address_street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 45 High Street" className="h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="property_address_suburb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suburb</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Croydon" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="property_address_state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stateOptions.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="property_address_postcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postcode</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 3136" maxLength={4} className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="property_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select property type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {propertyTypeOptions.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* LEAD INFO */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Lead Details</h3>

                <FormField
                  control={form.control}
                  name="lead_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select lead source..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {leadSourceOptions.map((source, index) => (
                            <SelectItem
                              key={index}
                              value={source.value}
                              disabled={source.disabled}
                            >
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchLeadSource === "Other" && (
                  <FormField
                    control={form.control}
                    name="lead_source_other"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Source</FormLabel>
                        <FormControl>
                          <Input placeholder="Specify lead source..." className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select urgency..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {urgencyOptions.map((urgency) => (
                            <SelectItem key={urgency.value} value={urgency.value}>
                              {urgency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issue_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the mould issue, affected areas, visible symptoms, etc."
                          className="min-h-[100px]"
                          maxLength={1000}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        {field.value?.length || 0}/1000 characters
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* NOTES */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Notes</h3>

                {/* Internal Notes — append-only log. Existing entries shown
                    read-only above; the textarea adds a new dated entry. */}
                <div className="space-y-2">
                  <FormLabel>Internal Notes</FormLabel>
                  {lead.internal_notes ? (
                    <div className="rounded-md border bg-slate-50 p-3 max-h-48 overflow-y-auto">
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {lead.internal_notes}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed bg-slate-50/50 p-3">
                      <p className="text-sm italic text-muted-foreground">
                        No internal notes yet.
                      </p>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="add_internal_note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-normal text-muted-foreground">
                          Add internal note
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="New entry — saved with timestamp and your name..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="General notes..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="access_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Gate code 1234, enter via back door..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="special_requests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 border-t px-5 py-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-12" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function getDefaults(lead: Lead): EditFormValues {
  return {
    full_name: lead.full_name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    property_address_street: lead.property_address_street ?? "",
    property_address_suburb: lead.property_address_suburb ?? "",
    property_address_state: lead.property_address_state ?? "VIC",
    property_address_postcode: lead.property_address_postcode ?? "",
    property_type: lead.property_type ?? "",
    lead_source: lead.lead_source ?? "",
    lead_source_other: lead.lead_source_other ?? "",
    urgency: lead.urgency ?? "",
    issue_description: lead.issue_description ?? "",
    add_internal_note: "",
    notes: lead.notes ?? "",
    access_instructions: lead.access_instructions ?? "",
    special_requests: lead.special_requests ?? "",
  };
}
