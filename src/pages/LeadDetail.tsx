import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Eye,
  Loader2,
  MoreVertical,
  MessageSquare,
  Navigation,
  Trash2,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Sparkles,
  ClipboardList,
  StickyNote,
  ClipboardCheck,
  Star,
  Save,
  Copy,
  Building2,
  Droplets,
  Car,
  Info,
  Leaf,
  Wrench,
  Calculator,
} from "lucide-react";
import { InlineEditField } from "@/components/leads/InlineEditField";
import { InlineEditAddress, type AddressFields } from "@/components/leads/InlineEditAddress";
import { BookJobSheet } from "@/components/leads/BookJobSheet";
import { useLeadUpdate } from "@/hooks/useLeadUpdate";
import { logFieldEdits, type FieldChange } from "@/lib/api/fieldEditLog";
import { formatPhoneNumber, leadSourceOptions } from "@/lib/leadUtils";
import { leadSourceSchema } from "@/lib/validators/lead-creation.schemas";
import { formatTimeForDisplay } from "@/lib/bookingService";
import { JobBookingDetails } from "@/components/leads/JobBookingDetails";
import { JobCompletionSummary } from "@/components/leads/JobCompletionSummary";
import { JobCompletionEditSheet } from "@/components/leads/JobCompletionEditSheet";
import { InvoicePaymentCard } from "@/components/leads/InvoicePaymentCard";
import { InvoiceSummaryCard } from "@/components/leads/InvoiceSummaryCard";
import { usePaymentTracking } from "@/hooks/usePaymentTracking";
import { TechnicianBottomNav } from "@/components/technician";
import { useAuth } from "@/contexts/AuthContext";
import InspectionDataDisplay from "@/components/leads/InspectionDataDisplay";
import { InspectionReportHistory } from "@/components/leads/InspectionReportHistory";
import { generateInspectionPDF } from "@/lib/api/pdfGeneration";
import { fetchCompleteInspectionData, type CompleteInspectionData } from "@/lib/api/inspections";
import { getJobCompletionByLeadId } from "@/lib/api/jobCompletions";
import { generateJobReportPdf } from "@/lib/api/jobReportPdf";
import type { JobCompletionRow } from "@/types/jobCompletion";
import { STATUS_FLOW, ALL_STATUSES, LeadStatus } from "@/lib/statusFlow";
import { sendSlackNotification, sendGoogleReviewEmail } from "@/lib/api/notifications";
import { useActivityTimeline } from "@/hooks/useActivityTimeline";
import { captureBusinessError } from "@/lib/sentry";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { toast } from "sonner";
import { formatDateAU, formatDateTimeAU } from "@/lib/dateUtils";
import { appendInternalNote, parseInternalNotesLog } from "@/lib/utils/internalNotes";

// Australian currency formatter
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  return formatDateAU(dateString) || "-";
};

// Null-safe wrapper over the canonical formatTimeForDisplay so the empty-fallback
// chain at scheduled_time/booking renders still works without a throw on null input.
const formatTime = (timeString: string | null | undefined) =>
  timeString ? formatTimeForDisplay(timeString) : "";

