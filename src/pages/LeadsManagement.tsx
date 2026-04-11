import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateInspectionPDF } from '@/lib/api/pdfGeneration';
import { sendEmail, buildReportApprovedHtml } from '@/lib/api/notifications';
// Lazy-loaded: convertHtmlToPdf is ~600KB (html2canvas + jsPDF)
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  Info,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Menu,
  Plus,
  Search,
  SearchX,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Components
import AdminSidebar from '@/components/admin/AdminSidebar';
import PipelineTabs from '@/components/leads/PipelineTabs';
import LeadCard, { type TransformedLead } from '@/components/leads/LeadCard';
import CreateLeadCard from '@/components/leads/CreateLeadCard';
import CreateNewLeadModal from '@/components/leads/CreateNewLeadModal';

// ============================================================================
// STATUS OPTIONS (Pipeline Tabs)
// ============================================================================

interface StatusOption {
  value: string;
  label: string;
  dotColor: string | null;
  description?: string;
}

const statusOptions: StatusOption[] = [
  { value: 'all', label: 'All', dotColor: null },
  { value: 'new_lead', label: 'New Lead', dotColor: 'bg-green-500' },
  { value: 'inspection_waiting', label: 'Awaiting Inspection', dotColor: 'bg-orange-500' },
  { value: 'inspection_ai_summary', label: 'AI Review', dotColor: 'bg-violet-500' },
  { value: 'approve_inspection_report', label: 'Approve Report', dotColor: 'bg-slate-700' },
  { value: 'inspection_email_approval', label: 'Email Approval', dotColor: 'bg-purple-500' },
  { value: 'job_waiting', label: 'Awaiting Job', dotColor: 'bg-amber-500' },
  { value: 'job_scheduled', label: 'Job Scheduled', dotColor: 'bg-blue-500' },
  { value: 'job_completed', label: 'Job Completed', dotColor: 'bg-emerald-500' },
  { value: 'pending_review', label: 'Pending Review', dotColor: 'bg-yellow-500' },
  { value: 'job_report_pdf_sent', label: 'Report Sent', dotColor: 'bg-sky-500' },
  { value: 'invoicing_sent', label: 'Invoice Sent', dotColor: 'bg-fuchsia-500' },
  { value: 'paid', label: 'Paid', dotColor: 'bg-green-600' },
  { value: 'google_review', label: 'Review', dotColor: 'bg-yellow-400' },
  { value: 'finished', label: 'Finished', dotColor: 'bg-green-700' },
  { value: 'closed', label: 'Closed', dotColor: 'bg-blue-500' },
  { value: 'not_landed', label: 'Not Landed', dotColor: 'bg-red-500' },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch user full names for a list of user UUIDs via the manage-users
 * Edge Function. Returns a map of { userId -> full name }.
 * Used to display "Awaiting technician: michael youssef" on lead cards.
 */
async function fetchTechnicianNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return {};

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    const result = await response.json();
    if (!result.success) return {};

    const map: Record<string, string> = {};
    for (const user of result.users as Array<{ id: string; full_name?: string; first_name?: string; last_name?: string; email?: string }>) {
      if (userIds.includes(user.id)) {
        map[user.id] = user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email || 'Unknown';
      }
    }
    return map;
  } catch (err) {
    console.error('[LeadsManagement] Failed to fetch technician names:', err);
    return {};
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

const PAGE_SIZE = 50;

// Only fetch columns needed for the lead cards
const LEAD_COLUMNS = 'id,full_name,email,phone,property_address_street,property_address_suburb,property_address_state,property_address_postcode,status,lead_source,created_at,updated_at,quoted_amount,issue_description,notes,lead_number,inspection_scheduled_date,scheduled_time,assigned_to,job_scheduled_date' as const;

const LeadsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leads, setLeads] = useState<TransformedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRemoveReasonModal, setShowRemoveReasonModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [selectedLeadForRemoval, setSelectedLeadForRemoval] = useState<TransformedLead | null>(null);
  const [regeneratingPdfForLead, setRegeneratingPdfForLead] = useState<string | null>(null);

  // Archive dialog
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveTargetId, setArchiveTargetId] = useState<string | number | null>(null);

  // History dialog
  const [historyLeadId, setHistoryLeadId] = useState<string | number | null>(null);
  const [historyActivities, setHistoryActivities] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Email composer dialog
  const [emailTargetLead, setEmailTargetLead] = useState<TransformedLead | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // ============================================================================
  // STAGE-SPECIFIC ACTION FUNCTIONS
  // ============================================================================

  const stageActions = {
    startInspection: (leadId: number | string) => {
      navigate(`/technician/inspection?leadId=${leadId}`);
    },

    viewHistory: (leadId: number | string) => {
      navigate(`/leads/${leadId}`);
    },

    addNotes: (leadId: number | string) => {
      navigate(`/leads/${leadId}`);
    },

    reactivate: async (leadId: number | string) => {
      await updateLeadStatus(leadId, 'new_lead');
    },

    markClosed: async (leadId: number | string) => {
      await updateLeadStatus(leadId, 'closed');
    },

    handleApproveReport: async (leadId: number | string) => {
      // Update status to inspection_email_approval
      await updateLeadStatus(leadId, 'inspection_email_approval');
      toast({
        title: 'Report Approved',
        description: 'The inspection report has been approved and is ready to send.',
      });
    },

    removeLead: (lead: TransformedLead) => {
      const confirmed = window.confirm(
        `Are you sure you want to remove "${lead.name}" from active leads?\n\nThis will mark the lead as "Not Landed" and remove it from the active pipeline.`
      );

      if (confirmed) {
        setSelectedLeadForRemoval(lead);
        setShowRemoveReasonModal(true);
      }
    },

    confirmRemoveLead: async () => {
      if (selectedLeadForRemoval) {
        await updateLeadStatus(selectedLeadForRemoval.id, 'not_landed');

        setShowRemoveReasonModal(false);
        setSelectedLeadForRemoval(null);
        setRemoveReason('');

        toast({
          title: 'Lead Removed',
          description: 'Lead has been marked as "Not Landed"',
        });
      }
    },

    viewDetails: (leadId: number | string, _status?: string) => {
      navigate(`/leads/${leadId}`);
    },

    viewPDF: (leadId: number | string) => {
      navigate(`/report/${leadId}`);
    },

    reviewAISummary: (leadId: number | string) => {
      navigate(`/admin/inspection-ai-review/${leadId}`);
    },

    regeneratePDF: async (lead: TransformedLead) => {
      const preInspectionStatuses = ['new_lead', 'contacted', 'inspection_waiting'];
      if (preInspectionStatuses.includes(lead.status)) {
        toast({
          title: 'Cannot generate PDF',
          description: 'Complete the inspection before generating a PDF.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setRegeneratingPdfForLead(String(lead.id));
        const { data: inspection, error: inspectionError } = await supabase
          .from('inspections')
          .select('id')
          .eq('lead_id', lead.id)
          .single();

        if (inspectionError || !inspection) {
          throw new Error('No inspection found for this lead');
        }

        await generateInspectionPDF(inspection.id, { regenerate: true });
        toast({
          title: 'PDF Regenerated',
          description: 'The inspection report has been regenerated with latest data.',
        });
      } catch (error) {
        console.error('Failed to regenerate PDF:', error);
        toast({
          title: 'Error',
          description: 'Failed to regenerate PDF. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setRegeneratingPdfForLead(null);
      }
    },
  };

  const updateLeadStatus = async (leadId: number | string, newStatus: string) => {
    // Optimistic local update
    const previousLeads = leads;
    setLeads(prev =>
      prev.map(lead => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      // Log activity
      await supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'status_change',
        title: `Status changed to ${newStatus.replace(/_/g, ' ')}`,
        description: `Lead status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to update lead status:', error);
      // Revert on failure
      setLeads(previousLeads);
      toast({
        title: 'Error',
        description: 'Failed to update lead status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadLeads();
  }, [statusFilter, sortBy]);

  const transformLead = (lead: any): TransformedLead => ({
    id: lead.id,
    name: lead.full_name || 'Unknown',
    email: lead.email || '',
    phone: lead.phone || '',
    property: lead.property_address_street || '',
    suburb: lead.property_address_suburb || '',
    state: lead.property_address_state || 'VIC',
    postcode: lead.property_address_postcode || '',
    status: lead.status || 'new_lead',
    source: lead.lead_source || 'Unknown',
    dateCreated: lead.created_at,
    lastContact: lead.updated_at,
    estimatedValue: lead.quoted_amount ? parseFloat(lead.quoted_amount.toString()) : null,
    issueDescription: lead.issue_description || lead.notes || '',
    leadNumber: lead.lead_number,
    inspection_scheduled_date: lead.inspection_scheduled_date,
    scheduled_time: lead.scheduled_time,
    job_scheduled_date: lead.job_scheduled_date,
    assigned_to: lead.assigned_to,
  });

  const loadLeads = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(LEAD_COLUMNS)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        console.error('Error loading leads:', error);
        toast({
          title: 'Error',
          description: 'Failed to load leads. Please refresh the page.',
          variant: 'destructive',
        });
        setLeads([]);
        setHasMore(false);
      } else {
        const rows = data || [];
        // Batch-fetch technician names for any assigned_to UUIDs we see
        const technicianIds = [...new Set(rows.map((r: any) => r.assigned_to).filter(Boolean))];
        const technicianNameMap = await fetchTechnicianNames(technicianIds as string[]);
        setLeads(rows.map((r: any) => ({
          ...transformLead(r),
          assigned_technician: r.assigned_to ? technicianNameMap[r.assigned_to] : undefined,
        })));
        setHasMore(rows.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Unexpected error loading leads:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setLeads([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLeads = async () => {
    setLoadingMore(true);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(LEAD_COLUMNS)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .range(leads.length, leads.length + PAGE_SIZE - 1);

      if (error) {
        console.error('Error loading more leads:', error);
        toast({ title: 'Error', description: 'Failed to load more leads.', variant: 'destructive' });
      } else {
        const rows = data || [];
        setLeads(prev => [...prev, ...rows.map(transformLead)]);
        setHasMore(rows.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Unexpected error loading more leads:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================

  const getFilteredLeads = () => {
    let filtered = [...leads];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        lead =>
          lead.name.toLowerCase().includes(query) ||
          lead.property.toLowerCase().includes(query) ||
          lead.suburb.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.includes(searchQuery)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
        case 'oldest':
          return new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
        case 'value-high':
          return (b.estimatedValue || 0) - (a.estimatedValue || 0);
        case 'value-low':
          return (a.estimatedValue || 0) - (b.estimatedValue || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getStatusCounts = () => {
    return statusOptions.map(option => ({
      ...option,
      count: option.value === 'all' ? leads.length : leads.filter(lead => lead.status === option.value).length,
    }));
  };

  const filteredLeads = getFilteredLeads();

  // ============================================================================
  // ACTION HANDLERS FOR LEAD CARD
  // ============================================================================

  const handleViewLead = (id: string | number, status: string) => {
    stageActions.viewDetails(id, status);
  };

  const handleSchedule = (id: string | number) => {
    // Navigate to admin schedule page
    navigate('/admin/schedule');
  };

  const handleStartInspection = (id: string | number) => {
    stageActions.startInspection(id);
  };

  const handleViewPDF = (id: string | number) => {
    stageActions.viewPDF(id);
  };

  const handleApprove = (id: string | number) => {
    stageActions.handleApproveReport(id);
  };

  const handleSendEmail = (id: string | number) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    setEmailSubject(`Your Inspection Report - ${lead.property || lead.suburb}`);
    setEmailBody(
      `Dear ${lead.name},\n\nThank you for choosing Mould & Restoration Co. for your inspection.\n\nPlease find your comprehensive inspection report for ${lead.property}.\n\nIf you have any questions, please don't hesitate to contact us on 0433 880 403.\n\nKind regards,\nMould & Restoration Co.`
    );
    setEmailTargetLead(lead);
  };

  const handleArchive = (id: string | number) => {
    setArchiveTargetId(id);
    setShowArchiveDialog(true);
  };

  const confirmArchive = async () => {
    if (!archiveTargetId) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', archiveTargetId);

      if (error) throw error;

      await supabase.from('activities').insert({
        lead_id: archiveTargetId,
        activity_type: 'archived',
        title: 'Lead archived',
      });

      setLeads(prev => prev.filter(l => l.id !== archiveTargetId));
      toast({ title: 'Lead archived', description: 'The lead has been hidden from the pipeline.' });
    } catch (error) {
      console.error('Failed to archive lead:', error);
      toast({ title: 'Error', description: 'Failed to archive lead.', variant: 'destructive' });
    } finally {
      setShowArchiveDialog(false);
      setArchiveTargetId(null);
    }
  };

  const handleReactivate = (id: string | number) => {
    stageActions.reactivate(id);
  };

  const handleReviewAI = (id: string | number) => {
    stageActions.reviewAISummary(id);
  };

  // Book Job from the Awaiting Job tab → open Schedule page where the
  // BookJobSheet is available via the "To Schedule" sidebar.
  const handleBookJob = (_id: string | number) => {
    navigate('/admin/schedule');
  };

  const handleApproveJobReport = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'job_report_pdf_sent' })
        .eq('id', leadId);
      if (error) throw error;

      await supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'status_change',
        title: 'Job report approved',
        description: 'Admin approved the job report',
      });

      setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, status: 'job_report_pdf_sent' } : l)));
      toast({ title: 'Report approved', description: 'Job report has been approved.' });
    } catch (error) {
      console.error('Failed to approve job report:', error);
      toast({ title: 'Error', description: 'Failed to approve report.', variant: 'destructive' });
    }
  };

  // Not Proceeding → mark lead as not_landed (confirm + update).
  const handleNotProceeding = async (id: string | number) => {
    if (!window.confirm('Mark this lead as Not Proceeding? It will move to the Not Landed pipeline.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'not_landed' })
        .eq('id', id as string);
      if (error) throw error;

      await supabase.from('activities').insert({
        lead_id: id as string,
        activity_type: 'lead_not_proceeding',
        title: 'Lead Not Proceeding',
        description: 'Customer declined to proceed with remediation job',
      });

      setLeads(prev => prev.map(l => (l.id === id ? { ...l, status: 'not_landed' } : l)));
      toast({ title: 'Lead updated', description: 'Lead marked as Not Proceeding.' });
    } catch (error) {
      console.error('Failed to mark lead as not proceeding:', error);
      toast({ title: 'Error', description: 'Failed to update lead.', variant: 'destructive' });
    }
  };

  const handleViewHistory = async (id: string | number) => {
    setHistoryLeadId(id);
    setHistoryLoading(true);
    setHistoryActivities([]);

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryActivities(data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast({ title: 'Error', description: 'Failed to load activity history.', variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEmailAction = async (type: 'mailto' | 'copy') => {
    if (!emailTargetLead) return;

    if (type === 'mailto') {
      const mailto = `mailto:${emailTargetLead.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailto, '_blank');
      toast({ title: 'Email opened', description: 'Email opened in your email app.' });
    } else {
      await navigator.clipboard.writeText(emailBody);
      toast({ title: 'Copied', description: 'Email body copied to clipboard.' });
    }

    // Log activity
    await supabase.from('activities').insert({
      lead_id: emailTargetLead.id,
      activity_type: 'email_sent',
      title: 'Email sent to client',
      description: `Subject: ${emailSubject}`,
    });

    setEmailTargetLead(null);
  };

  const handleSendWithReport = async () => {
    if (!emailTargetLead?.email) {
      toast({ title: 'Error', description: 'No email address on file.', variant: 'destructive' });
      return;
    }

    setSendingEmail(true);

    try {
      // 1. Get inspection PDF URL from database
      const { data: inspection, error: inspError } = await supabase
        .from('inspections')
        .select('id, pdf_url, job_number')
        .eq('lead_id', emailTargetLead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (inspError || !inspection?.pdf_url) {
        toast({ title: 'Error', description: 'No PDF report found for this lead.', variant: 'destructive' });
        setSendingEmail(false);
        return;
      }

      // 2. Download HTML report from Supabase Storage
      let htmlContent: string;
      const pathMatch = inspection.pdf_url.match(/inspection-reports\/(.+)$/);

      if (pathMatch) {
        const storagePath = pathMatch[1];
        const { data, error } = await supabase.storage
          .from('inspection-reports')
          .download(storagePath);

        if (error || !data) throw new Error('Failed to download report file');
        htmlContent = await data.text();
      } else {
        const response = await fetch(inspection.pdf_url);
        if (!response.ok) throw new Error('Failed to fetch report file');
        htmlContent = await response.text();
      }

      // 3. Convert HTML to actual PDF (lazy-load heavy libraries)
      const { convertHtmlToPdf } = await import('@/lib/utils/htmlToPdf');
      const pdfBlob = await convertHtmlToPdf(htmlContent);

      // 4. Convert PDF to base64
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // 5. Build branded email HTML
      const address = [emailTargetLead.property, emailTargetLead.suburb].filter(Boolean).join(', ');
      const emailHtml = buildReportApprovedHtml({
        customerName: emailTargetLead.name,
        address,
        jobNumber: inspection.job_number || undefined,
      });

      // 6. Build filename
      const jobNumber = inspection.job_number || emailTargetLead.leadNumber || 'Report';
      const filename = `MRC-${jobNumber}-Inspection-Report.pdf`;

      // 7. Send email with PDF attachment
      await sendEmail({
        to: emailTargetLead.email,
        subject: emailSubject,
        html: emailHtml,
        leadId: String(emailTargetLead.id),
        inspectionId: inspection.id,
        templateName: 'report-approved',
        attachments: [{
          filename,
          content: base64Content,
          content_type: 'application/pdf',
        }],
      });

      // 7. Log activity
      await supabase.from('activities').insert({
        lead_id: emailTargetLead.id,
        activity_type: 'email_sent',
        title: 'Inspection report emailed to client',
        description: `Subject: ${emailSubject} (with report attached)`,
      });

      // 8. Update lead status to closed
      await supabase
        .from('leads')
        .update({ status: 'closed' })
        .eq('id', emailTargetLead.id);

      // Update local state
      setLeads(prev => prev.map(l =>
        l.id === emailTargetLead.id ? { ...l, status: 'closed' } : l
      ));

      toast({ title: 'Email sent', description: `Report emailed to ${emailTargetLead.email} with attachment.` });
      setEmailTargetLead(null);
    } catch (error) {
      console.error('Failed to send email with report:', error);
      toast({ title: 'Error', description: 'Failed to send email. Please try again.', variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        backgroundColor: '#f6f7f8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="ml-0 lg:ml-[260px] h-screen flex flex-col overflow-hidden">
        {/* Page Header */}
        <header
          className="bg-white flex-shrink-0 z-40"
          style={{ borderBottom: '1px solid #e5e5e5' }}
        >
          <div className="flex items-center px-4 md:px-6 py-4 justify-between">
            {/* Mobile menu button */}
            <button
              className="lg:hidden w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" style={{ color: '#1d1d1f' }} />
            </button>

            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div
                className="flex w-10 h-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: '#007AFF' }}
              >
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Lead Management</h1>
                <p className="text-sm text-slate-500">
                  {filteredLeads.length} of {leads.length} leads
                </p>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* New Lead Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium
                hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">New Lead</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">

        {/* Pipeline Tabs */}
        <PipelineTabs
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
          statusCounts={getStatusCounts()}
        />

        {/* Filter Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, address, email, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 bg-white
                text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
                  bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-11 pl-4 pr-10 rounded-lg border border-slate-200 bg-white
                  text-sm text-slate-700 appearance-none cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  transition-all"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="value-high">Value: High to Low</option>
                <option value="value-low">Value: Low to High</option>
                <option value="name">Name A-Z</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* View Toggle */}
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={`h-12 w-12 flex items-center justify-center transition-colors
                  ${viewMode === 'cards' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="Card view"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`h-12 w-12 flex items-center justify-center transition-colors border-l border-slate-200
                  ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-500">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              {searchQuery || statusFilter !== 'all' ? <SearchX className="h-8 w-8 text-slate-400" /> : <Inbox className="h-8 w-8 text-slate-400" />}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {searchQuery || statusFilter !== 'all' ? 'No leads found' : 'No leads yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search'
                : 'Create your first lead to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-11 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium
                  hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-5 w-5" />
                Create First Lead
              </button>
            )}
          </div>
        ) : (
          /* Cards Grid */
          <div
            className={`
              grid gap-5 pb-12
              ${viewMode === 'cards'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
              }
            `}
          >
            {filteredLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onViewLead={handleViewLead}
                onSchedule={handleSchedule}
                onStartInspection={handleStartInspection}
                onViewPDF={handleViewPDF}
                onApprove={handleApprove}
                onSendEmail={handleSendEmail}
                onArchive={handleArchive}
                onReactivate={handleReactivate}
                onViewHistory={handleViewHistory}
                onReviewAI={handleReviewAI}
                onBookJob={handleBookJob}
                onNotProceeding={handleNotProceeding}
                onApproveJobReport={handleApproveJobReport}
              />
            ))}

            {/* Create New Lead Card */}
            <CreateLeadCard onClick={() => setShowCreateModal(true)} />
          </div>
        )}

        {/* Load More */}
        {!loading && hasMore && (
          <div className="text-center py-4">
            <button
              onClick={loadMoreLeads}
              disabled={loadingMore}
              className="h-11 px-8 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium
                hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2 mx-auto"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
              ) : (
                'Load More Leads'
              )}
            </button>
          </div>
        )}

        {/* Results Summary */}
        {!loading && filteredLeads.length > 0 && (
          <div className="text-center py-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filteredLeads.length}</span>{' '}
              {filteredLeads.length === 1 ? 'lead' : 'leads'}
              {statusFilter !== 'all' && (
                <>
                  {' '}in <span className="font-medium text-slate-700">{statusOptions.find(s => s.value === statusFilter)?.label}</span>
                </>
              )}
              {hasMore && <span className="text-slate-400"> (more available)</span>}
            </p>
          </div>
        )}
          </div>
        </div>
      </main>

      {/* Create Lead Modal */}
      <CreateNewLeadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadLeads(); // Refresh the leads list
        }}
      />

      {/* Remove Lead Reason Modal */}
      {showRemoveReasonModal && selectedLeadForRemoval && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowRemoveReasonModal(false)}
        >
          <div
            className="relative w-full max-w-[450px] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Remove Lead</h2>
                  <p className="text-sm text-slate-500">Why is this lead being removed?</p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoveReasonModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Lead info */}
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="font-medium text-slate-900">{selectedLeadForRemoval.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {selectedLeadForRemoval.property}, {selectedLeadForRemoval.suburb}
                </p>
              </div>

              {/* Reason select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Removal *
                </label>
                <select
                  value={removeReason}
                  onChange={e => setRemoveReason(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select reason...</option>
                  <option value="too-expensive">Too Expensive</option>
                  <option value="went-with-competitor">Went with Competitor</option>
                  <option value="not-interested">No Longer Interested</option>
                  <option value="no-response">No Response from Client</option>
                  <option value="duplicate">Duplicate Lead</option>
                  <option value="outside-service-area">Outside Service Area</option>
                  <option value="timing-issue">Wrong Timing</option>
                  <option value="decided-not-to-proceed">Decided Not to Proceed</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {removeReason === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Additional Details
                  </label>
                  <textarea
                    placeholder="Please provide more details..."
                    className="w-full p-3 rounded-lg border border-slate-200 text-sm resize-none
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-700">
                <Info className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  This lead will be moved to "Not Landed" and removed from the active pipeline.
                  You can reactivate it later if needed.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowRemoveReasonModal(false)}
                className="h-11 px-6 rounded-lg border border-slate-200 bg-white text-slate-700
                  text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => stageActions.confirmRemoveLead()}
                disabled={!removeReason}
                className="h-11 px-6 rounded-lg bg-red-600 text-white text-sm font-medium
                  hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                <Trash2 className="h-5 w-5" />
                Remove Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This lead will be hidden from the pipeline. You can still find it in the database if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View History Dialog */}
      <Dialog open={historyLeadId !== null} onOpenChange={(open) => { if (!open) setHistoryLeadId(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Activity History
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : historyActivities.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-10 w-10 text-slate-400 mb-2 block" />
              <p className="text-sm text-slate-500">No activity recorded for this lead</p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {historyActivities.map((activity) => (
                  <div key={activity.id} className="relative">
                    {/* Dot */}
                    <div className="absolute -left-6 top-1.5 w-[18px] h-[18px] rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(activity.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                          timeZone: 'Australia/Melbourne',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Composer Dialog */}
      <Dialog open={emailTargetLead !== null} onOpenChange={(open) => { if (!open) setEmailTargetLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Email to Client</DialogTitle>
          </DialogHeader>
          {emailTargetLead && (
            <div className="space-y-4">
              {/* To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                <div className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center">
                  {emailTargetLead.email || 'No email on file'}
                </div>
              </div>
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm resize-none
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              {/* Report attachment indicator */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800">Inspection report will be attached</p>
                  <p className="text-xs text-blue-600">Downloaded from storage and sent as attachment</p>
                </div>
              </div>
              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleSendWithReport}
                  disabled={!emailTargetLead.email || sendingEmail}
                  className="w-full h-12 px-4 rounded-lg bg-[#121D73] text-white text-sm font-semibold
                    hover:bg-[#0f1860] transition-colors flex items-center justify-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingEmail ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Email with Report</>
                  )}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEmailAction('mailto')}
                    disabled={!emailTargetLead.email || sendingEmail}
                    className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                      hover:bg-slate-50 transition-colors flex items-center justify-center gap-2
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Email App
                  </button>
                  <button
                    onClick={() => handleEmailAction('copy')}
                    disabled={sendingEmail}
                    className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                      hover:bg-slate-50 transition-colors flex items-center justify-center gap-2
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsManagement;
