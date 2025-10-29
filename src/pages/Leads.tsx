import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ArrowLeft } from "lucide-react";
import { STATUS_FLOW, ALL_STATUSES, LeadStatus } from "@/lib/statusFlow";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";

export default function Leads() {
  const navigate = useNavigate();
  const [showAddLead, setShowAddLead] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading pipeline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
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

      {/* Pipeline */}
      <div className="container mx-auto px-4 py-6">
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
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
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-sm uppercase tracking-wide">
                        {config.shortTitle}
                      </h2>
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

                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="p-4 space-y-3">
                      {statusLeads.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No leads
                        </p>
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
                                <span className="text-lg">{config.icon}</span>
                              </div>
                              <h3 className="font-semibold">{lead.full_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                📍 {lead.property_address_suburb}, {lead.property_address_state}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                📅 {new Date(lead.created_at).toLocaleDateString()}
                              </p>
                              {lead.assigned_to && (
                                <p className="text-xs text-muted-foreground">
                                  👤 Assigned
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
        </ScrollArea>
      </div>

      {/* Add Lead Dialog */}
      <AddLeadDialog open={showAddLead} onOpenChange={setShowAddLead} />
    </div>
  );
}
