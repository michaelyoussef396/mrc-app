import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  Clock,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  FileCheck,
  Wrench,
  Send,
  Star,
  PartyPopper
} from "lucide-react";
import { STATUS_FLOW, LeadStatus } from "@/lib/statusFlow";
import { useState } from "react";
import { BookInspectionModal } from "@/components/leads/BookInspectionModal";
import { toast } from "sonner";

// Icon mapping
const iconMap: Record<string, any> = {
  Sparkles,
  CheckCircle,
  CheckCircle2,
  Clock,
  FileText,
  FileCheck,
  Calendar,
  Wrench,
  Send,
  DollarSign,
  Star,
  PartyPopper,
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showBookingModal, setShowBookingModal] = useState(false);

  const { data: lead, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Lead not found</p>
      </div>
    );
  }

  const statusConfig = STATUS_FLOW[lead.status as LeadStatus];

  const handleGetDirections = () => {
    const address = encodeURIComponent(
      `${lead.property_address_street}, ${lead.property_address_suburb}, VIC ${lead.property_address_postcode}`
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const handleApproveReport = async () => {
    const { error } = await supabase
      .from('leads')
      .update({ status: 'inspection_report_pdf_completed' })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    await supabase.from('activities').insert({
      lead_id: lead.id,
      activity_type: 'report_approved',
      title: 'Report Approved',
      description: 'Inspection report approved and ready to send',
    });

    toast.success('✅ Report approved! Ready to send to customer.');
    window.location.reload();
  };

  const handleSendReportToCustomer = async () => {
    const { error } = await supabase
      .from('leads')
      .update({ status: 'job_waiting' })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to send report');
      return;
    }

    await supabase.from('activities').insert({
      lead_id: lead.id,
      activity_type: 'report_sent',
      title: 'Report Sent to Customer',
      description: 'Inspection report emailed to customer with booking link',
    });

    toast.success('✅ Report sent to customer!');
    window.location.reload();
  };

  const handleCopyBookingLink = () => {
    const bookingUrl = `${window.location.origin}/book/${lead.id}`;
    navigator.clipboard.writeText(bookingUrl);
    toast.success('📋 Booking link copied to clipboard!');
  };

  const handleMarkAsPaid = async () => {
    const { error } = await supabase
      .from('leads')
      .update({ status: 'google_review' })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to mark as paid');
      return;
    }

    await supabase.from('activities').insert({
      lead_id: lead.id,
      activity_type: 'payment_received',
      title: 'Payment Received',
      description: 'Job marked as paid',
    });

    toast.success('✅ Marked as paid!');
    window.location.reload();
  };

  const handleSendReviewRequest = async () => {
    await supabase.from('activities').insert({
      lead_id: lead.id,
      activity_type: 'review_requested',
      title: 'Review Request Sent',
      description: 'Google review request sent to customer',
    });

    toast.success('⭐ Review request sent!');
  };

  const handleReviewReceived = async () => {
    const { error } = await supabase
      .from('leads')
      .update({ status: 'finished' })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    await supabase.from('activities').insert({
      lead_id: lead.id,
      activity_type: 'review_received',
      title: 'Review Received',
      description: 'Customer left a Google review',
    });

    toast.success('✅ Review received! Job finished.');
    window.location.reload();
  };

  const handleSkipReview = async () => {
    const { error } = await supabase
      .from('leads')
      .update({ status: 'finished' })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    await supabase.from('activities').insert({
      lead_id: lead.id,
      activity_type: 'review_skipped',
      title: 'Review Skipped',
      description: 'Review request skipped',
    });

    toast.success('⏭️ Review skipped. Job finished.');
    window.location.reload();
  };

  const renderActionButtons = () => {
    const status = lead.status as LeadStatus;

    switch (status) {
      case "new_lead":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={() => window.location.href = `tel:${lead.phone}`}>
              <Phone className="h-4 w-4 mr-2" /> Call Customer
            </Button>
            <Button size="lg" onClick={() => setShowBookingModal(true)}>
              <Calendar className="h-4 w-4 mr-2" /> Book Inspection
            </Button>
          </div>
        );

      case "contacted":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={handleGetDirections}>
              <MapPin className="h-4 w-4 mr-2" /> Get Directions
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = `tel:${lead.phone}`}>
              <Phone className="h-4 w-4 mr-2" /> Call Customer
            </Button>
          </div>
        );

      case "inspection_waiting":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={handleGetDirections}>
              <MapPin className="h-4 w-4 mr-2" /> Get Directions
            </Button>
            <Button size="lg" onClick={() => navigate(`/inspection/${lead.id}`)}>
              📋 Start Inspection
            </Button>
          </div>
        );

      case "inspection_completed":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={() => navigate(`/inspection/${lead.id}`)}>
              👁️ Preview Report
            </Button>
            <Button size="lg" onClick={handleApproveReport}>
              ✅ Approve & Send Report
            </Button>
          </div>
        );

      case "inspection_report_pdf_completed":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={() => navigate(`/inspection/${lead.id}`)}>
              📄 Review Inspection Report PDF
            </Button>
            <Button size="lg" onClick={handleSendReportToCustomer}>
              📧 Send Report to Customer
            </Button>
          </div>
        );

      case "job_waiting":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={() => window.location.href = `tel:${lead.phone}`}>
              📞 Follow Up Call
            </Button>
            <Button size="lg" variant="outline" onClick={handleCopyBookingLink}>
              🔗 Copy Booking Link
            </Button>
          </div>
        );

      case "job_completed":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline">
              🚗 I'm On My Way
            </Button>
            <Button size="lg" variant="outline">
              📋 Start Job
            </Button>
            <Button size="lg">
              ✅ Complete Job
            </Button>
          </div>
        );

      case "job_report_pdf_sent":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline">
              📄 Preview Report
            </Button>
            <Button size="lg">
              📧 Send Completion Report
            </Button>
          </div>
        );

      case "invoicing_sent":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline">
              📄 View Invoice
            </Button>
            <Button size="lg" variant="outline">
              🔗 Copy Payment Link
            </Button>
            <Button size="lg">
              💳 Send Invoice
            </Button>
          </div>
        );

      case "paid":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={() => window.location.href = `tel:${lead.phone}`}>
              📞 Call Customer
            </Button>
            <Button size="lg" onClick={handleMarkAsPaid}>
              💰 Mark as Paid
            </Button>
          </div>
        );

      case "google_review":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={handleSendReviewRequest}>
              ⭐ Send Review Request
            </Button>
            <Button size="lg" variant="secondary" onClick={handleReviewReceived}>
              ✅ Review Received
            </Button>
            <Button size="lg" variant="outline" onClick={handleSkipReview}>
              ⏭️ Skip Review
            </Button>
          </div>
        );

      case "finished":
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline">
              📊 View Summary
            </Button>
            <Button size="lg" variant="outline">
              📄 Download All Reports
            </Button>
            <Button size="lg" variant="secondary">
              🔄 Reopen Job
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderTimeline = () => {
    const allStatuses = Object.keys(STATUS_FLOW) as LeadStatus[];
    const currentStatusIndex = allStatuses.indexOf(lead.status as LeadStatus);

    return (
      <div className="space-y-6">
        {allStatuses.map((status, index) => {
          const config = STATUS_FLOW[status];
          const isCompleted = index < currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isPending = index > currentStatusIndex;

          return (
            <div key={status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✅" : isCurrent ? "🔵" : "⏳"}
                </div>
                {index < allStatuses.length - 1 && (
                  <div
                    className={`w-0.5 h-12 ${
                      isCompleted ? "bg-green-500" : "bg-border"
                    }`}
                  />
                )}
              </div>

              <div className={`flex-1 pb-6 ${isCurrent ? "bg-accent p-4 rounded-lg" : ""}`}>
                <h3 className={`font-semibold ${isCurrent ? "text-lg" : ""}`}>
                  {config.title}
                </h3>
                {isCurrent && (
                  <>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.nextAction}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Action required
                    </p>
                  </>
                )}
                {isCompleted && activities && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed
                  </p>
                )}
                {isPending && (
                  <p className="text-xs text-muted-foreground mt-1">Pending...</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden">
      {/* Page Header */}
      <div className="bg-card border-b px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-[1920px] mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/leads")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>

          <div className="space-y-2 overflow-x-hidden w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
              {lead.lead_number} - {lead.full_name}
            </h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-muted-foreground w-full">
              <span className="flex items-center gap-1 break-words overflow-hidden">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="break-words">
                  {lead.property_address_street}, {lead.property_address_suburb} {lead.property_address_state} {lead.property_address_postcode}
                </span>
              </span>
              <span className="flex items-center gap-1 break-all overflow-hidden">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="break-all overflow-wrap-anywhere">
                  {lead.email}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4 flex-shrink-0" />
                {lead.phone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-[1920px] mx-auto">
        <Card className="border-l-4 overflow-x-hidden w-full" style={{ borderLeftColor: statusConfig.color }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl break-words">
                {iconMap[statusConfig.iconName] && 
                  React.createElement(iconMap[statusConfig.iconName], { size: 24, strokeWidth: 2 })
                }
                <span className="break-words">CURRENT STATUS: {statusConfig.title.toUpperCase()}</span>
              </CardTitle>
              <Badge variant="outline" className="self-start sm:self-center flex-shrink-0" style={{ borderColor: statusConfig.color, color: statusConfig.color }}>
                {statusConfig.title}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">📋 Next Action Required:</p>
              <p className="text-lg">{statusConfig.nextAction}</p>
            </div>

            {renderActionButtons()}

            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <Clock className="h-4 w-4" />
              Lead created {new Date(lead.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="max-w-[1920px] mx-auto">
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
            <TabsList className="w-full sm:w-auto inline-flex">
              <TabsTrigger value="overview" className="flex-shrink-0">Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-shrink-0">Timeline</TabsTrigger>
              <TabsTrigger value="inspection" className="flex-shrink-0">Inspection</TabsTrigger>
              <TabsTrigger value="invoice" className="flex-shrink-0">Invoice</TabsTrigger>
              <TabsTrigger value="files" className="flex-shrink-0">Files</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">Full Name</p>
                    <p className="break-words">{lead.full_name}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">Email</p>
                    <p className="break-all overflow-wrap-anywhere text-sm">{lead.email}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">Phone</p>
                    <p className="break-words">
                      <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">Lead Source</p>
                    <p className="break-words">{lead.lead_source || "Not specified"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted-foreground">Address</p>
                  <p className="break-words">{lead.property_address_street}</p>
                  <p className="break-words">{lead.property_address_suburb} {lead.property_address_state} {lead.property_address_postcode}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted-foreground">Property Type</p>
                  <p className="break-words">{lead.property_type || "Not specified"}</p>
                </div>
              </CardContent>
            </Card>

            {lead.issue_description && (
              <Card>
                <CardHeader>
                  <CardTitle>Issue Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="break-words whitespace-pre-wrap">{lead.issue_description}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Timeline</CardTitle>
              </CardHeader>
              <CardContent>{renderTimeline()}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspection" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Inspection details will appear here once inspection is scheduled
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Invoice details will appear here once created
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Files and documents will appear here
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Booking Modal */}
      <BookInspectionModal
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        leadId={lead.id}
        leadNumber={lead.lead_number || ""}
        customerName={lead.full_name}
        propertyAddress={`${lead.property_address_street}, ${lead.property_address_suburb}`}
      />
    </div>
  );
}