// Get initials from name
const getInitials = (name: string | null | undefined) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasRole, profile, user } = useAuth();
  const isAdmin = hasRole('admin');
  const isTechnician = hasRole('technician');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateLead } = useLeadUpdate(id || '');
  const [regeneratingPdf, setRegeneratingPdf] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showBookJobModal, setShowBookJobModal] = useState(false);
  const [newStatus, setNewStatus] = useState<LeadStatus | null>(null);
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [sendBackNote, setSendBackNote] = useState('');
  const [isSendingBack, setIsSendingBack] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [generatingJobPdf, setGeneratingJobPdf] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Fetch lead data
  const { data: lead, isLoading, refetch } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .is("archived_at", null)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch unified activity timeline for this lead
  const { data: timelineEvents = [], isLoading: timelineLoading } = useActivityTimeline(50, id);

  // Fetch inspection data
  const { data: inspection } = useQuery({
    queryKey: ["inspection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("*")
        .eq("lead_id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch booking data (includes Notes from Call)
  const { data: booking } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_bookings")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch the original lead's lead_number when this lead is flagged as a possible duplicate
  const { data: duplicateOriginal } = useQuery({
    queryKey: ["lead-duplicate-original", lead?.possible_duplicate_of],
    queryFn: async () => {
      if (!lead?.possible_duplicate_of) return null;
      const { data, error } = await supabase
        .from("leads")
        .select("id, lead_number")
        .eq("id", lead.possible_duplicate_of)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!lead?.is_possible_duplicate && !!lead?.possible_duplicate_of,
  });

  // Fetch technician profile for assigned_to name
  const { data: techProfile } = useQuery({
    queryKey: ["profile", lead?.assigned_to],
    queryFn: async () => {
      if (!lead?.assigned_to) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", lead.assigned_to)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!lead?.assigned_to,
  });

  // Fetch complete inspection data for post-inspection statuses
  const [inspectionDisplayData, setInspectionDisplayData] = useState<CompleteInspectionData | null>(null);
  const [inspectionDisplayLoading, setInspectionDisplayLoading] = useState(false);

  // Job completion data for Phase 2 statuses
  const [jobCompletion, setJobCompletion] = useState<JobCompletionRow | null>(null);

  // Statuses where the full inspection data should be displayed.
  // Phase 2 statuses are included so the lead detail accumulates information
  // as the job progresses — nothing is hidden once collected.
  const POST_INSPECTION_STATUSES = [
    'inspection_ai_summary',
    'approve_inspection_report',
    'inspection_email_approval',
    'job_waiting',
    'job_scheduled',
    'job_completed',
    'pending_review',
    'job_report_pdf_sent',
    'invoicing_sent',
    'paid',
    'google_review',
    'finished',
    'closed',
    'not_landed',
  ];

  React.useEffect(() => {
    if (lead && inspection && id) {
      setInspectionDisplayLoading(true);
      fetchCompleteInspectionData(id)
        .then(data => setInspectionDisplayData(data))
        .catch(err => console.error('[LeadDetail] Failed to load inspection display data:', err))
        .finally(() => setInspectionDisplayLoading(false));
    }
  }, [lead?.id, inspection?.id, id]);

  const PHASE_2_STATUSES = [
    'job_waiting', 'job_completed', 'pending_review', 'job_report_pdf_sent',
    'invoicing_sent', 'paid', 'google_review', 'finished',
  ];

  const refetchJobCompletion = React.useCallback(() => {
    if (lead && PHASE_2_STATUSES.includes(lead.status)) {
      getJobCompletionByLeadId(lead.id).then(setJobCompletion).catch(console.error);
    }
  }, [lead?.id, lead?.status]);

  React.useEffect(() => { refetchJobCompletion(); }, [refetchJobCompletion]);

  // Fetch the technician profile for job_completions.completed_by
  // (used by the pending_review CTA card to show "Submitted by …")
  const { data: completedByProfile } = useQuery({
    queryKey: ['profile', jobCompletion?.completed_by],
    queryFn: async () => {
      if (!jobCompletion?.completed_by) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', jobCompletion.completed_by)
        .maybeSingle();
      return data;
    },
    enabled: !!jobCompletion?.completed_by,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading lead details...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Lead not found</h2>
          <p className="text-gray-500 mb-4">
            This lead may have been deleted or doesn't exist.
          </p>
          <Button onClick={() => navigate("/admin/leads")}>Back to Leads</Button>
        </div>
      </div>
    );
  }

  // ── Inline-edit save helpers ──────────────────────────────────────────
  // saveField commits a single column → useLeadUpdate fires one
  // "Lead Details Updated — Updated: <field>" activity row + Slack ping.
  // saveAddress commits the four address columns + lat/lng atomically.
  const saveField = async (
    column: string,
    nextValue: string | null,
  ): Promise<boolean> => {
    return await updateLead(
      { [column]: nextValue } as Parameters<typeof updateLead>[0],
      lead as unknown as Record<string, unknown>,
    );
  };
  const saveAddress = async (next: AddressFields): Promise<boolean> => {
    return await updateLead(
      next as Parameters<typeof updateLead>[0],
      lead as unknown as Record<string, unknown>,
    );
  };

  // Append a new internal-notes entry with timestamp + author attribution.
  // Uses the shared appendInternalNote helper so the same on-disk format
  // works for both admin (Lead Detail) and technician (Job Detail) writers.
  const handleSaveNote = async () => {
    const trimmed = notesValue.trim();
    if (!trimmed) return;
    setIsSavingNotes(true);
    const authorName = profile?.full_name?.trim() || user?.email || "Unknown user";
    const original = { internal_notes: lead.internal_notes };
    const payload = {
      internal_notes: appendInternalNote(lead.internal_notes ?? null, trimmed, { authorName }),
    };
    const success = await updateLead(
      payload as Parameters<typeof updateLead>[0],
      original,
    );
    if (success) {
      setNotesValue("");
      refetch();
    }
    setIsSavingNotes(false);
  };

  const handleCancelNote = () => setNotesValue("");

  const handleChangeStatus = async (status: LeadStatus) => {
    const currentConfig = STATUS_FLOW[lead.status as LeadStatus];
    const oldRank = ALL_STATUSES.indexOf(lead.status as LeadStatus);
    const newRank = ALL_STATUSES.indexOf(status);
    const isReversion = newRank >= 0 && oldRank >= 0 && newRank < oldRank;

    // On reversion, clear stage-keyed forward-state columns so the lead returns
    // to a coherent state. Customer preference fields (customer_preferred_*) are
    // never cleared — they belong to the customer, not the workflow.
    const updates: Record<string, unknown> = { status };
    const clearedFields: string[] = [];

    if (isReversion) {
      if (newRank < 1) {
        for (const f of ['assigned_to', 'inspection_scheduled_date', 'scheduled_time', 'scheduled_dates', 'booked_at']) {
          updates[f] = null;
          clearedFields.push(f);
        }
      }
      if (newRank < 2) {
        for (const f of ['inspection_completed_date', 'report_pdf_url']) {
          updates[f] = null;
          clearedFields.push(f);
        }
      }
      if (newRank < 6) {
        updates.job_scheduled_date = null;
        clearedFields.push('job_scheduled_date');
      }
      if (newRank < 7) {
        updates.job_completed_date = null;
        clearedFields.push('job_completed_date');
      }
      if (newRank < 10) {
        for (const f of ['invoice_amount', 'invoice_sent_date']) {
          updates[f] = null;
          clearedFields.push(f);
        }
      }
      if (newRank < 11) {
        updates.payment_received_date = null;
        clearedFields.push('payment_received_date');
      }
    }

    const { error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", lead.id);

    if (error) {
      captureBusinessError("Failed to update lead status", { leadId: lead.id, status, error: error.message });
      toast.error("Failed to update status");
      return;
    }

    // On rank<1 reversion, cancel only ACTIVE bookings (scheduled, in_progress).
    // Terminal bookings (completed, cancelled, rescheduled) are immutable history.
    // NOTE: preserved query runs BEFORE the update so it captures rows that were
    // already terminal — without this ordering the freshly-cancelled rows would
    // bleed into preserved_booking_ids.
    let cancelledBookingIds: string[] = [];
    let preservedBookingIds: string[] = [];
    if (isReversion && newRank < 1) {
      const { data: preservedRows } = await supabase
        .from('calendar_bookings')
        .select('id')
        .eq('lead_id', lead.id)
        .in('status', ['completed', 'cancelled', 'rescheduled']);
      preservedBookingIds = (preservedRows ?? []).map((b) => b.id);

      const { data: cancelledRows } = await supabase
        .from('calendar_bookings')
        .update({ status: 'cancelled' })
        .eq('lead_id', lead.id)
        .in('status', ['scheduled', 'in_progress'])
        .select('id');
      cancelledBookingIds = (cancelledRows ?? []).map((b) => b.id);
    }

    // Activity log — one canonical 'field_edit' row covering the status diff plus
    // any reversion-cleared columns. The reversion-specific metadata
    // (cancelled/preserved booking ids) rides as extraMetadata on the same row.
    const changes: FieldChange[] = [
      { field: 'status', old: lead.status as string, new: status as string },
    ];
    for (const f of clearedFields) {
      const before = (lead as unknown as Record<string, unknown>)[f] ?? null;
      changes.push({
        field: f,
        old: before as FieldChange['old'],
        new: null,
      });
    }

    const extraMetadata = isReversion
      ? {
          reverted: true,
          cancelled_booking_ids: cancelledBookingIds,
          preserved_booking_ids: preservedBookingIds,
        }
      : undefined;

    await logFieldEdits({
      leadId: lead.id,
      entityType: 'lead',
      entityId: lead.id,
      changes,
      extraMetadata,
    });

    const fullAddr = [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(', ');
    sendSlackNotification({
      event: 'status_changed',
      leadId: lead.id,
      leadName: lead.full_name || 'Unknown',
      propertyAddress: fullAddr || undefined,
      oldStatus: lead.status,
      newStatus: status,
      oldStatusLabel: currentConfig.shortTitle,
      newStatusLabel: STATUS_FLOW[status].shortTitle,
    });

    queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });

    toast.success(`Status updated to ${STATUS_FLOW[status].shortTitle}`);
    refetch();
  };

  const handleApproveJobCompletion = async () => {
    if (!lead) return;
    setIsApproving(true);
    try {
      await handleChangeStatus('job_completed');
      // Auto-trigger PDF generation after approval
      if (jobCompletion) {
        toast.info('Generating job report PDF...');
        try {
          await generateJobReportPdf(jobCompletion.id);
          toast.success('Job report PDF generated');
          refetchJobCompletion();
          navigate(`/admin/job-report/${lead.id}`);
        } catch (pdfErr) {
          console.error('PDF generation failed:', pdfErr);
          toast.error('PDF generation failed — you can retry from the lead detail');
        }
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleSendBackToTechnician = async () => {
    if (!lead || !sendBackNote.trim()) return;
    setIsSendingBack(true);
    try {
      const { error: statusError } = await supabase
        .from('leads')
        .update({ status: 'job_scheduled' })
        .eq('id', lead.id);
      if (statusError) throw statusError;

      // Clear request_review so the lead drops out of the Needs Attention list
      // and reset the job_completion back to draft so the tech can edit again.
      if (jobCompletion?.id) {
        await supabase
          .from('job_completions')
          .update({ request_review: false, status: 'draft' })
          .eq('id', jobCompletion.id);
      }

      await logFieldEdits({
        leadId: lead.id,
        entityType: 'lead',
        entityId: lead.id,
        changes: [{ field: 'status', old: lead.status, new: 'job_scheduled' }],
        extraMetadata: { trigger: 'sent_back_to_technician', send_back_note: sendBackNote.trim() },
      });
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });

      sendSlackNotification({
        event: 'status_changed',
        leadId: lead.id,
        leadName: lead.full_name || 'Unknown',
        oldStatus: 'pending_review',
        newStatus: 'job_scheduled',
        oldStatusLabel: 'ADMIN REVIEW',
        newStatusLabel: 'SCHEDULED',
      });

      toast.success('Sent back to technician');
      setShowSendBackDialog(false);
      setSendBackNote('');
      refetch();
    } catch (err) {
      captureBusinessError('Failed to send back to technician', {
        leadId: lead.id,
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to send back');
    } finally {
      setIsSendingBack(false);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("leads")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", lead.id);

    if (error) {
      captureBusinessError("Failed to archive lead", { leadId: lead.id, error: error.message });
      toast.error("Failed to archive lead");
      return;
    }

    toast.success("Lead archived");
    navigate("/admin/leads");
  };

  const statusConfig = STATUS_FLOW[lead.status as LeadStatus];
  const fullAddress = `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`;

  // Action handlers
  // Note: Call + Email use direct anchor tags (`<a href="tel:…">` / `mailto:`) in JSX
  // so a missing OS handler leaves the page intact instead of navigating to about:blank.
  const handleCopy = async (label: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Couldn't copy ${label.toLowerCase()}`);
    }
  };

  const handleSMS = () => {
    window.location.href = `sms:${lead.phone}`;
  };

  const handleDirections = () => {
    // Use lat/lng for accuracy if available, otherwise fall back to address string
    const mapsUrl = lead.property_lat && lead.property_lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lead.property_lat},${lead.property_lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
    window.open(mapsUrl, "_blank");
  };

  const PRE_INSPECTION_STATUSES = [
    'new_lead', 'contacted', 'inspection_waiting',
  ];

  const handleRegeneratePDF = async () => {
    if (!inspection) {
      toast.error("No inspection found for this lead");
      return;
    }

    if (PRE_INSPECTION_STATUSES.includes(lead.status)) {
      toast.error("Complete the inspection before generating a PDF");
      return;
    }

    setRegeneratingPdf(true);
    try {
      const result = await generateInspectionPDF(inspection.id, { regenerate: true });
      if (result.success) {
        toast.success("PDF regenerated successfully!");
        refetch();
      } else {
        toast.error("Failed to regenerate PDF");
      }
    } catch (error) {
      toast.error("Error regenerating PDF");
    } finally {
      setRegeneratingPdf(false);
    }
  };

  // Render primary CTA based on status
  const renderPrimaryCTA = () => {
    switch (lead.status as LeadStatus) {
      case "new_lead":
        return (
          <Button
            size="lg"
            className="w-full h-14 text-base"
            onClick={() => navigate(`/admin/schedule?lead=${lead.id}`)}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Schedule Inspection
          </Button>
        );

      case "inspection_waiting":
        return (
          <Button
            size="lg"
            className="w-full h-14 text-base"
            onClick={() => navigate(`/technician/inspection?leadId=${lead.id}`)}
          >
            <FileText className="h-5 w-5 mr-2" />
            {inspection ? "Continue Inspection" : "Start Inspection"}
          </Button>
        );

      case "inspection_ai_summary":
        return (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full h-14 text-base bg-violet-600 hover:bg-violet-700"
              onClick={() => navigate(`/admin/inspection-ai-review/${lead.id}`)}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Review AI Summary
            </Button>
            {inspection && (
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => navigate(`/technician/inspection?leadId=${lead.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Inspection Data
              </Button>
            )}
          </div>
        );

      case "approve_inspection_report":
        return (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full h-14 text-base bg-purple-600 hover:bg-purple-700"
              onClick={() => navigate(`/report/${lead.id}`)}
            >
              <Eye className="h-5 w-5 mr-2" />
              View & Edit Report
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => navigate(`/technician/inspection?leadId=${lead.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Inspection
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={handleRegeneratePDF}
                disabled={regeneratingPdf}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingPdf ? "animate-spin" : ""}`} />
                {regeneratingPdf ? "Regenerating..." : "Regenerate PDF"}
              </Button>
            </div>
          </div>
        );

      case "inspection_email_approval":
        return (
          <div className="space-y-3">
            {/* PDF Info Card */}
            {inspection && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">PDF Report Approved</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Status</div>
                    <div className="font-medium text-green-700">Approved — Pending Email</div>
                    {inspection.pdf_approved_at && (
                      <>
                        <div className="text-gray-500">Approved</div>
                        <div>{formatDateTimeAU(inspection.pdf_approved_at)}</div>
                      </>
                    )}
                    {inspection.pdf_url && (
                      <>
                        <div className="text-gray-500">Report</div>
                        <div className="truncate text-blue-600 text-xs">
                          {inspection.pdf_url.split('/').pop()?.substring(0, 30)}...
                        </div>
                      </>
                    )}
                    {inspection.pdf_version && (
                      <>
                        <div className="text-gray-500">Version</div>
                        <div>v{inspection.pdf_version}</div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <Button
              size="lg"
              className="w-full h-14 text-base bg-[#121D73] hover:bg-[#0f1860]"
              onClick={() => navigate(`/report/${lead.id}?action=send-email`)}
            >
              <Mail className="h-5 w-5 mr-2" />
              Send Email to Customer
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => navigate(`/report/${lead.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => navigate(`/report/${lead.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit PDF
              </Button>
            </div>
          </div>
        );

      case "closed":
        return (
          <div className="space-y-3">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-base"
              onClick={() => navigate(`/report/${lead.id}`)}
            >
              <Eye className="h-5 w-5 mr-2" />
              View Final Report
            </Button>
            <Button asChild variant="outline" className="w-full h-12">
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </a>
            </Button>
          </div>
        );

      case "job_waiting":
        return (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full h-14 text-base bg-amber-600 hover:bg-amber-700"
              onClick={() => setShowBookJobModal(true)}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Book Remediation Job
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => handleChangeStatus("not_landed")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Not Proceeding
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Customer approved the inspection report. Schedule the remediation with a technician.
            </p>
          </div>
        );

      case "job_scheduled":
        // Technicians: prominent "Start Job Completion" button, then the schedule below
        // Admins: schedule with "Reschedule Job" button
        return (
          <div className="space-y-3">
            {isTechnician && (
              <Button
                size="lg"
                className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700"
                onClick={() => navigate(`/technician/job-completion/${lead.id}`)}
              >
                <FileText className="h-5 w-5 mr-2" />
                Start Job Completion
              </Button>
            )}
            <JobBookingDetails
              leadId={lead.id}
              onReschedule={isAdmin ? () => setShowBookJobModal(true) : () => navigate(`/technician/job-completion/${lead.id}`)}
            />
          </div>
        );

      case "pending_review": {
        const submittedAt = jobCompletion?.submitted_at
          ? formatDateAU(jobCompletion.submitted_at)
          : null;
        const submittedBy =
          completedByProfile?.full_name ??
          jobCompletion?.remediation_completed_by ??
          'Technician';

        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900 text-sm">
                    Technician requested admin review
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Submitted by {submittedBy}{submittedAt ? ` · ${submittedAt}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1 h-12">
                <a href={`tel:${lead.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Customer
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1 h-12">
                <a href={`mailto:${lead.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Customer
                </a>
              </Button>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApproveJobCompletion}
              disabled={isApproving}
            >
              {isApproving
                ? <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Approve &amp; Generate Report
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 border-amber-200 text-amber-800 hover:bg-amber-50"
              onClick={() => setShowSendBackDialog(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Send Back to Technician
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Full submission shown below in the Job Completion section.
            </p>
          </div>
        );
      }

      case "job_completed": {
        const submittedAt = jobCompletion?.submitted_at
          ? formatDateAU(jobCompletion.submitted_at)
          : null;
        const submittedBy =
          completedByProfile?.full_name ??
          jobCompletion?.remediation_completed_by ??
          'Technician';

        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-900 text-sm">Job completion submitted</p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Submitted by {submittedBy}{submittedAt ? ` · ${submittedAt}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12"
              variant={jobCompletion?.pdf_url ? 'outline' : 'default'}
              disabled={generatingJobPdf}
              onClick={async () => {
                if (jobCompletion?.pdf_url) {
                  navigate(`/admin/job-report/${lead.id}`);
                  return;
                }
                if (!jobCompletion) return;
                setGeneratingJobPdf(true);
                try {
                  await generateJobReportPdf(jobCompletion.id);
                  toast.success('Job report PDF generated');
                  refetchJobCompletion();
                  navigate(`/admin/job-report/${lead.id}`);
                } catch (err) {
                  toast.error('PDF generation failed');
                  console.error(err);
                } finally {
                  setGeneratingJobPdf(false);
                }
              }}
            >
              {generatingJobPdf ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating PDF...</>
              ) : jobCompletion?.pdf_url ? (
                <><FileText className="h-4 w-4 mr-2" /> View Job Report PDF</>
              ) : (
                <><FileText className="h-4 w-4 mr-2" /> Generate Job Report PDF</>
              )}
            </Button>

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1 h-12">
                <a href={`tel:${lead.phone}`}>
                  <Phone className="h-4 w-4 mr-2" /> Call Customer
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1 h-12">
                <a href={`mailto:${lead.email}`}>
                  <Mail className="h-4 w-4 mr-2" /> Email Customer
                </a>
              </Button>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate(`/admin/job-report/${lead.id}`)}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Review &amp; Send Job Report
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 border-amber-200 text-amber-800 hover:bg-amber-50"
              onClick={() => setShowSendBackDialog(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Request Changes
            </Button>
          </div>
        );
      }

      case "job_report_pdf_sent": {
        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-900 text-sm">Job report marked as sent</p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Ready to invoice the customer.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12"
              onClick={() => navigate(`/admin/job-report/${lead.id}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Job Report PDF
            </Button>

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1 h-12">
                <a href={`tel:${lead.phone}`}>
                  <Phone className="h-4 w-4 mr-2" /> Call Customer
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1 h-12">
                <a href={`mailto:${lead.email}`}>
                  <Mail className="h-4 w-4 mr-2" /> Email Customer
                </a>
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Scroll down to see the invoice summary and start payment tracking.
            </p>
          </div>
        );
      }

      case "not_landed":
        return (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => handleChangeStatus("new_lead")}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Reopen Lead
            </Button>
            <Button
              variant="destructive"
              className="w-full h-12"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Back Button - uses browser history */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline ml-2">Back</span>
            </Button>

            {/* Customer Name & Avatar */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                style={{ backgroundColor: statusConfig?.color || "#6b7280" }}
              >
                {getInitials(lead.full_name)}
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-base truncate">{lead.full_name}</h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${statusConfig?.color}20`,
                      color: statusConfig?.color,
                      borderColor: statusConfig?.color,
                    }}
                  >
                    {statusConfig?.shortTitle}
                  </Badge>
                  {isAdmin && lead.is_possible_duplicate && lead.possible_duplicate_of && (
                    <button
                      type="button"
                      onClick={() => navigate(`/leads/${lead.possible_duplicate_of}`)}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      title="Click to view the earlier matching lead"
                    >
                      <span>🔁</span>
                      <span>
                        Possible duplicate of{" "}
                        {duplicateOriginal?.lead_number ?? "earlier lead"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons — Desktop: inline buttons, Mobile: 3-dot menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Desktop action buttons (hidden on mobile) */}
              <div className="hidden md:flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="h-9">
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4 mr-1.5" />
                    Call
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9">
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4 mr-1.5" />
                    Email
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={handleDirections} className="h-9">
                  <Navigation className="h-4 w-4 mr-1.5" />
                  Directions
                </Button>
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)} className="h-9 text-blue-600 border-blue-200 hover:bg-blue-50">
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Status
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="h-9 text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile: phone + 3-dot menu (hidden on desktop) */}
              <div className="flex md:hidden items-center gap-2">
                <Button asChild variant="outline" size="icon" className="h-10 w-10">
                  <a href={`tel:${lead.phone}`} aria-label="Call customer">
                    <Phone className="h-5 w-5" />
                  </a>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <a href={`tel:${lead.phone}`}>
                        <Phone className="h-4 w-4 mr-3" />
                        Call
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={`mailto:${lead.email}`}>
                        <Mail className="h-4 w-4 mr-3" />
                        Email
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSMS}>
                      <MessageSquare className="h-4 w-4 mr-3" />
                      SMS
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDirections}>
                      <Navigation className="h-4 w-4 mr-3" />
                      Get Directions
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowStatusDialog(true)} className="text-blue-600">
                          <RefreshCw className="h-4 w-4 mr-3" />
                          Change Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-3" />
                          Archive Lead
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-32 max-w-3xl mx-auto space-y-4">
        {/* Status Card */}
        <Card
          className="border-l-4"
          style={{ borderLeftColor: statusConfig?.color }}
        >
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: statusConfig?.color }}
              >
                {statusConfig?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">Current Status</p>
                <h2 className="font-bold text-lg">{statusConfig?.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{statusConfig?.nextAction}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary CTA */}
        <Card>
          <CardContent className="pt-4">{renderPrimaryCTA()}</CardContent>
        </Card>

        {/* Customer's Preferred Time — only on new_lead with a captured preference */}
        {lead.status === "new_lead" && lead.customer_preferred_date && (
          <Card className="border-l-4 border-l-blue-500 border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2 text-blue-800">
                <Calendar className="h-4 w-4" />
                Customer's Preferred Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Date</span>
                <span className="text-sm font-medium text-blue-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(lead.customer_preferred_date)}
                </span>
              </div>
              {lead.customer_preferred_time && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Time</span>
                  <span className="text-sm font-medium text-blue-900 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatTime(lead.customer_preferred_time)}
                  </span>
                </div>
              )}
              <p className="text-xs italic text-blue-700/80 pt-1">
                Not yet confirmed — call to schedule
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InlineEditField
              label="Name"
              value={lead.full_name}
              variant="text"
              placeholder="Customer name"
              emptyLabel="Add name"
              readOnly={!isAdmin}
              validate={(v) => (!v ? "Name is required" : null)}
              onSave={(v) => saveField("full_name", v)}
            />
            <InlineEditField
              label="Phone"
              value={lead.phone}
              variant="phone"
              placeholder="0412 345 678"
              emptyLabel="Add phone"
              readOnly={!isAdmin}
              formatOnChange={formatPhoneNumber}
              renderReadOnly={(v) => (
                <span className="flex items-center gap-1.5">
                  <a
                    href={`tel:${v}`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    {v}
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopy("Phone", v);
                    }}
                    aria-label="Copy phone number"
                    className="p-1 text-gray-400 hover:text-gray-700 rounded"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              )}
              onSave={(v) => saveField("phone", v || null)}
            />
            <InlineEditField
              label="Email"
              value={lead.email}
              variant="email"
              placeholder="customer@example.com"
              emptyLabel="Add email"
              readOnly={!isAdmin}
              validate={(v) => {
                if (!v) return null;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
                  ? null
                  : "Invalid email address";
              }}
              renderReadOnly={(v) => (
                <span className="flex items-center gap-1.5">
                  <a
                    href={`mailto:${v}`}
                    className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[220px]"
                  >
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{v}</span>
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopy("Email", v);
                    }}
                    aria-label="Copy email address"
                    className="p-1 text-gray-400 hover:text-gray-700 rounded flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              )}
              onSave={(v) => saveField("email", v || null)}
            />
          </CardContent>
        </Card>

        {/* Property Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{lead.property_address_street}</p>
                <p className="text-sm text-gray-600">
                  {lead.property_address_suburb} {lead.property_address_state}{" "}
                  {lead.property_address_postcode}
                </p>
              </div>
              {isAdmin && (
                <InlineEditAddress
                  current={{
                    property_address_street: lead.property_address_street,
                    property_address_suburb: lead.property_address_suburb,
                    property_address_state: lead.property_address_state,
                    property_address_postcode: lead.property_address_postcode,
                    property_lat: lead.property_lat ?? null,
                    property_lng: lead.property_lng ?? null,
                  }}
                  onSave={saveAddress}
                />
              )}
            </div>
            <Button variant="outline" className="w-full h-12" onClick={handleDirections}>
              <Navigation className="h-4 w-4 mr-2" />
              View on Google Maps
            </Button>
          </CardContent>
        </Card>

        {/* Issue Description — always visible so admin can add when missing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Issue Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InlineEditField
              label=""
              value={lead.issue_description}
              variant="textarea"
              placeholder="Describe the mould issue, affected areas, visible symptoms, etc."
              emptyLabel="Add issue description"
              maxLength={1000}
              readOnly={!isAdmin}
              renderReadOnly={(v) => (
                <span className="whitespace-pre-wrap">{v}</span>
              )}
              onSave={(v) => saveField("issue_description", v || null)}
            />
          </CardContent>
        </Card>

        {/* Lead Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lead Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InlineEditField
              label="Source"
              value={lead.lead_source}
              variant="select"
              selectOptions={leadSourceOptions}
              placeholder="Select source"
              emptyLabel="Set source"
              readOnly={!isAdmin}
              renderReadOnly={(v) => {
                const opt = leadSourceOptions.find((o) => o.value === v);
                const label = opt?.label ?? v;
                if (v === "other" && lead.lead_source_other) {
                  return `Other: ${lead.lead_source_other}`;
                }
                return label;
              }}
              onSave={(v) => {
                if (v) {
                  const parsed = leadSourceSchema.safeParse(v);
                  if (!parsed.success) {
                    toast.error('Invalid lead source value — please select a valid option');
                    return Promise.resolve(false);
                  }
                }
                return saveField("lead_source", v || null);
              }}
            />
            {/* Conditional sub-row for the Other-source free text */}
            {lead.lead_source === "other" && (
              <InlineEditField
                label="Other source"
                value={lead.lead_source_other}
                variant="text"
                placeholder="e.g. friend referral"
                emptyLabel="Specify other source"
                readOnly={!isAdmin}
                onSave={(v) => saveField("lead_source_other", v || null)}
              />
            )}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-500">Date Created</span>
              <span className="text-sm font-medium">{formatDate(lead.created_at)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-500">Lead ID</span>
              <span className="text-xs font-mono text-gray-500">{lead.lead_number || lead.id.substring(0, 8)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Dates — show milestone timestamps when available */}
        {(lead.booked_at || lead.inspection_completed_date || lead.job_completed_date || lead.invoice_sent_date || lead.payment_received_date || lead.invoice_amount) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pipeline Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.booked_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Booked On</span>
                  <span className="text-sm font-medium">{formatDate(lead.booked_at)}</span>
                </div>
              )}
              {lead.inspection_completed_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Inspection Completed</span>
                  <span className="text-sm font-medium">{formatDate(lead.inspection_completed_date)}</span>
                </div>
              )}
              {lead.job_completed_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Job Completed</span>
                  <span className="text-sm font-medium">{formatDate(lead.job_completed_date)}</span>
                </div>
              )}
              {lead.invoice_sent_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Invoice Sent</span>
                  <span className="text-sm font-medium">{formatDate(lead.invoice_sent_date)}</span>
                </div>
              )}
              {lead.invoice_amount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Invoice Amount</span>
                  <span className="text-sm font-medium">{formatCurrency(lead.invoice_amount)}</span>
                </div>
              )}
              {lead.payment_received_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Payment Received</span>
                  <span className="text-sm font-medium text-green-700">{formatDate(lead.payment_received_date)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Inspection Scheduled - with booking notes inside */}
        {/* Defensive guard: hide when status==='new_lead' so a stale forward-state row */}
        {/* (e.g. from a pre-fix non-atomic revert) doesn't show a phantom green card. */}
        {lead.inspection_scheduled_date && lead.status !== 'new_lead' && (
          <Card className="border-l-4 border-l-green-500 border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Inspection Scheduled
                </CardTitle>
                <Badge className="bg-green-600 text-white">Confirmed</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Date</span>
                <span className="text-sm font-medium text-green-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(lead.inspection_scheduled_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Time</span>
                <span className="text-sm font-medium text-green-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTime(lead.scheduled_time) || formatTime(booking?.start_datetime?.split('T')[1]?.substring(0, 5)) || 'Not set'}
                </span>
              </div>

              {/* Booking-call notes are no longer surfaced here. They flow
                  into the unified Internal Notes log below as a (booking call)
                  entry. calendar_bookings.description is still written for
                  per-booking calendar UI (EventDetailsPanel). */}

              <Button variant="outline" className="w-full h-12 border-green-300 text-green-700 hover:bg-green-100" onClick={() => navigate(`/admin/schedule?lead=${lead.id}`)}>
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule Inspection
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Customer Requests & Access Instructions — always visible so admin
            can add when missing. Empty-state CTA renders via InlineEditField. */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Customer Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InlineEditField
              label="Access"
              value={lead.access_instructions}
              variant="textarea"
              placeholder="e.g. Gate code 1234, enter via back door..."
              emptyLabel="Add access instructions"
              readOnly={!isAdmin}
              renderReadOnly={(v) => (
                <span className="whitespace-pre-line">{v}</span>
              )}
              onSave={(v) => saveField("access_instructions", v || null)}
            />
            <InlineEditField
              label="Special"
              value={lead.special_requests}
              variant="textarea"
              placeholder="Any special requirements..."
              emptyLabel="Add special requests"
              readOnly={!isAdmin}
              renderReadOnly={(v) => (
                <span className="whitespace-pre-line">{v}</span>
              )}
              onSave={(v) => saveField("special_requests", v || null)}
            />
          </CardContent>
        </Card>

        {/* Internal Notes — append-only log + add entry input */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Internal Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const noteEntries = parseInternalNotesLog(lead.internal_notes);
              return noteEntries.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto" aria-label="Internal notes log">
                  {noteEntries.map((entry, i) => (
                    <div key={i} className="rounded-md border bg-slate-50 p-3">
                      {entry.isLegacy ? (
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Legacy entry
                          </span>
                          <p className="text-sm whitespace-pre-line leading-relaxed text-foreground">
                            {entry.body}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <span className="font-medium">
                              {entry.author}
                              {entry.context ? ` (${entry.context})` : ""}
                            </span>
                            <span>{entry.timestamp}</span>
                          </div>
                          <p className="text-sm whitespace-pre-line leading-relaxed text-foreground">
                            {entry.body}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed bg-slate-50/50 p-3">
                  <p className="text-sm italic text-muted-foreground">No internal notes yet.</p>
                </div>
              );
            })()}

            {isAdmin && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-normal text-muted-foreground" htmlFor="add-internal-note">
                  Add internal note
                </label>
                <Textarea
                  id="add-internal-note"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={3}
                  placeholder="New entry — saved with timestamp and your name…"
                />
                {notesValue.trim() !== "" && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={handleSaveNote}
                      disabled={isSavingNotes}
                      className="h-12 flex-1 sm:flex-none"
                    >
                      {isSavingNotes ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSavingNotes ? "Saving…" : "Add Note"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelNote}
                      disabled={isSavingNotes}
                      className="h-12 flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote/Cost Estimate - if available */}
        {inspection?.total_inc_gst > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-green-800">
                <DollarSign className="h-4 w-4" />
                Cost Estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Subtotal (ex GST)</span>
                <span className="text-sm font-medium text-green-900">
                  {formatCurrency(inspection.subtotal_ex_gst)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">GST (10%)</span>
                <span className="text-sm font-medium text-green-900">
                  {formatCurrency(inspection.gst_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-green-200">
                <span className="text-base font-semibold text-green-800">Total (inc GST)</span>
                <span className="text-lg font-bold text-green-900">
                  {formatCurrency(inspection.total_inc_gst)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Admin-only inspection context cards (10 cards) ───────────────────
            All cards gated on isAdmin. Data sourced from the inspection row
            already fetched above (select("*")) and inspectionDisplayData.areas
            (available once fetchCompleteInspectionData resolves).
        ──────────────────────────────────────────────────────────────────── */}

        {/* Card 1 — Subfloor Sanitation badge (admin — surfaced prominently
            above the full Inspection Data section for quick at-a-glance read) */}
        {isAdmin && inspection && inspectionDisplayData?.subfloor && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Subfloor Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sanitation Required</span>
                <Badge
                  variant={inspectionDisplayData.subfloor.sanitation_required ? "destructive" : "secondary"}
                >
                  {inspectionDisplayData.subfloor.sanitation_required ? "Yes — Sanitation Required" : "No Sanitation Required"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 2 — Waste Disposal */}
        {isAdmin && inspection && (inspection.waste_disposal_required === true || inspection.waste_disposal_required === false) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Waste Disposal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Required</span>
                <Badge variant={inspection.waste_disposal_required ? "default" : "secondary"}>
                  {inspection.waste_disposal_required ? "Yes" : "No"}
                </Badge>
              </div>
              {inspection.waste_disposal_required && inspection.waste_disposal_amount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Estimated Amount</span>
                  <span className="text-sm font-medium">{inspection.waste_disposal_amount}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 3 — Recommended Dehumidifier Size (admin only) */}
        {isAdmin && inspection && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Recommended Dehumidifier Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inspection.recommended_dehumidifier ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {inspection.recommended_dehumidifier}
                </p>
              ) : (
                <p className="text-sm italic text-gray-400">No recommendation recorded</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 4 — Parking Option
            IA decision: placed inside Customer Requests card content as an
            additional read-only row. Rationale: parking is a site-logistics item
            that lives naturally alongside access instructions and special requests.
            The Property Information card is already full (address + map button).
            Admin-only read-only append below the existing inline-edit fields. */}
        {isAdmin && inspection?.parking_option && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" />
                Parking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Parking Option</span>
                <span className="text-sm font-medium capitalize">
                  {inspection.parking_option.replace(/_/g, " ")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 5 — Additional Info for Technician (admin only) */}
        {isAdmin && inspection && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Additional Info for Technician
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Internal — passed to AI summary. Review per Phase 0 audit.
              </p>
            </CardHeader>
            <CardContent>
              {inspection.additional_info_technician ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {inspection.additional_info_technician}
                </p>
              ) : (
                <p className="text-sm italic text-gray-400">Not specified</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 6 — Internal Office Notes per area (admin only)
            Shows only areas that have non-empty internal_office_notes.
            Data available once inspectionDisplayData resolves. */}
        {isAdmin && inspectionDisplayData && (() => {
          const areasWithNotes = inspectionDisplayData.areas.filter(
            a => a.internal_office_notes?.trim()
          );
          if (areasWithNotes.length === 0) return null;
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Internal Office Notes (per area)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {areasWithNotes.map(area => (
                  <div key={area.id} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {area.area_name || `Area ${area.area_order}`}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {area.internal_office_notes}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {/* Card 7 — Cause of Mould (standalone — NOT inside AI summary card) */}
        {isAdmin && inspection && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Cause of Mould
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inspection.cause_of_mould ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {inspection.cause_of_mould}
                </p>
              ) : (
                <p className="text-sm italic text-gray-400">Not specified yet</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 8 — Property Occupation
            Extends the Property Information card concept as a separate admin row.
            Pretty-prints the enum value using the same pattern as Phase 3b. */}
        {isAdmin && inspection?.property_occupation && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Property Occupation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Occupation Status</span>
                <span className="text-sm font-medium">
                  {(() => {
                    const labels: Record<string, string> = {
                      tenanted: "Tenanted",
                      vacant: "Vacant",
                      owner_occupied: "Owner Occupied",
                      tenants_vacating: "Tenants Vacating",
                    };
                    return labels[inspection.property_occupation] ?? inspection.property_occupation;
                  })()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 9 — Outdoor Comments (hidden entirely when null/empty) */}
        {isAdmin && inspection?.outdoor_comments?.trim() && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Outdoor Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {inspection.outdoor_comments}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Card 10 — Admin Cost Breakdown (admin only)
            Columns sourced from inspections.*: labour_cost_ex_gst,
            equipment_cost_ex_gst, subtotal_ex_gst, gst_amount, total_inc_gst.
            Total Inc-GST is referenced but not duplicated (see Cost Estimate card above). */}
        {isAdmin && inspection && (
          inspection.labour_cost_ex_gst != null ||
          inspection.equipment_cost_ex_gst != null ||
          inspection.subtotal_ex_gst != null
        ) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Cost Breakdown (Admin)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {inspection.labour_cost_ex_gst != null && (
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">Labour Subtotal Ex-GST</dt>
                    <dd className="text-sm font-medium tabular-nums">
                      {formatCurrency(inspection.labour_cost_ex_gst)}
                    </dd>
                  </div>
                )}
                {inspection.equipment_cost_ex_gst != null && (
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">Equipment Cost Ex-GST</dt>
                    <dd className="text-sm font-medium tabular-nums">
                      {formatCurrency(inspection.equipment_cost_ex_gst)}
                    </dd>
                  </div>
                )}

                {/* Option 1 sub-quote — only when both options were quoted and Option 1 data exists */}
                {inspection.option_selected === 3 && (inspection.option_1_total_inc_gst ?? 0) > 0 && (
                  <>
                    <div className="pt-2 pb-1">
                      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Option 1 (Surface Treatment)</dt>
                    </div>
                    {inspection.option_1_labour_ex_gst != null && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-gray-500 pl-3">Labour Ex-GST</dt>
                        <dd className="text-sm font-medium tabular-nums">
                          {formatCurrency(inspection.option_1_labour_ex_gst)}
                        </dd>
                      </div>
                    )}
                    {inspection.option_1_equipment_ex_gst != null && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-gray-500 pl-3">Equipment Ex-GST</dt>
                        <dd className="text-sm font-medium tabular-nums">
                          {formatCurrency(inspection.option_1_equipment_ex_gst)}
                        </dd>
                      </div>
                    )}
                  </>
                )}

                {inspection.subtotal_ex_gst != null && (
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">Subtotal Ex-GST</dt>
                    <dd className="text-sm font-medium tabular-nums">
                      {formatCurrency(inspection.subtotal_ex_gst)}
                    </dd>
                  </div>
                )}
                {inspection.gst_amount != null && (
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">GST (10%)</dt>
                    <dd className="text-sm font-medium tabular-nums">
                      {formatCurrency(inspection.gst_amount)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <dt className="text-sm text-gray-500">Total Inc-GST</dt>
                  <dd className="text-sm text-gray-400 italic">
                    See Cost Estimate card above
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-gray-400 mt-3">All prices exclude GST unless stated otherwise.</p>
            </CardContent>
          </Card>
        )}

        {/* Complete Inspection Data Display — always visible whenever an inspection exists */}
        {inspection && (
          <div id="inspection-data" className="space-y-4">
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-bold text-slate-900">Inspection Data</h2>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/inspection/${lead.id}`)}
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit Inspection Data
                </Button>
              )}
            </div>

            {inspectionDisplayLoading ? (
              <Card>
                <CardContent className="py-8 flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                  <p className="text-sm text-slate-500">Loading inspection data...</p>
                </CardContent>
              </Card>
            ) : inspectionDisplayData ? (
              <InspectionDataDisplay data={inspectionDisplayData} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-slate-400">No inspection data available</p>
                </CardContent>
              </Card>
            )}

            <InspectionReportHistory
              inspectionId={inspection.id}
              leadId={lead.id}
              onRegenerate={handleRegeneratePDF}
              isRegenerating={regeneratingPdf}
            />
          </div>
        )}

        {/* Job Completion Summary */}
        {jobCompletion && lead && (
          <JobCompletionSummary
            jobCompletion={jobCompletion}
            leadId={lead.id}
            isAdmin={hasRole('admin')}
            onEdit={isAdmin ? setEditingSection : undefined}
          />
        )}

        {/* Invoice / Payment — one card at a time (summary → tracker) */}
        {lead && <InvoiceSection lead={lead} onRefresh={refetch} />}

        {/* Google Review CTA — show once paid, hide after review requested */}
        {lead && lead.status === 'paid' && (
          <GoogleReviewSection lead={lead} onRefresh={refetch} />
        )}

        {/* Awaiting review — admin can close the lead */}
        {lead && lead.status === 'google_review' && (
          <FinishLeadSection lead={lead} onRefresh={refetch} />
        )}

        {/* Terminal — lead complete banner */}
        {lead && lead.status === 'finished' && (
          <LeadCompleteBanner lead={lead} />
        )}

        {/* Activity Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              events={timelineEvents}
              isLoading={timelineLoading}
              showLeadName={false}
              compact={false}
            />
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this lead? It will be hidden from the app but can be restored later by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Back to Technician Dialog — pending_review flow */}
      <Dialog
        open={showSendBackDialog}
        onOpenChange={(open) => {
          setShowSendBackDialog(open);
          if (!open) setSendBackNote('');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send back to technician</DialogTitle>
            <DialogDescription>
              Leave a note explaining what the technician needs to revise. They'll see this in the activity timeline and the job will return to Scheduled.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={sendBackNote}
              onChange={(e) => setSendBackNote(e.target.value)}
              placeholder="e.g. Please add before photos for the kitchen area and re-check the equipment quantities."
              rows={5}
              className="resize-none"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowSendBackDialog(false);
                setSendBackNote('');
              }}
              disabled={isSendingBack}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendBackToTechnician}
              disabled={isSendingBack || !sendBackNote.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSendingBack && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog — uses Dialog (not AlertDialog) so click-outside and Esc close it */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Select a new status for this lead.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {(Object.keys(STATUS_FLOW) as LeadStatus[]).map((status) => {
              const config = STATUS_FLOW[status];
              const isCurrentStatus = lead.status === status;

              return (
                <Button
                  key={status}
                  variant={isCurrentStatus ? "default" : "outline"}
                  className="justify-start h-12"
                  disabled={isCurrentStatus}
                  onClick={() => {
                    handleChangeStatus(status);
                    setShowStatusDialog(false);
                  }}
                  style={
                    isCurrentStatus
                      ? { backgroundColor: config.color }
                      : { borderColor: config.color, color: config.color }
                  }
                >
                  <span className="mr-2">{config.icon}</span>
                  {config.title}
                  {isCurrentStatus && (
                    <Badge variant="secondary" className="ml-auto">
                      Current
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Job Sheet — slide-out drawer from right */}
      <BookJobSheet
        open={showBookJobModal}
        onOpenChange={(open) => {
          setShowBookJobModal(open);
          if (!open) refetch();
        }}
        leadId={lead.id}
        leadNumber={lead.lead_number || ''}
        customerName={lead.full_name}
        propertyAddress={`${lead.property_address_street}, ${lead.property_address_suburb}`}
        propertySuburb={lead.property_address_suburb}
        onBooked={() => refetch()}
      />

      {/* Job Completion Edit Sheet — admin inline section editing */}
      {editingSection !== null && jobCompletion && (
        <JobCompletionEditSheet
          sectionIndex={editingSection as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}
          jobCompletion={jobCompletion}
          leadId={lead.id}
          isAdmin={isAdmin}
          open={editingSection !== null}
          onOpenChange={(open) => !open && setEditingSection(null)}
          onSaved={refetchJobCompletion}
        />
      )}

      {/* Technician bottom nav — only shown when viewing as a technician */}
      {isTechnician && !isAdmin && <TechnicianBottomNav />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Invoice Section — single gated renderer:
//  - no invoice + status=job_report_pdf_sent → Summary card
//  - invoice exists → Payment tracker card (with timeline)
//  - otherwise → nothing
// ──────────────────────────────────────────────────────────────
const INVOICE_ELIGIBLE: LeadStatus[] = [
  'job_completed', 'job_report_pdf_sent', 'invoicing_sent', 'paid', 'google_review', 'finished',
];

function InvoiceSection({
  lead, onRefresh,
}: { lead: { id: string; status: LeadStatus }; onRefresh: () => void }) {
  const { invoice, isLoading } = usePaymentTracking(lead.id);
  if (isLoading) return null;
  if (!INVOICE_ELIGIBLE.includes(lead.status)) return null;
  if (invoice) return <InvoicePaymentCard leadId={lead.id} leadStatus={lead.status} onRefresh={onRefresh} />;
  if (lead.status === 'job_report_pdf_sent') return <InvoiceSummaryCard leadId={lead.id} onRefresh={onRefresh} />;
  return null;
}

// ──────────────────────────────────────────────────────────────
// Google Review CTA — visible only in 'paid' state.
// ──────────────────────────────────────────────────────────────
function GoogleReviewSection({
  lead, onRefresh,
}: { lead: { id: string; full_name: string; email: string | null; status: string }; onRefresh: () => void }) {
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!lead.email) {
      toast.error('No customer email on file');
      return;
    }
    setSending(true);
    try {
      const { data: jc } = await supabase
        .from('job_completions')
        .select('job_number')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      await sendGoogleReviewEmail({
        leadId: lead.id,
        customerEmail: lead.email,
        customerName: lead.full_name,
        jobNumber: jc?.job_number ?? 'MRC',
      });

      const { error: statusErr } = await supabase
        .from('leads').update({ status: 'google_review' }).eq('id', lead.id);
      if (statusErr) throw statusErr;

      await supabase.from('activities').insert({
        lead_id: lead.id,
        activity_type: 'email_sent',
        title: 'Google review email sent',
        description: `Requested a Google review from ${lead.email}`,
      });

      toast.success('Review request sent to customer');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send review email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">Request Google Review</h3>
      </div>
      <p className="text-sm text-gray-600">
        Payment received. Send a branded email asking the customer to leave a Google review.
      </p>
      <Button
        className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white"
        onClick={handleSend}
        disabled={sending || !lead.email}
      >
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Star className="h-4 w-4 mr-2" />}
        Send Google Review Request
      </Button>
      {!lead.email && (
        <p className="text-xs text-gray-400">No email address on this lead.</p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Finish Lead — visible when status === 'google_review'
// One button: flip lead to 'finished'.
// ──────────────────────────────────────────────────────────────
function FinishLeadSection({
  lead, onRefresh,
}: { lead: { id: string }; onRefresh: () => void }) {
  const [finishing, setFinishing] = useState(false);
  const queryClient = useQueryClient();

  async function handleFinish() {
    setFinishing(true);
    try {
      const { error: statusErr } = await supabase
        .from('leads').update({ status: 'finished' }).eq('id', lead.id);
      if (statusErr) throw statusErr;

      await logFieldEdits({
        leadId: lead.id,
        entityType: 'lead',
        entityId: lead.id,
        changes: [{ field: 'status', old: 'google_review', new: 'finished' }],
        extraMetadata: { trigger: 'admin_close_after_review_request' },
      });
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });

      toast.success('Lead marked as finished');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as finished');
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">Review request sent</h3>
      </div>
      <p className="text-sm text-gray-600">
        Awaiting customer action. Once you're done with this lead, close it out.
      </p>
      <Button
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={handleFinish}
        disabled={finishing}
      >
        {finishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
        Mark as Finished
      </Button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Lead Complete Banner — terminal state, no actions.
// ──────────────────────────────────────────────────────────────
function LeadCompleteBanner({
  lead,
}: { lead: { id: string; full_name: string; property_address_street?: string | null; property_address_suburb?: string | null } }) {
  const { invoice } = usePaymentTracking(lead.id);
  const address = [lead.property_address_street, lead.property_address_suburb].filter(Boolean).join(', ');

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-emerald-900">Lead Complete</h3>
      </div>
      <div className="rounded-lg bg-white border border-emerald-100 p-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Customer</span>
          <span className="font-medium text-right">{lead.full_name}</span>
        </div>
        {address && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Property</span>
            <span className="text-right text-gray-800">{address}</span>
          </div>
        )}
        {invoice?.total_amount != null && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Total paid</span>
            <span className="font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(Number(invoice.total_amount))}
            </span>
          </div>
        )}
        {invoice?.payment_date && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Paid on</span>
            <span className="text-gray-800">
              {formatDateAU(invoice.payment_date)}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-emerald-700">No further action required.</p>
    </div>
  );
}
