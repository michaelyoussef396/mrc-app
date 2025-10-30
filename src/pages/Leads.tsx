import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  CheckCircle,
  CheckCircle2,
  Clock,
  FileText,
  FileCheck,
  Wrench,
  Send,
  Star,
  PartyPopper,
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

export default function Leads() {
  const navigate = useNavigate();
  const [showAddLead, setShowAddLead] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
