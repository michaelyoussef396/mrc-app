import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Phone, Calendar, MapPin, Eye, Send, CheckCircle, DollarSign, Star } from "lucide-react";
import { STATUS_FLOW, type LeadStatus } from "@/lib/statusFlow";
import { formatDistanceToNow } from "date-fns";

interface ActionItem {
  type: string;
  title: string;
  priority: 'urgent' | 'today' | 'pending';
  lead: any;
  time?: Date;
  waitingDays?: number;
  actions: string[];
}

export function ActionsRequired() {
  const navigate = useNavigate();

  const { data: actionsData, isLoading } = useQuery({
    queryKey: ["actionsRequired"],
    queryFn: async () => {
      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

      // Get all leads that need action
      const { data: leads, error } = await supabase
        .from("leads")
        .select(`
          *,
          calendar_bookings(start_datetime, end_datetime)
        `)
        .neq("status", "finished")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const actions: ActionItem[] = [];

      leads?.forEach((lead) => {
        let action: ActionItem | null = null;
        const leadCreated = new Date(lead.created_at);
        const leadUpdated = new Date(lead.updated_at);

        switch (lead.status as LeadStatus) {
          case "new_lead":
            action = {
              type: "call_and_book",
              title: "📞 CALL & BOOK INSPECTION",
              priority: leadCreated < fourHoursAgo ? "urgent" : "pending",
              lead: lead,
              actions: ["call", "book", "view"],
            };
            break;

          case "contacted":
            if (lead.calendar_bookings?.[0]?.start_datetime) {
              const inspectionDate = new Date(lead.calendar_bookings[0].start_datetime);
              if (inspectionDate >= startOfToday && inspectionDate < endOfToday) {
                action = {
                  type: "inspection_today",
                  title: "📋 START INSPECTION",
                  priority: "today",
                  lead: lead,
                  time: inspectionDate,
                  actions: ["directions", "start", "view"],
                };
              }
            }
            break;

          case "inspection_waiting":
            action = {
              type: "start_inspection",
              title: "📋 START INSPECTION",
              priority: "today",
              lead: lead,
              actions: ["on_way", "start", "view"],
            };
            break;

          case "inspection_completed":
            action = {
              type: "approve_report",
              title: "✅ APPROVE & SEND REPORT",
              priority: "pending",
              lead: lead,
              actions: ["preview", "approve", "view"],
            };
            break;

          case "inspection_report_pdf_completed":
            action = {
              type: "send_report",
              title: "📧 SEND REPORT TO CUSTOMER",
              priority: "pending",
              lead: lead,
              actions: ["send", "pdf", "view"],
            };
            break;

          case "job_waiting":
            const waitingDays = Math.floor(
              (now.getTime() - leadUpdated.getTime()) / (1000 * 60 * 60 * 24)
            );
            action = {
              type: "follow_up_job",
              title: "📞 FOLLOW UP - JOB NOT BOOKED",
              priority: waitingDays > 7 ? "urgent" : "pending",
              lead: lead,
              waitingDays: waitingDays,
              actions: ["call", "resend", "view"],
            };
            break;

          case "job_completed":
            if (lead.calendar_bookings?.[0]?.start_datetime) {
              const jobDate = new Date(lead.calendar_bookings[0].start_datetime);
              if (jobDate >= startOfToday && jobDate < endOfToday) {
                action = {
                  type: "job_today",
                  title: "🛠️ JOB SCHEDULED",
                  priority: "today",
                  lead: lead,
                  time: jobDate,
                  actions: ["on_way", "start", "view"],
                };
              }
            }
            break;

          case "paid":
            action = {
              type: "mark_paid",
              title: "💰 MARK PAYMENT RECEIVED",
              priority: "pending",
              lead: lead,
              actions: ["mark_paid", "follow_up", "view"],
            };
            break;

          case "google_review":
            action = {
              type: "request_review",
              title: "⭐ REQUEST GOOGLE REVIEW",
              priority: "pending",
              lead: lead,
              actions: ["send", "done", "view"],
            };
            break;
        }

        if (action) {
          actions.push(action);
        }
      });

      // Sort by priority
      const priorityOrder = { urgent: 1, today: 2, pending: 3 };
      actions.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.priority === "today" && a.time && b.time) {
          return a.time.getTime() - b.time.getTime();
        }
        return new Date(a.lead.created_at).getTime() - new Date(b.lead.created_at).getTime();
      });

      return actions;
    },
  });

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">⚡ Actions Required</h2>
          <Skeleton className="h-6 w-8 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const actions = actionsData || [];
  const displayActions = actions.slice(0, 5);
  const totalActions = actions.length;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">🔴 URGENT</Badge>;
      case "today":
        return <Badge className="bg-yellow-500">🟡 TODAY</Badge>;
      case "pending":
        return <Badge className="bg-green-500">🟢 PENDING</Badge>;
      default:
        return null;
    }
  };

  const handleAction = (action: ActionItem, actionType: string) => {
    switch (actionType) {
      case "call":
        window.location.href = `tel:${action.lead.phone}`;
        break;
      case "view":
        navigate(`/leads/${action.lead.id}`);
        break;
      case "book":
      case "start":
      case "directions":
      case "approve":
      case "send":
      case "mark_paid":
      case "done":
        navigate(`/leads/${action.lead.id}`);
        break;
    }
  };

  if (totalActions === 0) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">⚡ Actions Required</h2>
          <Badge variant="outline">0</Badge>
        </div>
        <Card className="p-8 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-lg font-semibold text-foreground mb-1">
            All caught up! No actions required.
          </p>
          <p className="text-sm text-muted-foreground">
            Great work keeping on top of leads!
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">⚡ Actions Required</h2>
          <Badge variant="destructive" className="rounded-full">
            {totalActions}
          </Badge>
        </div>
        {totalActions > 5 && (
          <Button variant="link" onClick={() => navigate("/leads")}>
            View All Actions →
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {displayActions.map((action, index) => (
          <Card
            key={index}
            className="p-4 hover:shadow-md transition-shadow border-l-4"
            style={{
              borderLeftColor:
                action.priority === "urgent"
                  ? "#ef4444"
                  : action.priority === "today"
                  ? "#eab308"
                  : "#22c55e",
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getPriorityBadge(action.priority)}
                    <span className="text-xs text-muted-foreground">
                      {action.lead.lead_number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {action.lead.full_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {action.lead.property_address_suburb}, {action.lead.property_address_state}
                    </span>
                    <span>
                      {action.time
                        ? `🕐 Today at ${action.time.toLocaleTimeString("en-AU", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : action.waitingDays
                        ? `⏱️ Waiting ${action.waitingDays} days`
                        : `⏱️ ${formatDistanceToNow(new Date(action.lead.created_at), {
                            addSuffix: true,
                          })}`}
                    </span>
                  </div>
                  {action.lead.quoted_amount && (
                    <p className="text-sm font-semibold text-primary mt-1">
                      💰 Quote: ${action.lead.quoted_amount.toLocaleString()} inc GST
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {action.actions.includes("call") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(action, "call")}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                )}
                {action.actions.includes("book") && (
                  <Button size="sm" onClick={() => handleAction(action, "book")}>
                    <Calendar className="h-4 w-4 mr-1" />
                    Book
                  </Button>
                )}
                {action.actions.includes("start") && (
                  <Button size="sm" onClick={() => handleAction(action, "start")}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                {action.actions.includes("directions") && (
                  <Button size="sm" variant="outline" onClick={() => handleAction(action, "directions")}>
                    <MapPin className="h-4 w-4 mr-1" />
                    Directions
                  </Button>
                )}
                {action.actions.includes("preview") && (
                  <Button size="sm" variant="outline" onClick={() => handleAction(action, "view")}>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                )}
                {action.actions.includes("approve") && (
                  <Button size="sm" onClick={() => handleAction(action, "approve")}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve & Send
                  </Button>
                )}
                {action.actions.includes("send") && (
                  <Button size="sm" onClick={() => handleAction(action, "send")}>
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                )}
                {action.actions.includes("mark_paid") && (
                  <Button size="sm" onClick={() => handleAction(action, "mark_paid")}>
                    <DollarSign className="h-4 w-4 mr-1" />
                    Mark Paid
                  </Button>
                )}
                {action.actions.includes("done") && (
                  <Button size="sm" onClick={() => handleAction(action, "done")}>
                    <Star className="h-4 w-4 mr-1" />
                    Review Received
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(action, "view")}
                >
                  View Lead →
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {totalActions > 5 && (
        <div className="mt-3 text-center">
          <p className="text-sm text-muted-foreground">
            Showing 5 of {totalActions} actions •{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/leads")}>
              View All Actions →
            </Button>
          </p>
        </div>
      )}
    </section>
  );
}
