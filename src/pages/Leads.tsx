import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_FLOW, ALL_STATUSES, LeadStatus } from "@/lib/statusFlow";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading pipeline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="bg-card border-b overflow-x-hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold">Lead Pipeline</h1>
            </div>
            <Button onClick={() => setShowAddLead(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Add New Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop: Horizontal Pipeline with Scroll Buttons */}
      <div className="hidden md:block overflow-x-hidden">
        <div className="container mx-auto px-4 py-6 max-w-full">
          <div className="relative overflow-x-hidden">
            {/* Left Scroll Button */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 shadow-lg"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Pipeline Container */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto overflow-y-hidden scroll-smooth"
              style={{ scrollbarWidth: "thin" }}
            >
              <div className="flex gap-4 pb-4 px-12" style={{ minWidth: "max-content" }}>
                {ALL_STATUSES.map((status) => {
                  const config = STATUS_FLOW[status];
                  const statusLeads = groupedLeads[status] || [];

                  return (
                    <Card
                      key={status}
                      className="w-80 flex-shrink-0 border-t-4"
                      style={{ borderTopColor: config.color }}
                    >
                      <div className="p-4 border-b bg-muted/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{config.icon}</span>
                            <h2 className="font-bold text-sm uppercase tracking-wide">
                              {config.shortTitle}
                            </h2>
                          </div>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.color,
                            }}
                          >
                            {statusLeads.length}
                          </Badge>
                        </div>
                      </div>

                      <ScrollArea className="h-[calc(100vh-280px)]">
                        <div className="p-4 space-y-3">
                          {statusLeads.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="text-3xl mb-2 opacity-30">{config.icon}</div>
                              <p className="text-sm text-muted-foreground">No leads</p>
                            </div>
                          ) : (
                            statusLeads.map((lead) => (
                              <Card
                                key={lead.id}
                                className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4"
                                style={{ borderLeftColor: config.color }}
                                onClick={() => navigate(`/leads/${lead.id}`)}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {lead.lead_number}
                                    </span>
                                  </div>
                                  <h3 className="font-semibold text-sm">{lead.full_name}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    📍 {lead.property_address_suburb}, {lead.property_address_state}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    📅 {new Date(lead.created_at).toLocaleDateString()}
                                  </p>
                                  {lead.quoted_amount && (
                                    <p className="text-xs font-semibold text-primary">
                                      💰 ${lead.quoted_amount.toLocaleString()}
                                    </p>
                                  )}
                                  <Button size="sm" variant="ghost" className="w-full mt-2">
                                    View Details →
                                  </Button>
                                </div>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right Scroll Button */}
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 shadow-lg"
              onClick={scrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: Vertical Accordion */}
      <div className="md:hidden px-4 py-6">
        <Accordion type="single" collapsible className="w-full">
          {ALL_STATUSES.map((status) => {
            const config = STATUS_FLOW[status];
            const statusLeads = groupedLeads[status] || [];

            return (
              <AccordionItem key={status} value={status}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{config.icon}</span>
                      <div className="text-left">
                        <div className="font-bold text-sm uppercase tracking-wide">
                          {config.shortTitle}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {config.title}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: config.bgColor,
                        color: config.color,
                      }}
                    >
                      {statusLeads.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {statusLeads.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No leads in this stage</p>
                      </div>
                    ) : (
                      statusLeads.map((lead) => (
                        <Card
                          key={lead.id}
                          className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4"
                          style={{ borderLeftColor: config.color }}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-mono text-muted-foreground">
                                {lead.lead_number}
                              </span>
                            </div>
                            <h3 className="font-semibold">{lead.full_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              📍 {lead.property_address_suburb}, {lead.property_address_state}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              📅 {new Date(lead.created_at).toLocaleDateString()}
                            </p>
                            {lead.quoted_amount && (
                              <p className="text-sm font-semibold text-primary">
                                💰 ${lead.quoted_amount.toLocaleString()} inc GST
                              </p>
                            )}
                            <Button size="sm" variant="outline" className="w-full mt-2">
                              View Details →
                            </Button>
                          </div>
                        </Card>
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
