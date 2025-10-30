import { useState } from "react";
import { TopNavigation } from "@/components/dashboard/TopNavigation";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { LeadSourceAnalytics } from "@/components/reports/LeadSourceAnalytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search,
  Grid3x3,
  List,
  MoreVertical,
  Eye,
  Mail,
  Calendar,
  RefreshCw,
  Phone,
  MessageSquare,
  Edit,
  Trash2,
  CheckCircle,
  FileText,
  MapPin,
  User,
  DollarSign,
  Clock,
  CheckSquare,
  Send,
  AlertCircle,
  TrendingUp,
  Target,
} from "lucide-react";

type ReportStatus = "DRAFT" | "SENT" | "CONFIRMED" | "JOB_BOOKED";

interface Report {
  id: string;
  jobNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyAddress: string;
  status: ReportStatus;
  completedDate: string;
  sentDate?: string;
  confirmedDate?: string;
  bookedDate?: string;
  scheduledDate?: string;
  inspector: string;
  technician?: string;
  quoteAmount: number;
  areas: number;
  areasDetails?: string[];
  hasSubfloor: boolean;
  hasDemolition: boolean;
  equipment?: string[];
  daysWaiting?: number;
  followUpDue?: string;
}

const mockReports: Report[] = [
  {
    id: "1",
    jobNumber: "MRC-2025-0042",
    clientName: "John Smith",
    clientEmail: "john.smith@email.com",
    clientPhone: "0412 345 678",
    propertyAddress: "45 High St, Croydon VIC 3136",
    status: "DRAFT",
    completedDate: "14 March 2025",
    inspector: "Sarah Martinez",
    quoteAmount: 4076.26,
    areas: 3,
    areasDetails: ["Bathroom", "Hallway", "Bedroom"],
    hasSubfloor: true,
    hasDemolition: true,
    equipment: ["2x Dehumidifier", "3x Air Mover"],
  },
  {
    id: "2",
    jobNumber: "MRC-2025-0043",
    clientName: "Alex Thompson",
    clientEmail: "alex.thompson@email.com",
    clientPhone: "0423 456 789",
    propertyAddress: "23 River St, Hawthorn VIC 3122",
    status: "DRAFT",
    completedDate: "14 March 2025",
    inspector: "Michael Chen",
    quoteAmount: 1926.09,
    areas: 1,
    areasDetails: ["Bathroom"],
    hasSubfloor: false,
    hasDemolition: false,
  },
  {
    id: "3",
    jobNumber: "MRC-2025-0041",
    clientName: "Emma Wilson",
    clientEmail: "emma.wilson@email.com",
    clientPhone: "0434 567 890",
    propertyAddress: "12 Oak Ave, Ringwood VIC 3134",
    status: "SENT",
    completedDate: "13 March 2025",
    sentDate: "13 March 2025, 3:30 PM",
    inspector: "Michael Chen",
    quoteAmount: 2695.00,
    areas: 2,
    areasDetails: ["Bathroom", "Laundry"],
    hasSubfloor: false,
    hasDemolition: true,
    daysWaiting: 1,
    followUpDue: "Tomorrow",
  },
  {
    id: "4",
    jobNumber: "MRC-2025-0038",
    clientName: "Lisa Brown",
    clientEmail: "lisa.brown@email.com",
    clientPhone: "0445 678 901",
    propertyAddress: "89 Beach Rd, Frankston VIC 3199",
    status: "SENT",
    completedDate: "11 March 2025",
    sentDate: "11 March 2025, 10:00 AM",
    inspector: "Sarah Martinez",
    quoteAmount: 3200.00,
    areas: 2,
    hasSubfloor: true,
    hasDemolition: false,
    daysWaiting: 3,
    followUpDue: "Overdue",
  },
  {
    id: "5",
    jobNumber: "MRC-2025-0040",
    clientName: "Sarah Taylor",
    clientEmail: "sarah.taylor@email.com",
    clientPhone: "0456 789 012",
    propertyAddress: "23 Park St, Glen Waverley VIC 3150",
    status: "CONFIRMED",
    completedDate: "12 March 2025",
    confirmedDate: "12 March 2025",
    inspector: "Sarah Martinez",
    quoteAmount: 3271.29,
    areas: 3,
    hasSubfloor: true,
    hasDemolition: true,
  },
  {
    id: "6",
    jobNumber: "MRC-2025-0037",
    clientName: "Robert Kim",
    clientEmail: "robert.kim@email.com",
    clientPhone: "0467 890 123",
    propertyAddress: "56 River Rd, Doncaster VIC 3108",
    status: "CONFIRMED",
    completedDate: "10 March 2025",
    confirmedDate: "11 March 2025",
    inspector: "Michael Chen",
    quoteAmount: 2450.00,
    areas: 1,
    hasSubfloor: false,
    hasDemolition: false,
  },
  {
    id: "7",
    jobNumber: "MRC-2025-0039",
    clientName: "Michael Chen",
    clientEmail: "michael.chen@email.com",
    clientPhone: "0478 901 234",
    propertyAddress: "78 Main Rd, Box Hill VIC 3128",
    status: "JOB_BOOKED",
    completedDate: "10 March 2025",
    bookedDate: "11 March 2025",
    scheduledDate: "15 March 2025, 9:00 AM",
    technician: "Michael Chen",
    inspector: "Sarah Martinez",
    quoteAmount: 4076.26,
    areas: 3,
    hasSubfloor: true,
    hasDemolition: true,
  },
  {
    id: "8",
    jobNumber: "MRC-2025-0036",
    clientName: "David Martinez",
    clientEmail: "david.martinez@email.com",
    clientPhone: "0489 012 345",
    propertyAddress: "34 Hill St, Carlton VIC 3053",
    status: "JOB_BOOKED",
    completedDate: "8 March 2025",
    bookedDate: "9 March 2025",
    scheduledDate: "16 March 2025, 10:00 AM",
    technician: "Sarah Martinez",
    inspector: "Michael Chen",
    quoteAmount: 2695.00,
    areas: 2,
    hasSubfloor: false,
    hasDemolition: true,
  },
  {
    id: "9",
    jobNumber: "MRC-2025-0035",
    clientName: "Jennifer Lee",
    clientEmail: "jennifer.lee@email.com",
    clientPhone: "0490 123 456",
    propertyAddress: "67 Lake Dr, Clayton VIC 3168",
    status: "JOB_BOOKED",
    completedDate: "7 March 2025",
    bookedDate: "8 March 2025",
    scheduledDate: "14 March 2025",
    technician: "Michael Chen",
    inspector: "Sarah Martinez",
    quoteAmount: 6400.00,
    areas: 5,
    hasSubfloor: true,
    hasDemolition: true,
  },
];

