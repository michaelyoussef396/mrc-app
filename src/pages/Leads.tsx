import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Phone, 
  MessageSquare, 
  Mail, 
  Calendar,
  CheckCircle,
  FileText,
  DollarSign,
  Star,
  Download,
  Send,
  Eye,
  Clock,
  MapPin,
  User,
  Grid3x3,
  List
} from "lucide-react";

type LeadStatus = 
  | "NEW_LEAD"
  | "CONTACTED"
  | "INSPECTION_WAITING"
  | "INSPECTION_COMPLETED"
  | "REPORT_PDF_READY"
  | "JOB_WAITING"
  | "JOB_COMPLETED"
  | "REPORT_SENT"
  | "INVOICING_SENT"
  | "PAID"
  | "REVIEW"
  | "FINISHED";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: LeadStatus;
  createdAt: string;
  metadata: {
    [key: string]: any;
  };
}

const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  NEW_LEAD: { label: "New Lead", color: "text-blue-600", bgColor: "bg-blue-100" },
  CONTACTED: { label: "Contacted", color: "text-blue-500", bgColor: "bg-blue-50" },
  INSPECTION_WAITING: { label: "Inspection Waiting", color: "text-purple-600", bgColor: "bg-purple-100" },
  INSPECTION_COMPLETED: { label: "Inspection Completed", color: "text-purple-500", bgColor: "bg-purple-50" },
  REPORT_PDF_READY: { label: "Report PDF Ready", color: "text-purple-400", bgColor: "bg-purple-50" },
  JOB_WAITING: { label: "Job Waiting", color: "text-amber-600", bgColor: "bg-amber-100" },
  JOB_COMPLETED: { label: "Job Completed", color: "text-amber-500", bgColor: "bg-amber-50" },
  REPORT_SENT: { label: "Report Sent", color: "text-amber-400", bgColor: "bg-amber-50" },
  INVOICING_SENT: { label: "Invoicing Sent", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  PAID: { label: "Paid", color: "text-emerald-500", bgColor: "bg-emerald-50" },
  REVIEW: { label: "Review", color: "text-indigo-600", bgColor: "bg-indigo-100" },
  FINISHED: { label: "Finished", color: "text-gray-600", bgColor: "bg-gray-100" },
};

