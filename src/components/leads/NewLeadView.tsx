import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Globe,
  Archive,
  ExternalLink,
  StickyNote,
  CheckCircle2,
  User,
  ClipboardList,
  Edit,
  X,
  Save,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BookInspectionModal } from "@/components/leads/BookInspectionModal";
import { EditLeadSheet } from "@/components/leads/EditLeadSheet";
import { useLeadUpdate } from "@/hooks/useLeadUpdate";
import { leadSourceOptions } from "@/lib/leadUtils";
import { AddressAutocomplete, type AddressValue } from "@/components/booking/AddressAutocomplete";
import type { LeadStatus } from "@/lib/statusFlow";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface NewLeadViewProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => Promise<void>;
  onRefetch: () => void;
  technicianName?: string;
}

export function NewLeadView({ lead, onStatusChange, onRefetch, technicianName }: NewLeadViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Inline edit mode
  const [isEditing, setIsEditing] = useState(false);
  const { updateLead, isUpdating } = useLeadUpdate(lead.id);
  const [editName, setEditName] = useState(lead.full_name || "");
  const [editPhone, setEditPhone] = useState(lead.phone || "");
  const [editEmail, setEditEmail] = useState(lead.email || "");
  const [editDescription, setEditDescription] = useState(lead.issue_description || "");
  const [editLeadSource, setEditLeadSource] = useState(lead.lead_source || "");
  const [editPreferredDate, setEditPreferredDate] = useState(lead.inspection_scheduled_date || "");
  const [editPreferredTime, setEditPreferredTime] = useState(lead.scheduled_time || "");
  const [editInternalNotes, setEditInternalNotes] = useState(lead.internal_notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(lead.internal_notes || "");
  const [editAddress, setEditAddress] = useState<AddressValue>({
    street: lead.property_address_street || "",
    suburb: lead.property_address_suburb || "",
    state: lead.property_address_state || "",
    postcode: lead.property_address_postcode || "",
    fullAddress: [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(", "),
    lat: lead.property_lat ?? undefined,
    lng: lead.property_lng ?? undefined,
  });

  // Sync notesValue when lead data refreshes (e.g. after save)
  useEffect(() => {
    setNotesValue(lead.internal_notes || "");
  }, [lead.internal_notes]);

  const resetEditState = () => {
    setEditName(lead.full_name || "");
    setEditPhone(lead.phone || "");
    setEditEmail(lead.email || "");
    setEditDescription(lead.issue_description || "");
    setEditLeadSource(lead.lead_source || "");
    setEditPreferredDate(lead.inspection_scheduled_date || "");
    setEditPreferredTime(lead.scheduled_time || "");
    setEditInternalNotes(lead.internal_notes || "");
    setEditAddress({
      street: lead.property_address_street || "",
      suburb: lead.property_address_suburb || "",
      state: lead.property_address_state || "",
      postcode: lead.property_address_postcode || "",
      fullAddress: [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(", "),
      lat: lead.property_lat ?? undefined,
      lng: lead.property_lng ?? undefined,
    });
    setIsEditing(false);
  };

  // Standalone save for internal notes (no edit mode needed)
  const handleSaveNotes = async () => {
    if (notesValue === (lead.internal_notes || "")) return;
    setIsSavingNotes(true);
    const original = { internal_notes: lead.internal_notes };
    const payload = { internal_notes: notesValue || null };
    const success = await updateLead(payload, original);
    if (success) onRefetch();
    setIsSavingNotes(false);
  };

  const handleSaveInline = async () => {
    const payload: Record<string, string | number | null> = {};
    const original: Record<string, unknown> = {
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      issue_description: lead.issue_description,
      lead_source: lead.lead_source,
      inspection_scheduled_date: lead.inspection_scheduled_date,
      scheduled_time: lead.scheduled_time,
      internal_notes: lead.internal_notes,
      property_address_street: lead.property_address_street,
      property_address_suburb: lead.property_address_suburb,
      property_address_state: lead.property_address_state,
      property_address_postcode: lead.property_address_postcode,
      property_lat: lead.property_lat,
      property_lng: lead.property_lng,
    };

    if (editName !== (lead.full_name || "")) payload.full_name = editName;
    if (editPhone !== (lead.phone || "")) payload.phone = editPhone;
    if (editEmail !== (lead.email || "")) payload.email = editEmail;
    if (editDescription !== (lead.issue_description || "")) payload.issue_description = editDescription || null;
    if (editLeadSource !== (lead.lead_source || "")) payload.lead_source = editLeadSource || null;
    if (editPreferredDate !== (lead.inspection_scheduled_date || "")) payload.inspection_scheduled_date = editPreferredDate || null;
    if (editPreferredTime !== (lead.scheduled_time || "")) payload.scheduled_time = editPreferredTime || null;
    if (editInternalNotes !== (lead.internal_notes || "")) payload.internal_notes = editInternalNotes || null;

    // Address fields
    if (editAddress.street !== (lead.property_address_street || "")) payload.property_address_street = editAddress.street || null;
    if (editAddress.suburb !== (lead.property_address_suburb || "")) payload.property_address_suburb = editAddress.suburb || null;
    if (editAddress.state !== (lead.property_address_state || "")) payload.property_address_state = editAddress.state || null;
    if (editAddress.postcode !== (lead.property_address_postcode || "")) payload.property_address_postcode = editAddress.postcode || null;
    if (editAddress.lat !== (lead.property_lat ?? undefined)) payload.property_lat = editAddress.lat ?? null;
    if (editAddress.lng !== (lead.property_lng ?? undefined)) payload.property_lng = editAddress.lng ?? null;

    const success = await updateLead(payload, original);
    if (success) {
      onRefetch();
      setIsEditing(false);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      resetEditState();
    } else {
      setIsEditing(true);
    }
  };

  const fullAddress = [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_state,
    lead.property_address_postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const mapsUrl =
    lead.property_lat && lead.property_lng
      ? `https://www.google.com/maps?q=${lead.property_lat},${lead.property_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const leadIdShort = lead.lead_number
    ? `#${lead.lead_number}`
    : `#MRC-${lead.id.substring(lead.id.length - 4).toUpperCase()}`;

  const createdDate = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  const createdTime = lead.created_at
    ? new Date(lead.created_at).toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Australia/Melbourne",
      })
    : "-";

  const elapsedText = lead.created_at
    ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })
    : null;

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await onStatusChange("not_landed" as LeadStatus);
      navigate("/leads");
    } finally {
      setArchiving(false);
    }
  };

  const handleBookingSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
    queryClient.invalidateQueries({ queryKey: ["booking", lead.id] });
    queryClient.invalidateQueries({ queryKey: ["unscheduled-leads"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-bookings"] });
    onRefetch();
  };

  const sourceLabel =
    lead.lead_source === "other" && lead.lead_source_other
      ? lead.lead_source_other
      : lead.lead_source || "Website Form";

  const isScheduled = lead.status === "inspection_waiting";

  // Format scheduled date/time for display
  const scheduledDateDisplay = lead.inspection_scheduled_date
    ? new Date(lead.inspection_scheduled_date + "T00:00:00").toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const scheduledTimeDisplay = lead.scheduled_time
    ? (() => {
        const [h, m] = lead.scheduled_time.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
      })()
    : null;

  return (
    <>
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row */}
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => navigate("/leads")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[48px]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Leads</span>
            </button>

            {/* Desktop action buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-600 hover:bg-slate-50"
                    onClick={resetEditState}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    onClick={handleSaveInline}
                    disabled={isUpdating}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                  onClick={handleToggleEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Lead
                </Button>
              )}
              {isScheduled ? (
                <>
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-600 hover:bg-slate-50"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    onClick={() => navigate(`/inspection/${lead.id}`)}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Start Inspection
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-600 hover:bg-slate-50"
                    onClick={() => setShowArchiveDialog(true)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Lead
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Inspection
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name + badge row */}
          <div className="pb-4 pt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {lead.full_name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              {isScheduled ? (
                <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">
                  {technicianName
                    ? `Waiting on ${technicianName} — ${scheduledDateDisplay ? new Date(lead.inspection_scheduled_date + "T00:00:00").toLocaleDateString("en-AU", { month: "short", day: "numeric" }) : ""}${scheduledTimeDisplay ? `, ${scheduledTimeDisplay}` : ""}`
                    : "Inspection Scheduled"}
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                  New Lead Received
                </Badge>
              )}
              <span className="text-xs font-mono text-muted-foreground">
                {leadIdShort}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ───── Main Content ───── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Sidebar ── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Contact Information Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Contact Information
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {isEditing ? (
                  <>
                    {/* Editable Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                    {/* Editable Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Phone</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                    {/* Editable Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Phone */}
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-4 group"
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                        <Phone className="h-4 w-4 text-blue-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {lead.phone}
                        </p>
                        <p className="text-xs text-muted-foreground">Mobile</p>
                      </div>
                    </a>

                    {/* Email */}
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-4 group"
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                        <Mail className="h-4 w-4 text-blue-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {lead.email}
                        </p>
                        <p className="text-xs text-muted-foreground">Personal</p>
                      </div>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Lead Source Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lead Source
                  </span>
                </div>
              </div>
              <div className="p-5">
                {isEditing ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Lead Source</label>
                    <select
                      value={editLeadSource}
                      onChange={(e) => setEditLeadSource(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer bg-white"
                    >
                      <option value="">Select lead source...</option>
                      {leadSourceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Globe className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {sourceLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Lead source channel
                        </p>
                      </div>
                    </div>
                    {lead.urgency && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Urgency
                          </span>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {lead.urgency}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Created On Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Created On
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {createdDate}
                    </p>
                    <p className="text-xs text-muted-foreground">{createdTime}</p>
                  </div>
                </div>
                {elapsedText && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Elapsed
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {elapsedText}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Main ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Inquiry Details Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50/50">
                <h2 className="text-sm font-semibold text-foreground">
                  Inquiry Details
                </h2>
              </div>
              <div className="p-5 space-y-6">
                {/* Property Address */}
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Property Address
                  </span>
                  {isEditing ? (
                    <div className="mt-3">
                      <AddressAutocomplete
                        label=""
                        value={editAddress}
                        onChange={setEditAddress}
                        placeholder="Search for an address..."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {fullAddress}
                          </p>
                        </div>
                      </div>

                      {/* Map link button */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 w-full h-64 md:h-80 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors group"
                      >
                        <MapPin className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
                          View on Google Maps
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </a>
                    </>
                  )}
                </div>

                {/* Issue Description */}
                {isEditing ? (
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Issue Description
                    </span>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="mt-3 w-full p-4 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>
                ) : lead.issue_description ? (
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Issue Description
                    </span>
                    <div className="mt-3 bg-slate-50 rounded-lg p-5 border">
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {lead.issue_description}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Preferred Date/Time (edit mode only) */}
                {isEditing && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Preferred Date</label>
                      <input
                        type="date"
                        value={editPreferredDate}
                        onChange={(e) => setEditPreferredDate(e.target.value)}
                        className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Preferred Time</label>
                      <input
                        type="time"
                        value={editPreferredTime}
                        onChange={(e) => setEditPreferredTime(e.target.value)}
                        className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Footer / Save-Cancel */}
                {isEditing ? (
                  <div className="pt-4 border-t flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 border-slate-300"
                      onClick={resetEditState}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleSaveInline}
                      disabled={isUpdating}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Assigned to:{" "}
                      <span className="font-medium text-foreground">
                        {technicianName || (lead.assigned_to ? "Assigned" : "Unassigned")}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Internal Notes Card - always editable */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Internal Notes
                    </span>
                  </div>
                  {notesValue !== (lead.internal_notes || "") && (
                    <Button
                      size="sm"
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                    >
                      <Save className="h-3 w-3 mr-1.5" />
                      {isSavingNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-5">
                <textarea
                  value={isEditing ? editInternalNotes : notesValue}
                  onChange={(e) => {
                    if (isEditing) {
                      setEditInternalNotes(e.target.value);
                    } else {
                      setNotesValue(e.target.value);
                    }
                  }}
                  rows={4}
                  placeholder="Add internal notes..."
                  className="w-full p-4 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Scheduled Inspection Card - only for inspection_waiting */}
            {isScheduled && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b bg-green-50/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-medium uppercase tracking-wider text-green-700">
                      Scheduled Inspection
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {scheduledDateDisplay && (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {scheduledDateDisplay}
                        </p>
                        <p className="text-xs text-muted-foreground">Inspection Date</p>
                      </div>
                    </div>
                  )}
                  {scheduledTimeDisplay && (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {scheduledTimeDisplay}
                        </p>
                        <p className="text-xs text-muted-foreground">Inspection Time</p>
                      </div>
                    </div>
                  )}
                  {technicianName && (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {technicianName}
                        </p>
                        <p className="text-xs text-muted-foreground">Assigned Technician</p>
                      </div>
                    </div>
                  )}
                  {/* Reschedule Button */}
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full h-12 border-orange-200 text-orange-700 hover:bg-orange-50"
                      onClick={() => setShowScheduleModal(true)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reschedule Inspection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ───── Mobile Fixed Bottom Bar ───── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:hidden z-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 flex-shrink-0 border-slate-300 text-slate-600"
                onClick={resetEditState}
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSaveInline}
                disabled={isUpdating}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 flex-shrink-0 border-slate-300 text-slate-600"
                onClick={handleToggleEdit}
              >
                <Edit className="h-5 w-5" />
              </Button>
              {isScheduled ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 border-slate-300 text-slate-600"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button
                    className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    onClick={() => navigate(`/inspection/${lead.id}`)}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Start Inspection
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 border-slate-300 text-slate-600"
                    onClick={() => setShowArchiveDialog(true)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                  <Button
                    className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Inspection
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ───── Archive Confirmation Dialog ───── */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the lead as "Not Landed" and move it out of the
              active pipeline. You can reopen it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-slate-600 hover:bg-slate-700"
            >
              {archiving ? "Archiving..." : "Archive Lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ───── Book Inspection Modal ───── */}
      <BookInspectionModal
        open={showScheduleModal}
        onOpenChange={(open) => {
          setShowScheduleModal(open);
          if (!open) handleBookingSuccess();
        }}
        leadId={lead.id}
        leadNumber={lead.lead_number || ""}
        customerName={lead.full_name || "Unknown"}
        propertyAddress={fullAddress}
        propertySuburb={lead.property_address_suburb || ""}
      />

      {/* ───── Edit Lead Sheet ───── */}
      <EditLeadSheet lead={lead} open={showEditSheet} onOpenChange={setShowEditSheet} />
    </>
  );
}