const getStatusColor = (status: ReportStatus) => {
  switch (status) {
    case "DRAFT":
      return "bg-amber-500 hover:bg-amber-600";
    case "SENT":
      return "bg-blue-500 hover:bg-blue-600";
    case "CONFIRMED":
      return "bg-purple-500 hover:bg-purple-600";
    case "JOB_BOOKED":
      return "bg-green-500 hover:bg-green-600";
  }
};

const getStatusLabel = (status: ReportStatus) => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SENT":
      return "Sent";
    case "CONFIRMED":
      return "Confirmed";
    case "JOB_BOOKED":
      return "Job Booked";
  }
};

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      report.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === "ALL" || report.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    ALL: mockReports.length,
    DRAFT: mockReports.filter((r) => r.status === "DRAFT").length,
    SENT: mockReports.filter((r) => r.status === "SENT").length,
    CONFIRMED: mockReports.filter((r) => r.status === "CONFIRMED").length,
    JOB_BOOKED: mockReports.filter((r) => r.status === "JOB_BOOKED").length,
  };

  const totalValue = mockReports.reduce((sum, r) => sum + r.quoteAmount, 0);
  const conversionRate = (statusCounts.JOB_BOOKED / mockReports.length) * 100;
  const avgQuote = totalValue / mockReports.length;

  const handleSendReport = (report: Report) => {
    setSelectedReport(report);
    setShowSendDialog(true);
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setShowDetailDialog(true);
  };

  const handleChangeStatus = (report: Report) => {
    setSelectedReport(report);
    setShowStatusDialog(true);
  };

  const confirmSendReport = () => {
    toast.success("Report sent successfully!", {
      description: `Report sent to ${selectedReport?.clientEmail}`,
    });
    setShowSendDialog(false);
  };

  const confirmStatusChange = () => {
    toast.success("Status updated successfully!");
    setShowStatusDialog(false);
  };

  return (
    <div className="reports-page">
      <TopNavigation />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="reports-header-section mb-6">
          <h1 className="reports-title">Inspection Reports</h1>
          <p className="reports-subtitle">View and manage all completed inspection reports</p>
        </div>

        {/* Statistics Overview */}
        <div className="stats-overview-reports">
          <div className="stats-grid-reports">
            <div className="stat-card-reports">
              <div className="stat-card-header-reports">
                <span className="stat-label-reports">Total Value</span>
                <div className="stat-icon-box-reports blue">
                  <DollarSign size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="stat-value-reports">${totalValue.toLocaleString()}</div>
              <div className="stat-change-reports positive">
                <TrendingUp size={14} strokeWidth={2} />
                This month
              </div>
            </div>

            <div className="stat-card-reports">
              <div className="stat-card-header-reports">
                <span className="stat-label-reports">Conversion</span>
                <div className="stat-icon-box-reports green">
                  <Target size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="stat-value-reports">{conversionRate.toFixed(0)}%</div>
              <div className="stat-change-reports positive">
                <CheckCircle size={14} strokeWidth={2} />
                {statusCounts.JOB_BOOKED}/{mockReports.length} booked
              </div>
            </div>

            <div className="stat-card-reports">
              <div className="stat-card-header-reports">
                <span className="stat-label-reports">Avg Quote</span>
                <div className="stat-icon-box-reports orange">
                  <TrendingUp size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="stat-value-reports">${avgQuote.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="stat-change-reports neutral">
                <FileText size={14} strokeWidth={2} />
                Per inspection
              </div>
            </div>

            <div className="stat-card-reports">
              <div className="stat-card-header-reports">
                <span className="stat-label-reports">Avg Response</span>
                <div className="stat-icon-box-reports purple">
                  <Clock size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="stat-value-reports">2.3 days</div>
              <div className="stat-change-reports neutral">
                <Clock size={14} strokeWidth={2} />
                Client response time
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by job #, client name, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="name">Client Name A-Z</SelectItem>
                <SelectItem value="highest">Highest Value</SelectItem>
                <SelectItem value="lowest">Lowest Value</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={selectedStatus === "ALL" ? "default" : "outline"}
            onClick={() => setSelectedStatus("ALL")}
            className="shrink-0"
          >
            All ({statusCounts.ALL})
          </Button>
          <Button
            variant={selectedStatus === "DRAFT" ? "default" : "outline"}
            onClick={() => setSelectedStatus("DRAFT")}
            className="shrink-0"
          >
            Draft ({statusCounts.DRAFT})
          </Button>
          <Button
            variant={selectedStatus === "SENT" ? "default" : "outline"}
            onClick={() => setSelectedStatus("SENT")}
            className="shrink-0"
          >
            Sent ({statusCounts.SENT})
          </Button>
          <Button
            variant={selectedStatus === "CONFIRMED" ? "default" : "outline"}
            onClick={() => setSelectedStatus("CONFIRMED")}
            className="shrink-0"
          >
            Confirmed ({statusCounts.CONFIRMED})
          </Button>
          <Button
            variant={selectedStatus === "JOB_BOOKED" ? "default" : "outline"}
            onClick={() => setSelectedStatus("JOB_BOOKED")}
            className="shrink-0"
          >
            Job Booked ({statusCounts.JOB_BOOKED})
          </Button>
        </div>

        {/* Reports Grid/List */}
        {filteredReports.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try different keywords or clear search" : "No reports match the selected filter"}
            </p>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Badge className={getStatusColor(report.status)}>{getStatusLabel(report.status)}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(report)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {report.status === "DRAFT" && (
                          <>
                            <DropdownMenuItem onClick={() => handleSendReport(report)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send to Client
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Report
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Draft
                            </DropdownMenuItem>
                          </>
                        )}
                        {report.status === "SENT" && (
                          <>
                            <DropdownMenuItem onClick={() => handleSendReport(report)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Resend Report
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeStatus(report)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Confirmed
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Send Follow-up
                            </DropdownMenuItem>
                          </>
                        )}
                        {report.status === "CONFIRMED" && (
                          <>
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" />
                              Book Job
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReport(report)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Resend Report
                            </DropdownMenuItem>
                          </>
                        )}
                        {report.status === "JOB_BOOKED" && (
                          <>
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" />
                              View in Calendar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReport(report)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Resend Report
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-primary">{report.jobNumber}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{report.clientName}</span>
                      </div>
                      <div className="flex items-start gap-2 mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{report.propertyAddress}</span>
                      </div>
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span>{report.completedDate}</span>
                      </div>
                      {report.sentDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Sent:</span>
                          <span className="text-xs">{report.sentDate}</span>
                        </div>
                      )}
                      {report.scheduledDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Scheduled:</span>
                          <span className="text-xs">{report.scheduledDate}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Inspector:</span>
                        <span>{report.inspector}</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-muted-foreground">Quote:</span>
                        <span className="text-primary">
                          ${report.quoteAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Areas: {report.areas} | Subfloor: {report.hasSubfloor ? "Yes" : "No"} | Demo:{" "}
                      {report.hasDemolition ? "Yes" : "No"}
                    </div>

                    {report.daysWaiting && (
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          report.followUpDue === "Overdue" ? "text-destructive" : "text-amber-600"
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          {report.followUpDue === "Overdue"
                            ? `Follow-up overdue (${report.daysWaiting} days)`
                            : `Awaiting response (${report.daysWaiting} day${report.daysWaiting > 1 ? "s" : ""})`}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {report.status === "DRAFT" && (
                        <Button size="sm" className="flex-1" onClick={() => handleSendReport(report)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Send
                        </Button>
                      )}
                      {report.status === "SENT" && (
                        <>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleSendReport(report)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Resend
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Follow Up
                          </Button>
                        </>
                      )}
                      {report.status === "CONFIRMED" && (
                        <Button size="sm" className="flex-1">
                          <Calendar className="mr-2 h-4 w-4" />
                          Book Job
                        </Button>
                      )}
                      {report.status === "JOB_BOOKED" && (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Calendar className="mr-2 h-4 w-4" />
                          View in Calendar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(report)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Job #</th>
                    <th className="p-4 font-medium">Client</th>
                    <th className="p-4 font-medium">Property</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Quote</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <Badge className={getStatusColor(report.status)}>{getStatusLabel(report.status)}</Badge>
                      </td>
                      <td className="p-4 font-mono text-sm font-semibold text-primary">{report.jobNumber}</td>
                      <td className="p-4">{report.clientName}</td>
                      <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate">
                        {report.propertyAddress}
                      </td>
                      <td className="p-4 text-sm">{report.completedDate}</td>
                      <td className="p-4 font-semibold">
                        ${report.quoteAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleViewDetails(report)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.status === "DRAFT" && (
                            <Button size="sm" variant="ghost" onClick={() => handleSendReport(report)}>
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {report.status === "SENT" && (
                            <Button size="sm" variant="ghost" onClick={() => handleSendReport(report)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {(report.status === "CONFIRMED" || report.status === "JOB_BOOKED") && (
                            <Button size="sm" variant="ghost">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      <MobileBottomNav />

      {/* Report Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.jobNumber} - {selectedReport?.clientName}
            </DialogTitle>
            <DialogDescription>Complete inspection report details</DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Report Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Report Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Job Number:</div>
                    <div className="font-mono font-semibold">{selectedReport.jobNumber}</div>
                    <div>Status:</div>
                    <div>
                      <Badge className={getStatusColor(selectedReport.status)}>
                        {getStatusLabel(selectedReport.status)}
                      </Badge>
                    </div>
                    <div>Completed:</div>
                    <div>{selectedReport.completedDate}</div>
                    <div>Inspector:</div>
                    <div>{selectedReport.inspector}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Client Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {selectedReport.clientName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {selectedReport.clientEmail}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selectedReport.clientPhone}
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      {selectedReport.propertyAddress}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Inspection Details</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Areas Inspected: {selectedReport.areas}</li>
                    {selectedReport.areasDetails && (
                      <li className="text-muted-foreground ml-4">({selectedReport.areasDetails.join(", ")})</li>
                    )}
                    <li>• Subfloor Inspection: {selectedReport.hasSubfloor ? "Yes" : "No"}</li>
                    <li>• Demolition Required: {selectedReport.hasDemolition ? "Yes" : "No"}</li>
                    {selectedReport.equipment && (
                      <li>• Equipment: {selectedReport.equipment.join(", ")}</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Quote Breakdown</h4>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal (ex GST):</span>
                      <span>${((selectedReport.quoteAmount / 1.1).toFixed(2))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (10%):</span>
                      <span>${((selectedReport.quoteAmount - selectedReport.quoteAmount / 1.1).toFixed(2))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>TOTAL (inc GST):</span>
                      <span className="text-primary">
                        ${selectedReport.quoteAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Full inspection report details would appear here</p>
                  <Button variant="outline" className="mt-4">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Full Report
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-muted rounded-lg">
                    <CheckSquare className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold">Inspection Completed</div>
                      <div className="text-sm text-muted-foreground">{selectedReport.completedDate}</div>
                      <div className="text-sm">By: {selectedReport.inspector}</div>
                    </div>
                  </div>

                  {selectedReport.status !== "DRAFT" && (
                    <div className="flex gap-3 p-3 bg-muted rounded-lg">
                      <Send className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold">Report Sent</div>
                        <div className="text-sm text-muted-foreground">{selectedReport.sentDate}</div>
                        <div className="text-sm">To: {selectedReport.clientEmail}</div>
                      </div>
                    </div>
                  )}

                  {selectedReport.status === "CONFIRMED" && (
                    <div className="flex gap-3 p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-5 w-5 text-purple-500 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold">Quote Confirmed</div>
                        <div className="text-sm text-muted-foreground">{selectedReport.confirmedDate}</div>
                        <div className="text-sm">Client accepted quote</div>
                      </div>
                    </div>
                  )}

                  {selectedReport.status === "JOB_BOOKED" && (
                    <div className="flex gap-3 p-3 bg-muted rounded-lg">
                      <Calendar className="h-5 w-5 text-green-500 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold">Job Booked</div>
                        <div className="text-sm text-muted-foreground">{selectedReport.bookedDate}</div>
                        <div className="text-sm">Scheduled: {selectedReport.scheduledDate}</div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Report Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Inspection Report</DialogTitle>
            <DialogDescription>Send the report to {selectedReport?.clientName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input value={selectedReport?.clientEmail || ""} readOnly />
            </div>

            <div>
              <Label>CC (optional)</Label>
              <Input placeholder="Additional email addresses" />
            </div>

            <div>
              <Label>Subject</Label>
              <Input defaultValue={`Your Mould Inspection Report - ${selectedReport?.jobNumber}`} />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                rows={8}
                defaultValue={`Dear ${selectedReport?.clientName},

Thank you for choosing Mould & Restoration Co. for your property inspection.

Attached is your comprehensive mould inspection report for ${selectedReport?.propertyAddress}.

Our inspection identified areas requiring remediation, and we've provided a detailed quote of $${selectedReport?.quoteAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (inc GST).

To proceed with booking the work, please use the self-booking link below or contact us directly.

We look forward to restoring your property to a safe, healthy condition.

Best regards,
Mould & Restoration Co.
Phone: 1300 665 673
Email: info@mrc.com.au`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="pdf" defaultChecked className="rounded" />
                <label htmlFor="pdf" className="text-sm">
                  Include PDF report attachment
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="booking" defaultChecked className="rounded" />
                <label htmlFor="booking" className="text-sm">
                  Include client self-booking link
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="copy" defaultChecked className="rounded" />
                <label htmlFor="copy" className="text-sm">
                  Send me a copy
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="reminder" defaultChecked className="rounded" />
                <label htmlFor="reminder" className="text-sm">
                  Set follow-up reminder (3 days)
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSendReport}>
              <Send className="mr-2 h-4 w-4" />
              Send Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Report Status</DialogTitle>
            <DialogDescription>Update the status of {selectedReport?.jobNumber}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Current Status</Label>
              <div className="mt-2">
                <Badge className={getStatusColor(selectedReport?.status || "DRAFT")}>
                  {getStatusLabel(selectedReport?.status || "DRAFT")}
                </Badge>
              </div>
            </div>

            <div>
              <Label>New Status</Label>
              <RadioGroup defaultValue="CONFIRMED" className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CONFIRMED" id="confirmed" />
                  <Label htmlFor="confirmed">Confirmed</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="JOB_BOOKED" id="booked" />
                  <Label htmlFor="booked">Job Booked</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DRAFT" id="draft" />
                  <Label htmlFor="draft">Back to Draft</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Textarea placeholder="e.g., Client called and confirmed" rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
