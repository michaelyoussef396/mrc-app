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
import { generateInspectionPDF } from "@/lib/api/pdfGeneration";
import { STATUS_FLOW, LeadStatus } from "@/lib/statusFlow";
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

  // Fetch activities
  const { data: activities } = useQuery({
    queryKey: ["activities", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

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

  const handleRegeneratePDF = async () => {
    if (!inspection) {
      toast.error("No inspection found for this lead");
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
            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => handleChangeStatus("closed")}
            >
              <Mail className="h-5 w-5 mr-2" />
              Send Report & Close Lead
            </Button>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => navigate(`/report/${lead.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Report
            </Button>
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

  // Calculate inspection completion percentage
  const getInspectionProgress = () => {
    if (!inspection) return { completed: 0, total: 10, percentage: 0 };

    let completed = 0;
    const total = 10;

    // Check each section using actual DB column names
    if (inspection.inspection_date) completed++;                                     // S1: Basic Info
    if (inspection.dwelling_type) completed++;                                       // S2: Property Details
    if (inspection.outdoor_temperature) completed++;                                 // S5: Outdoor
    if (inspection.waste_disposal_required !== null && inspection.waste_disposal_required !== undefined) completed++; // S6: Waste Disposal
    if (inspection.hepa_vac !== null && inspection.hepa_vac !== undefined) completed++; // S7: Equipment
    if (inspection.no_demolition_hours) completed++;                                 // S9: Cost Estimate (hours)
    if (inspection.cause_of_mould) completed++;                                      // S8: Job Summary
    if (inspection.total_inc_gst) completed++;                                       // S9: Cost Estimate (total)
    if (inspection.ai_summary_text) completed++;                                     // S10: AI Summary
    if (inspection.pdf_generated_at) completed++;                                    // Report generated

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
    };
  };

  const progress = getInspectionProgress();

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

        {/* Inspection Form Progress - if inspection exists */}
        {inspection && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Inspection Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Completion</span>
                <span className="text-sm font-bold text-blue-600">{progress.percentage}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {progress.completed} of {progress.total} sections completed
              </p>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => navigate(`/inspection/${lead.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {progress.percentage === 100 ? "View Inspection" : "Continue Inspection"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quote/Cost Estimate - if available */}
        {inspection?.estimated_total && (
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
                  {formatCurrency(inspection.estimated_subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">GST (10%)</span>
                <span className="text-sm font-medium text-green-900">
                  {formatCurrency(inspection.estimated_gst)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-green-200">
                <span className="text-base font-semibold text-green-800">Total (inc GST)</span>
                <span className="text-lg font-bold text-green-900">
                  {formatCurrency(inspection.estimated_total)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Summary - if generated */}
        {inspection?.ai_summary_text && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-purple-800">
                <Sparkles className="h-4 w-4" />
                AI Job Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-900 whitespace-pre-wrap">
                {inspection.ai_summary_text}
              </p>
              {inspection.ai_summary_generated_at && (
                <p className="text-xs text-purple-600 mt-3">
                  Generated {formatDate(inspection.ai_summary_generated_at)}
                </p>
              )}
            </CardContent>
          </Card>
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
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-l-0 last:pb-0"
                  >
                    <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-blue-600 border-2 border-white" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-gray-500">{activity.description}</p>
                      )}
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.created_at).toLocaleString("en-AU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No activity yet. Activities will appear here as the lead progresses.
              </p>
            )}
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
