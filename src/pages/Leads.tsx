import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { generateInspectionPDF } from "@/lib/api/pdfGeneration";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  DollarSign,
  Sparkles,
  CheckCircle2,
  Clock,
  FileCheck2,
  RefreshCw,
  Mail,
  XCircle,
  Loader2
} from "lucide-react";
import { STATUS_FLOW, ALL_STATUSES, LeadStatus } from "@/lib/statusFlow";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Icon mapping for Stage 1 statuses
const iconMap: Record<string, any> = {
  Sparkles,
  Clock,
  FileCheck2,
  Mail,
  CheckCircle2,
  XCircle,
};

export default function Leads() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAddLead, setShowAddLead] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track PDF generation status for leads in approve_inspection_report stage
  const [pdfStatus, setPdfStatus] = useState<Record<string, 'generating' | 'ready' | 'failed'>>({});

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const groupedLeads = ALL_STATUSES.reduce((acc, status) => {
    acc[status] = leads?.filter((lead) => lead.status === status) || [];
    return acc;
  }, {} as Record<LeadStatus, any[]>);

  // Check PDF status for leads in the approve_inspection_report stage
  useEffect(() => {
    const checkPDFStatus = async () => {
      if (!leads) return;

      const genReportLeads = leads.filter(l => l.status === 'approve_inspection_report');

      for (const lead of genReportLeads) {
        const { data: inspection } = await supabase
          .from('inspections')
          .select('pdf_url, pdf_generated_at')
          .eq('lead_id', lead.id)
          .single();

        setPdfStatus(prev => ({
          ...prev,
          [lead.id]: inspection?.pdf_url ? 'ready' : 'generating'
        }));
      }
    };

    checkPDFStatus();
    const interval = setInterval(checkPDFStatus, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [leads]);

  // Regenerate PDF for a lead
  const handleRegeneratePDF = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't open lead detail

    const { data: inspection } = await supabase
      .from('inspections')
      .select('id')
      .eq('lead_id', leadId)
      .single();

    if (!inspection) {
      toast({ title: 'Error', description: 'No inspection found', variant: 'destructive' });
      return;
    }

    setPdfStatus(prev => ({ ...prev, [leadId]: 'generating' }));

    try {
      const result = await generateInspectionPDF(inspection.id, { regenerate: true });
      setPdfStatus(prev => ({ ...prev, [leadId]: result.success ? 'ready' : 'failed' }));
      toast({
        title: result.success ? 'PDF regenerated' : 'Generation failed',
        description: result.success ? 'Report is ready for review' : 'Please try again',
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error) {
      setPdfStatus(prev => ({ ...prev, [leadId]: 'failed' }));
      toast({ title: 'Error', description: 'Failed to regenerate PDF', variant: 'destructive' });
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F7' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#007AFF' }} />
          <p className="text-sm font-medium" style={{ color: '#86868B' }}>Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leads-pipeline-page">
      {/* Page Header */}
      <div className="pipeline-header">
        <div className="header-container">
          <div className="header-content">
            <button 
              className="back-btn-apple"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <div className="header-title-group">
              <h1 className="page-title-apple">Lead Pipeline</h1>
              <p className="page-subtitle-apple">
                Manage your leads through the sales pipeline
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddLead(true)} 
            className="add-lead-btn-apple"
          >
            <Plus className="h-5 w-5 mr-2" strokeWidth={2} />
            Add New Lead
          </Button>
        </div>
      </div>

      {/* Desktop: Horizontal Pipeline with Scroll Buttons */}
      <div className="hidden md:block pipeline-desktop">
        <div className="pipeline-container">
          <div className="pipeline-scroll-wrapper">
            {/* Left Scroll Button */}
            <button
              className="scroll-btn scroll-btn-left"
              onClick={scrollLeft}
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>

            {/* Pipeline Container */}
            <div
              ref={scrollContainerRef}
              className="pipeline-columns-wrapper"
            >
              <div className="pipeline-columns">
                {ALL_STATUSES.map((status) => {
                  const config = STATUS_FLOW[status];
                  const statusLeads = groupedLeads[status] || [];
                  const IconComponent = iconMap[config.iconName];

                  return (
                    <div
                      key={status}
                      className="pipeline-column"
                      style={{ borderTopColor: config.color }}
                    >
                      <div className="column-header" style={{ background: config.bgColor }}>
                        <div className="column-header-content">
                          <div className="column-icon-wrapper" style={{ background: config.color }}>
                            {IconComponent && <IconComponent size={18} strokeWidth={2} />}
                          </div>
                          <h2 className="column-title">
                            {config.shortTitle}
                          </h2>
                        </div>
                        <Badge
                          className="column-badge"
                          style={{
                            backgroundColor: config.color,
                            color: 'white',
                          }}
                        >
                          {statusLeads.length}
                        </Badge>
                      </div>

                      <ScrollArea className="column-scroll-area">
                        <div className="column-leads">
                          {statusLeads.length === 0 ? (
                            <div className="empty-column">
                              <div className="empty-icon-wrapper" style={{ color: config.color, opacity: 0.3 }}>
                                {IconComponent && <IconComponent size={32} strokeWidth={1.5} />}
                              </div>
                              <p className="empty-text">No leads</p>
                            </div>
                          ) : (
                            statusLeads.map((lead) => (
                              <div
                                key={lead.id}
                                className="lead-card"
                                style={{ borderLeftColor: config.color }}
                                onClick={() => navigate(`/leads/${lead.id}`)}
                              >
                                <div className="lead-card-content">
                                  <span className="lead-number">
                                    {lead.lead_number}
                                  </span>
                                  <h3 className="lead-name">{lead.full_name}</h3>
                                  <div className="lead-info">
                                    <MapPin size={12} strokeWidth={2} />
                                    <span>{lead.property_address_suburb}, {lead.property_address_state}</span>
                                  </div>
                                  <div className="lead-info">
                                    <Calendar size={12} strokeWidth={2} />
                                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                  </div>
                                  {lead.quoted_amount && (
                                    <div className="lead-amount">
                                      <DollarSign size={12} strokeWidth={2} />
                                      <span>${lead.quoted_amount.toLocaleString()}</span>
                                    </div>
                                  )}
                                  <button className="view-details-btn">
                                    View Details →
                                  </button>

                                  {/* PDF Approval Stage Actions */}
                                  {lead.status === 'approve_inspection_report' && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      {pdfStatus[lead.id] === 'generating' ? (
                                        <div className="flex items-center gap-2 text-purple-600">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span className="text-sm">Generating PDF...</span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-2">
                                          <Button
                                            size="sm"
                                            className="w-full h-12 bg-purple-600 hover:bg-purple-700"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              navigate(`/report/${lead.id}`);
                                            }}
                                          >
                                            <FileCheck2 className="h-4 w-4 mr-2" /> View & Edit PDF
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full h-12"
                                            onClick={(e) => handleRegeneratePDF(lead.id, e)}
                                          >
                                            <RefreshCw className="h-4 w-4 mr-2" /> Regenerate PDF
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Scroll Button */}
            <button
              className="scroll-btn scroll-btn-right"
              onClick={scrollRight}
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: Vertical Accordion */}
      <div className="md:hidden pipeline-mobile">
        <Accordion type="single" collapsible className="w-full">
          {ALL_STATUSES.map((status) => {
            const config = STATUS_FLOW[status];
            const statusLeads = groupedLeads[status] || [];
            const IconComponent = iconMap[config.iconName];

            return (
              <AccordionItem key={status} value={status} className="mobile-accordion-item">
                <AccordionTrigger className="mobile-accordion-trigger">
                  <div className="mobile-trigger-content">
                    <div className="mobile-trigger-left">
                      <div className="mobile-icon-wrapper" style={{ background: config.color }}>
                        {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                      </div>
                      <div className="mobile-title-group">
                        <div className="mobile-title">
                          {config.shortTitle}
                        </div>
                        <div className="mobile-subtitle">
                          {config.title}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className="mobile-badge"
                      style={{
                        backgroundColor: config.color,
                        color: 'white',
                      }}
                    >
                      {statusLeads.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="mobile-accordion-content">
                  <div className="mobile-leads-list">
                    {statusLeads.length === 0 ? (
                      <div className="mobile-empty-state">
                        <p>No leads in this stage</p>
                      </div>
                    ) : (
                      statusLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="mobile-lead-card"
                          style={{ borderLeftColor: config.color }}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          <div className="mobile-lead-content">
                            <span className="mobile-lead-number">
                              {lead.lead_number}
                            </span>
                            <h3 className="mobile-lead-name">{lead.full_name}</h3>
                            <div className="mobile-lead-info">
                              <MapPin size={12} strokeWidth={2} />
                              <span>{lead.property_address_suburb}, {lead.property_address_state}</span>
                            </div>
                            <div className="mobile-lead-info">
                              <Calendar size={12} strokeWidth={2} />
                              <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                            </div>
                            {lead.quoted_amount && (
                              <div className="mobile-lead-amount">
                                <DollarSign size={12} strokeWidth={2} />
                                <span>${lead.quoted_amount.toLocaleString()} inc GST</span>
                              </div>
                            )}
                            <button className="mobile-view-btn">
                              View Details →
                            </button>

                            {/* PDF Approval Stage Actions - Mobile */}
                            {lead.status === 'approve_inspection_report' && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {pdfStatus[lead.id] === 'generating' ? (
                                  <div className="flex items-center gap-2 text-purple-600">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Generating PDF...</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <Button
                                      size="sm"
                                      className="w-full h-12 bg-purple-600 hover:bg-purple-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        navigate(`/report/${lead.id}`);
                                      }}
                                    >
                                      <FileCheck2 className="h-4 w-4 mr-2" /> View & Edit PDF
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full h-12"
                                      onClick={(e) => handleRegeneratePDF(lead.id, e)}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" /> Regenerate PDF
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Add Lead Dialog */}
      <AddLeadDialog open={showAddLead} onOpenChange={setShowAddLead} />
    </div>
  );
}
