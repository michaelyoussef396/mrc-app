import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Eye, Phone, Mail, ExternalLink, AlertCircle } from "lucide-react";
import { formatTimeAgo, isLeadUrgent } from "@/lib/leadUtils";
import { Link } from "react-router-dom";

export function WebLeadsWidget() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: webLeads, isLoading, refetch } = useQuery({
    queryKey: ["webLeads"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("lead_source", "Website Form")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    refetchInterval: autoRefresh ? 300000 : false, // Refresh every 5 minutes
  });

  const uncontactedCount = webLeads?.filter(lead => lead.status === "new_lead").length || 0;

  const getStatusBadge = (lead: any) => {
    if (lead.status === "new_lead") {
      const urgent = isLeadUrgent(lead.created_at, lead.status);
      return (
        <Badge variant={urgent ? "destructive" : "secondary"}>
          {urgent ? (
            <>
              <AlertCircle className="mr-1 h-3 w-3" />
              Uncontacted (Urgent)
            </>
          ) : (
            "⏰ Uncontacted"
          )}
        </Badge>
      );
    }
    
    if (lead.status === "inspection_waiting") {
      return <Badge variant="default">✅ Inspection Scheduled</Badge>;
    }
    
    return <Badge variant="outline">{lead.status}</Badge>;
  };

  const isNewLead = (createdAt: string) => {
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
    return new Date(createdAt) > fourHoursAgo;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌐 New Website Leads (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              🌐 New Website Leads (Last 7 Days)
            </CardTitle>
            {uncontactedCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {uncontactedCount} Uncontacted
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!webLeads || webLeads.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <div className="text-4xl">📭</div>
            <p className="text-muted-foreground">
              No website leads in the last 7 days
            </p>
            <p className="text-sm text-muted-foreground">
              Share your website to get more inquiries!
            </p>
          </div>
        ) : (
          <>
            {webLeads.map((lead) => (
              <div
                key={lead.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  isLeadUrgent(lead.created_at, lead.status)
                    ? "border-destructive bg-destructive/5"
                    : ""
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isNewLead(lead.created_at) && (
                      <Badge variant="secondary">🆕 NEW</Badge>
                    )}
                    <Link
                      to={`/leads/${lead.id}`}
                      className="font-medium hover:underline"
                    >
                      {lead.lead_number}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    📅 {formatTimeAgo(lead.created_at)}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="space-y-1">
                  <p className="font-medium">{lead.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    📍 {lead.property_address_suburb}, {lead.property_address_state}{" "}
                    {lead.property_address_postcode}
                  </p>
                  {lead.issue_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      💬 {lead.issue_description.substring(0, 80)}
                      {lead.issue_description.length > 80 ? "..." : ""}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <div>{getStatusBadge(lead)}</div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/leads/${lead.id}`}>
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="mr-1 h-3 w-3" />
                      Call
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${lead.email}`}>
                      <Mail className="mr-1 h-3 w-3" />
                      Email
                    </a>
                  </Button>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {webLeads.length} of {webLeads.length} web leads
              </p>
              <Button variant="link" asChild>
                <Link to="/leads?source=Website+Form">
                  View All Web Leads
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