const dummyLeads: Lead[] = [
  {
    id: "1",
    name: "Alex Thompson",
    email: "alex.t@email.com",
    phone: "0412 111 222",
    address: "23 River St, Hawthorn VIC 3122",
    status: "NEW_LEAD",
    createdAt: "30 minutes ago",
    metadata: {
      issue: "Ceiling mould after roof leak",
      urgency: "High",
    },
  },
  {
    id: "2",
    name: "Emma Wilson",
    email: "emma.wilson@gmail.com",
    phone: "0423 456 789",
    address: "12 Oak Ave, Ringwood VIC 3134",
    status: "CONTACTED",
    createdAt: "Yesterday 3:30 PM",
    metadata: {
      lastContact: "Yesterday 3:30 PM",
      notes: "Interested, wants quote first",
      followUp: "Tomorrow",
    },
  },
  {
    id: "3",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "0412 345 678",
    address: "45 High St, Croydon VIC 3136",
    status: "INSPECTION_WAITING",
    createdAt: "2 days ago",
    metadata: {
      inspectionDate: "Tomorrow 10:00 AM",
      technician: "Sarah Martinez",
      duration: "2 hours",
    },
  },
  {
    id: "4",
    name: "Sarah Taylor",
    email: "sarah.t@email.com",
    phone: "0445 678 901",
    address: "23 Park St, Glen Waverley VIC 3150",
    status: "INSPECTION_COMPLETED",
    createdAt: "Today 11:30 AM",
    metadata: {
      completed: "Today 11:30 AM",
      technician: "Sarah Martinez",
      findings: "Moderate mould, demo required",
      estimated: "$2,450",
    },
  },
  {
    id: "5",
    name: "Michael Chen",
    email: "m.chen@outlook.com",
    phone: "0434 567 890",
    address: "78 Main Rd, Box Hill VIC 3128",
    status: "REPORT_PDF_READY",
    createdAt: "1 hour ago",
    metadata: {
      report: "MRC-2025-0042",
      generated: "1 hour ago",
      quote: "$2,450.00",
    },
  },
  {
    id: "6",
    name: "Lisa Brown",
    email: "lisa.brown22@gmail.com",
    phone: "0467 890 123",
    address: "89 Beach Rd, Frankston VIC 3199",
    status: "JOB_WAITING",
    createdAt: "3 days ago",
    metadata: {
      scheduled: "Friday 15 Mar, 9:00 AM",
      technician: "Michael Chen",
      duration: "8 hours",
      value: "$2,695.00 (inc GST)",
    },
  },
  {
    id: "7",
    name: "Robert Kim",
    email: "rob.kim@company.com",
    phone: "0456 789 012",
    address: "56 River Rd, Doncaster VIC 3108",
    status: "JOB_COMPLETED",
    createdAt: "Today 5:00 PM",
    metadata: {
      completed: "Today 5:00 PM",
      technician: "Michael Chen",
      actualTime: "7.5 hours",
      photos: "24",
    },
  },
  {
    id: "8",
    name: "David Martinez",
    email: "david.m@email.com",
    phone: "0478 901 234",
    address: "34 Hill St, Carlton VIC 3053",
    status: "REPORT_SENT",
    createdAt: "1 hour ago",
    metadata: {
      reportSent: "1 hour ago",
      opened: "Yes (30 min ago)",
      status: "Ready to invoice",
    },
  },
  {
    id: "9",
    name: "Jennifer Lee",
    email: "jen.lee@company.com.au",
    phone: "0489 012 345",
    address: "67 Lake Dr, Clayton VIC 3168",
    status: "INVOICING_SENT",
    createdAt: "Today 6:00 PM",
    metadata: {
      invoice: "INV-2025-0042",
      amount: "$2,695.00 (inc GST)",
      sent: "Today 6:00 PM",
      due: "28 Mar 2025",
    },
  },
  {
    id: "10",
    name: "Tom Anderson",
    email: "tom.a@email.com",
    phone: "0491 123 456",
    address: "12 Beach Rd, Brighton VIC 3186",
    status: "PAID",
    createdAt: "Today 7:30 PM",
    metadata: {
      paid: "Today 7:30 PM",
      amount: "$3,200.00",
      method: "Bank Transfer",
    },
  },
  {
    id: "11",
    name: "Sophie Martin",
    email: "sophie.m@gmail.com",
    phone: "0492 234 567",
    address: "45 Park Ave, Kew VIC 3101",
    status: "REVIEW",
    createdAt: "2 hours ago",
    metadata: {
      reviewRequested: "2 hours ago",
      status: "Awaiting response",
    },
  },
  {
    id: "12",
    name: "James Wilson",
    email: "james.w@email.com",
    phone: "0493 345 678",
    address: "78 High St, Northcote VIC 3070",
    status: "FINISHED",
    createdAt: "10 Mar 2025",
    metadata: {
      completed: "10 Mar 2025",
      value: "$2,450.00",
      review: "⭐⭐⭐⭐⭐",
    },
  },
];

