import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { NewLeadView } from "@/components/leads/NewLeadView";
import InspectionDataDisplay from "@/components/leads/InspectionDataDisplay";
import { generateInspectionPDF } from "@/lib/api/pdfGeneration";
import { fetchCompleteInspectionData, type CompleteInspectionData } from "@/lib/api/inspections";
import { STATUS_FLOW, LeadStatus } from "@/lib/statusFlow";
import { useActivityTimeline } from "@/hooks/useActivityTimeline";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { toast } from "sonner";

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

// Australian date formatter
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Time formatter
const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return "-";
  const hour = parseInt(timeString.substring(0, 2));
  if (hour === 12) return "12:00 PM";
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};

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
  const navigate = useNavigate();
  const [regeneratingPdf, setRegeneratingPdf] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<LeadStatus | null>(null);

  // Fetch lead data
  const { data: lead, isLoading, refetch } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
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

  const POST_INSPECTION_STATUSES = [
    'inspection_ai_summary',
    'approve_inspection_report',
    'inspection_email_approval',
    'closed',
    'not_landed',
  ];

  React.useEffect(() => {
    if (lead && POST_INSPECTION_STATUSES.includes(lead.status) && id) {
      setInspectionDisplayLoading(true);
      fetchCompleteInspectionData(id)
        .then(data => setInspectionDisplayData(data))
        .catch(err => console.error('[LeadDetail] Failed to load inspection display data:', err))
        .finally(() => setInspectionDisplayLoading(false));
    }
  }, [lead?.status, id]);

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
          <Button onClick={() => navigate("/leads")}>Back to Leads</Button>
        </div>
      </div>
    );
  }

  // Shared handlers (needed by NewLeadView and the main view)
  const handleChangeStatus = async (status: LeadStatus) => {
    const currentConfig = STATUS_FLOW[lead.status as LeadStatus];
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", lead.id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    await supabase.from("activities").insert({
      lead_id: lead.id,
      activity_type: "status_change",
      title: `Status changed to ${STATUS_FLOW[status].shortTitle}`,
      description: `Lead moved from ${currentConfig.shortTitle} to ${STATUS_FLOW[status].shortTitle}`,
    });

    toast.success(`Status updated to ${STATUS_FLOW[status].shortTitle}`);
    refetch();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);

    if (error) {
      toast.error("Failed to delete lead");
      return;
    }

    toast.success("Lead deleted");
    navigate("/leads");
  };

  // Render dedicated view for new leads and inspection_waiting
  if (lead.status === "new_lead" || lead.status === "inspection_waiting") {
    return (
      <div className="min-h-screen bg-gray-50">
        <NewLeadView
          lead={lead}
          onStatusChange={handleChangeStatus}
          onRefetch={() => refetch()}
          technicianName={techProfile?.full_name || undefined}
        />

        {/* Reuse existing delete + status dialogs */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete this lead? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const statusConfig = STATUS_FLOW[lead.status as LeadStatus];
  const fullAddress = `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`;

  // Action handlers
  const handleCall = () => {
    window.location.href = `tel:${lead.phone}`;
  };

  const handleEmail = () => {
    window.location.href = `mailto:${lead.email}`;
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
      case "inspection_waiting":
        return (
          <Button
            size="lg"
            className="w-full h-14 text-base"
            onClick={() => navigate(`/inspection/${lead.id}`)}
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
                onClick={() => navigate(`/inspection/${lead.id}`)}
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
                onClick={() => navigate(`/inspection/${lead.id}`)}
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
                        <div>{new Date(inspection.pdf_approved_at).toLocaleString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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
            <Button variant="outline" className="w-full h-12" onClick={handleCall}>
              <Phone className="h-4 w-4 mr-2" />
              Call Customer
            </Button>
          </div>
        );

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
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="icon" onClick={handleCall} className="h-10 w-10">
                <Phone className="h-5 w-5" />
              </Button>

              {/* MORE OPTIONS Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleCall}>
                    <Phone className="h-4 w-4 mr-3" />
                    Call
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEmail}>
                    <Mail className="h-4 w-4 mr-3" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSMS}>
                    <MessageSquare className="h-4 w-4 mr-3" />
                    SMS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDirections}>
                    <Navigation className="h-4 w-4 mr-3" />
                    Get Directions
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Change Status Submenu */}
                  <DropdownMenuItem
                    onClick={() => setShowStatusDialog(true)}
                    className="text-blue-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-3" />
                    Change Status
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    Delete Lead
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Phone</span>
              <a
                href={`tel:${lead.phone}`}
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
              >
                <Phone className="h-3 w-3" />
                {lead.phone}
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <a
                href={`mailto:${lead.email}`}
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
              >
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </a>
            </div>
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
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{lead.property_address_street}</p>
              <p className="text-sm text-gray-600">
                {lead.property_address_suburb} {lead.property_address_state}{" "}
                {lead.property_address_postcode}
              </p>
            </div>
            {lead.property_type && (
              <div>
                <p className="text-sm text-gray-500">Property Type</p>
                <p className="font-medium">{lead.property_type}</p>
              </div>
            )}
            <Button variant="outline" className="w-full h-12" onClick={handleDirections}>
              <Navigation className="h-4 w-4 mr-2" />
              View on Google Maps
            </Button>
          </CardContent>
        </Card>

        {/* Issue Description */}
        {lead.issue_description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issue Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {lead.issue_description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lead Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lead Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Source</span>
              <span className="text-sm font-medium">{lead.lead_source || "Website"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date Created</span>
              <span className="text-sm font-medium">{formatDate(lead.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Lead ID</span>
              <span className="text-xs font-mono text-gray-500">{lead.lead_number || lead.id.substring(0, 8)}</span>
            </div>
            {lead.urgency && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Urgency</span>
                <Badge variant="secondary" className="capitalize">
                  {lead.urgency}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspection Scheduled - with booking notes inside */}
        {lead.inspection_scheduled_date && (
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

              {/* Booking Notes - inside the scheduled section */}
              {booking?.description && (
                <div className="pt-2 border-t border-green-200">
                  <span className="text-sm text-green-700 uppercase tracking-wide font-medium">Notes from Booking Call</span>
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      {booking.description}
                    </p>
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full h-12 border-green-300 text-green-700 hover:bg-green-100">
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule Inspection
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Internal Notes - shown when present */}
        {lead.internal_notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {lead.internal_notes}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* AI Summary - if generated (new 4-column format) */}
        {(inspection?.what_we_found_text || inspection?.problem_analysis_content || inspection?.what_we_will_do_text || inspection?.demolition_content) && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-purple-800">
                <Sparkles className="h-4 w-4" />
                AI Generated Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inspection.what_we_found_text && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">What We Found</p>
                  <p className="text-sm text-purple-900 whitespace-pre-wrap">{inspection.what_we_found_text}</p>
                </div>
              )}
              {inspection.problem_analysis_content && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Problem Analysis</p>
                  <p className="text-sm text-purple-900 whitespace-pre-wrap">{inspection.problem_analysis_content}</p>
                </div>
              )}
              {inspection.what_we_will_do_text && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">What We Will Do</p>
                  <p className="text-sm text-purple-900 whitespace-pre-wrap">{inspection.what_we_will_do_text}</p>
                </div>
              )}
              {inspection.demolition_content && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Demolition Details</p>
                  <p className="text-sm text-purple-900 whitespace-pre-wrap">{inspection.demolition_content}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Complete Inspection Data Display — shown for all post-inspection statuses */}
        {POST_INSPECTION_STATUSES.includes(lead.status) && (
          <div id="inspection-data" className="space-y-4">
            <div className="flex items-center gap-2 pt-2">
              <ClipboardList className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Inspection Data</h2>
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
          </div>
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
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this lead? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Status Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new status for this lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
                  {config.shortTitle}
                  {isCurrentStatus && (
                    <Badge variant="secondary" className="ml-auto">
                      Current
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
