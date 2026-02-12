import { useState } from "react";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BookInspectionModal } from "@/components/leads/BookInspectionModal";
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
  const [archiving, setArchiving] = useState(false);

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
                </div>

                {/* Issue Description */}
                {lead.issue_description && (
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
                )}

                {/* Footer */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Assigned to:{" "}
                    <span className="font-medium text-foreground">
                      {technicianName || (lead.assigned_to ? "Assigned" : "Unassigned")}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Internal Notes Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Internal Notes
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="bg-slate-50 rounded-lg p-5 border">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {lead.internal_notes || "No internal notes added"}
                  </p>
                </div>
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
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ───── Mobile Fixed Bottom Bar ───── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:hidden z-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
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
    </>
  );
}