export default function Leads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);

  const statusCounts = dummyLeads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredLeads = dummyLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === "ALL" || lead.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const renderLeadCard = (lead: Lead) => {
    const config = statusConfig[lead.status];
    
    return (
      <Card key={lead.id} className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <Badge className={`${config.bgColor} ${config.color} border-0`}>
              {config.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Change Status</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {lead.name}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {lead.email}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {lead.phone}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {lead.address}
            </p>
          </div>

          <div className="border-t pt-4 mb-4">
            {renderStageSpecificInfo(lead)}
          </div>

          <div className="flex flex-wrap gap-2">
            {renderStageSpecificActions(lead)}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStageSpecificInfo = (lead: Lead) => {
    const { metadata } = lead;
    
    switch (lead.status) {
      case "NEW_LEAD":
        return (
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Received: {metadata.issue}
            </p>
            <p className="font-medium">Issue: {metadata.issue}</p>
            <p className="text-red-600">Urgency: {metadata.urgency}</p>
          </div>
        );
      
      case "CONTACTED":
        return (
          <div className="space-y-1 text-sm">
            <p>📞 Last Contact: {metadata.lastContact}</p>
            <p>💬 Notes: {metadata.notes}</p>
            <p>📅 Follow up: {metadata.followUp}</p>
          </div>
        );
      
      case "INSPECTION_WAITING":
        return (
          <div className="space-y-1 text-sm">
            <p>📅 Inspection: {metadata.inspectionDate}</p>
            <p>👤 Technician: {metadata.technician}</p>
            <p>⏱️ Duration: {metadata.duration}</p>
          </div>
        );
      
      case "INSPECTION_COMPLETED":
        return (
          <div className="space-y-1 text-sm">
            <p>✅ Completed: {metadata.completed}</p>
            <p>👤 Technician: {metadata.technician}</p>
            <p>📊 Findings: {metadata.findings}</p>
            <p className="font-semibold">💰 Estimated: {metadata.estimated}</p>
          </div>
        );
      
      case "REPORT_PDF_READY":
        return (
          <div className="space-y-1 text-sm">
            <p>📄 Report: {metadata.report}</p>
            <p>📅 Generated: {metadata.generated}</p>
            <p className="font-semibold">💰 Quote: {metadata.quote}</p>
          </div>
        );
      
      case "JOB_WAITING":
        return (
          <div className="space-y-1 text-sm">
            <p>📅 Scheduled: {metadata.scheduled}</p>
            <p>👤 Technician: {metadata.technician}</p>
            <p>⏱️ Duration: {metadata.duration}</p>
            <p className="font-semibold">💰 Value: {metadata.value}</p>
          </div>
        );
      
      case "JOB_COMPLETED":
        return (
          <div className="space-y-1 text-sm">
            <p>✅ Completed: {metadata.completed}</p>
            <p>👤 Technician: {metadata.technician}</p>
            <p>⏱️ Actual Time: {metadata.actualTime}</p>
            <p>📸 Photos: {metadata.photos}</p>
          </div>
        );
      
      case "REPORT_SENT":
        return (
          <div className="space-y-1 text-sm">
            <p>📄 Report Sent: {metadata.reportSent}</p>
            <p>✅ Opened: {metadata.opened}</p>
            <p>{metadata.status}</p>
          </div>
        );
      
      case "INVOICING_SENT":
        return (
          <div className="space-y-1 text-sm">
            <p>💰 Invoice: {metadata.invoice}</p>
            <p>📨 Sent: {metadata.sent}</p>
            <p className="font-semibold">💵 Amount: {metadata.amount}</p>
            <p>⏰ Due: {metadata.due}</p>
          </div>
        );
      
      case "PAID":
        return (
          <div className="space-y-1 text-sm">
            <p>✅ Paid: {metadata.paid}</p>
            <p className="font-semibold">💵 Amount: {metadata.amount}</p>
            <p>💳 Method: {metadata.method}</p>
          </div>
        );
      
      case "REVIEW":
        return (
          <div className="space-y-1 text-sm">
            <p>⭐ Review Requested: {metadata.reviewRequested}</p>
            <p>📧 Status: {metadata.status}</p>
          </div>
        );
      
      case "FINISHED":
        return (
          <div className="space-y-1 text-sm">
            <p>✅ Completed: {metadata.completed}</p>
            <p>💰 Final Value: {metadata.value}</p>
            <p>⭐ Review: {metadata.review}</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderStageSpecificActions = (lead: Lead) => {
    switch (lead.status) {
      case "NEW_LEAD":
        return (
          <>
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4 mr-1" /> Call
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquare className="h-4 w-4 mr-1" /> SMS
            </Button>
            <Button size="sm" variant="outline">
              <Mail className="h-4 w-4 mr-1" /> Email
            </Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              Mark Contacted
            </Button>
          </>
        );
      
      case "CONTACTED":
        return (
          <>
            <Button size="sm" variant="outline">Call Again</Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              Schedule Inspection
            </Button>
            <Button size="sm" variant="outline">Send Quote</Button>
          </>
        );
      
      case "INSPECTION_WAITING":
        return (
          <>
            <Button size="sm" variant="outline">View Details</Button>
            <Button size="sm" variant="outline">Reschedule</Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              Start Inspection
            </Button>
          </>
        );
      
      case "INSPECTION_COMPLETED":
        return (
          <>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              <FileText className="h-4 w-4 mr-1" /> Generate Report
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" /> View Photos
            </Button>
          </>
        );
      
      case "REPORT_PDF_READY":
        return (
          <>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" /> Preview PDF
            </Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              <Send className="h-4 w-4 mr-1" /> Send to Customer
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
          </>
        );
      
      case "JOB_WAITING":
        return (
          <>
            <Button size="sm" variant="outline">View Schedule</Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              Start Job
            </Button>
            <Button size="sm" variant="outline">Reschedule</Button>
          </>
        );
      
      case "JOB_COMPLETED":
        return (
          <>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              <FileText className="h-4 w-4 mr-1" /> Generate Report
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" /> View Photos
            </Button>
          </>
        );
      
      case "REPORT_SENT":
        return (
          <>
            <Button size="sm" variant="outline">Resend Report</Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              <DollarSign className="h-4 w-4 mr-1" /> Send Invoice
            </Button>
          </>
        );
      
      case "INVOICING_SENT":
        return (
          <>
            <Button size="sm" variant="outline">View Invoice</Button>
            <Button size="sm" variant="outline">Send Reminder</Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
            </Button>
          </>
        );
      
      case "PAID":
        return (
          <>
            <Button size="sm" variant="outline">Send Receipt</Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              <Star className="h-4 w-4 mr-1" /> Request Review
            </Button>
          </>
        );
      
      case "REVIEW":
        return (
          <>
            <Button size="sm" variant="outline">View Review</Button>
            <Button size="sm" variant="outline">Send Reminder</Button>
            <Button size="sm" style={{ backgroundColor: "#121D73", color: "white" }}>
              Mark Finished
            </Button>
          </>
        );
      
      case "FINISHED":
        return (
          <>
            <Button size="sm" variant="outline">View Summary</Button>
            <Button size="sm" variant="outline">Archive</Button>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Leads & Jobs</h1>
            <Dialog open={isNewLeadDialogOpen} onOpenChange={setIsNewLeadDialogOpen}>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: "#121D73", color: "white" }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new lead
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input placeholder="John Smith" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" placeholder="john@email.com" />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input placeholder="0412 345 678" />
                  </div>
                  <div>
                    <Label>Address *</Label>
                    <Input placeholder="45 High St, Croydon VIC 3136" />
                  </div>
                  <div>
                    <Label>Issue Description</Label>
                    <Textarea placeholder="Describe the mould issue..." />
                  </div>
                  <div>
                    <Label>Urgency</Label>
                    <Select>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsNewLeadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button style={{ backgroundColor: "#121D73", color: "white" }} className="flex-1">
                      Add Lead
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedStatus === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus("ALL")}
              className={selectedStatus === "ALL" ? "bg-primary text-primary-foreground" : ""}
            >
              All ({dummyLeads.length})
            </Button>
            {Object.entries(statusConfig).map(([status, config]) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(status as LeadStatus)}
                className={selectedStatus === status ? `${config.bgColor} ${config.color} hover:${config.bgColor}` : ""}
              >
                {config.label} ({statusCounts[status] || 0})
              </Button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">View:</span>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lead Cards */}
      <div className="container mx-auto px-4 py-6">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No leads found</p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
            {filteredLeads.map(renderLeadCard)}
          </div>
        )}
      </div>
    </div>
  );
}
