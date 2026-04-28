import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete, type AddressValue } from "@/components/booking/AddressAutocomplete";

export interface AddressFields {
  property_address_street: string | null;
  property_address_suburb: string | null;
  property_address_state: string | null;
  property_address_postcode: string | null;
  property_lat: number | null;
  property_lng: number | null;
}

interface InlineEditAddressProps {
  /** Current address fields from the lead row. */
  current: AddressFields;
  /** Save callback. Returns true on success. */
  onSave: (next: AddressFields) => Promise<boolean>;
  /** Optional label override. */
  triggerLabel?: string;
}

/**
 * Slide-up sheet (mobile) / side-panel (desktop) for editing property address
 * via Google Places autocomplete. Edits all four address columns + lat/lng
 * atomically — no partial-update path. Triggered by a pencil button.
 *
 * Why a sheet instead of full inline-edit per-column:
 *   - AddressAutocomplete dropdown crowds the read-only column at 375px
 *   - Lat/lng must stay in sync with street/suburb/postcode — splitting
 *     edits per column risks stale geocoding
 */
export function InlineEditAddress({
  current,
  onSave,
  triggerLabel = "Edit address",
}: InlineEditAddressProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AddressValue | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const initialValue: AddressValue = {
    street: current.property_address_street ?? "",
    suburb: current.property_address_suburb ?? "",
    state: current.property_address_state ?? "VIC",
    postcode: current.property_address_postcode ?? "",
    fullAddress: [
      current.property_address_street,
      current.property_address_suburb,
      current.property_address_state,
      current.property_address_postcode,
    ]
      .filter(Boolean)
      .join(", "),
    lat: current.property_lat ?? undefined,
    lng: current.property_lng ?? undefined,
  };

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(initialValue);
    else setDraft(undefined);
    setOpen(next);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const success = await onSave({
      property_address_street: draft.street || null,
      property_address_suburb: draft.suburb || null,
      property_address_state: draft.state || null,
      property_address_postcode: draft.postcode || null,
      property_lat: draft.lat ?? null,
      property_lng: draft.lng ?? null,
    });
    setSaving(false);
    if (success) setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        className="h-12 w-12 flex items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors flex-shrink-0"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] rounded-t-2xl flex flex-col"
        >
          <SheetHeader>
            <SheetTitle>Edit Property Address</SheetTitle>
            <SheetDescription>
              Search to update street, suburb, state, postcode and map
              coordinates in one save.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <AddressAutocomplete
              label="Property Address"
              placeholder="Start typing an address..."
              value={draft}
              onChange={(addr) => setDraft(addr)}
              disabled={saving}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 h-12"
              onClick={handleSave}
              disabled={saving || !draft || !draft.street}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Address
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
