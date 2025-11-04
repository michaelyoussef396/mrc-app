import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createCompleteTestLead } from '@/lib/createTestLead';
import { toast } from 'sonner';
import { 
  Circle, 
  AlertTriangle, 
  Zap, 
  ChevronDown,
  Search,
  X,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  FlaskConical
} from 'lucide-react';

interface StatusOption {
  value: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
  nextActions?: string[];
  availableButtons?: string[];
}

const LeadsManagement = () => {
  const navigate = useNavigate();
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showRemoveReasonModal, setShowRemoveReasonModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [selectedLeadForRemoval, setSelectedLeadForRemoval] = useState<any>(null);

  // UPDATED 11-STAGE PIPELINE
  const statusOptions: StatusOption[] = [
    { 
      value: 'all', 
      label: 'All Leads', 
      icon: '📋', 
      color: '#6b7280',
      description: 'View all leads regardless of stage'
    },
    { 
      value: 'new_lead', 
      label: 'New Lead', 
      icon: '🌟', 
      color: '#3b82f6',
      description: 'Initial inquiry received from website',
      nextActions: ['Review inquiry', 'Schedule inspection'],
      availableButtons: ['call', 'viewDetails']
    },
    { 
      value: 'inspection_waiting', 
      label: 'Awaiting Inspection', 
      icon: '📅', 
      color: '#8b5cf6',
      description: 'Inspection scheduled, waiting for appointment',
      nextActions: ['Start inspection or remove lead'],
      availableButtons: ['call', 'email', 'startInspection', 'removeLead', 'viewDetails']
    },
    { 
      value: 'inspection_completed', 
      label: 'Inspection Complete', 
      icon: '✅', 
      color: '#10b981',
      description: 'Inspection finished, ready to generate PDF report',
      nextActions: ['Generate PDF report'],
      availableButtons: ['generatePDF', 'viewDetails']
    },
    { 
      value: 'approve_report_pdf', 
      label: 'Report PDF Approval', 
      icon: '📄', 
      color: '#a855f7',
      description: 'Inspection report PDF ready for review and approval',
      nextActions: ['Review PDF and approve for client delivery'],
      availableButtons: ['viewPDF', 'approvePDF', 'viewDetails']
    },
    { 
      value: 'job_waiting', 
      label: 'Awaiting Approval', 
      icon: '⏳', 
      color: '#f59e0b',
      description: 'Waiting for client to approve quote',
      nextActions: ['Follow up', 'Check decision timeline'],
      availableButtons: ['call', 'email', 'viewQuote', 'markApproved', 'removeLead', 'viewDetails']
    },
    { 
      value: 'job_completed', 
      label: 'Job Booked', 
      icon: '🔨', 
      color: '#8b5cf6',
      description: 'Client approved, job scheduled by customer',
      nextActions: ['Navigate to property', 'Start the job'],
      availableButtons: ['directions', 'startJob', 'call', 'viewDetails']
    },
    { 
      value: 'job_report_pdf_sent', 
      label: 'Job In Progress', 
      icon: '🔧', 
      color: '#f97316',
      description: 'Technicians currently on site doing work',
      nextActions: ['Complete the job when finished'],
      availableButtons: ['viewDetails', 'completeJob']
    },
    { 
      value: 'inspection_report_pdf_completed', 
      label: 'Job Complete', 
      icon: '✅', 
      color: '#22c55e',
      description: 'Work finished, ready for invoicing',
      nextActions: ['Send invoice'],
      availableButtons: ['sendInvoice', 'viewDetails']
    },
    { 
      value: 'invoicing_sent', 
      label: 'Quote Sent', 
      icon: '💰', 
      color: '#0ea5e9',
      description: 'Invoice/quote sent to client',
      nextActions: ['Wait for payment'],
      availableButtons: ['resendQuote', 'markPaid', 'viewDetails']
    },
    { 
      value: 'paid', 
      label: 'Paid', 
      icon: '💚', 
      color: '#10b981',
      description: 'Payment received',
      nextActions: ['Request Google review'],
      availableButtons: ['requestReview', 'viewDetails']
    },
    { 
      value: 'google_review', 
      label: 'Google Review', 
      icon: '⭐', 
      color: '#f59e0b',
      description: 'Requesting/awaiting Google review',
      nextActions: ['Close job'],
      availableButtons: ['markClosed', 'viewDetails']
    },
    { 
      value: 'finished', 
      label: 'Closed', 
      icon: '🎉', 
      color: '#059669',
      description: 'Job fully closed',
      nextActions: [],
      availableButtons: ['viewHistory', 'archive']
    },
    { 
      value: 'lost', 
      label: 'Not Landed', 
      icon: '❌', 
      color: '#ef4444',
      description: 'Lead removed or client didn\'t proceed',
      nextActions: ['Document reason', 'Follow up later'],
      availableButtons: ['viewHistory', 'addNotes', 'reactivate']
    }
  ];

  // Handle creating test lead with complete data
  const handleCreateTestLead = async () => {
    const loadingToast = toast.loading('Creating test lead with inspection data...');
    
    const result = await createCompleteTestLead();
    
    toast.dismiss(loadingToast);
    
    if (result.success) {
      toast.success('Test lead created! Ready to generate PDF.', {
        description: `Lead: ${result.lead.full_name} - ${result.lead.property_address_street}`,
        duration: 5000
      });
      
      // Refresh leads list
      loadLeads();
      
      // Navigate to the lead detail page
      setTimeout(() => {
        navigate(`/lead/new/${result.lead.id}`);
      }, 1500);
    } else {
      toast.error('Failed to create test lead', {
        description: result.error
      });
    }
  };

  // STAGE-SPECIFIC ACTION FUNCTIONS
  const stageActions = {
    markContacted: async (leadId: number) => {
      await updateLeadStatus(leadId, 'contacted');
    },
    
    sendQuote: (leadId: number) => {
      navigate(`/quote/create?leadId=${leadId}`);
    },
    
    scheduleInspection: (leadId: number) => {
      navigate(`/inspection/schedule?leadId=${leadId}`);
    },
    
    resendQuote: async (leadId: number) => {
      console.log('Resending quote for lead:', leadId);
    },
    
    startInspection: (leadId: number) => {
      navigate(`/inspection?leadId=${leadId}`);
    },
    
    reschedule: (leadId: number) => {
      navigate(`/inspection/schedule?leadId=${leadId}&reschedule=true`);
    },
    
    viewInspection: (leadId: number) => {
      navigate(`/inspection/view?leadId=${leadId}`);
    },
    
    generateReport: async (leadId: number) => {
      console.log('Generating report for lead:', leadId);
      navigate(`/report/generate?leadId=${leadId}`);
    },
    
    viewQuote: (leadId: number) => {
      navigate(`/quote/view?leadId=${leadId}`);
    },
    
    markApproved: async (leadId: number) => {
      await updateLeadStatus(leadId, 'job-booked');
    },
    
    viewSchedule: (leadId: number) => {
      navigate(`/calendar?leadId=${leadId}`);
    },
    
    startJob: async (leadId: number) => {
      const confirmed = window.confirm(
        'Start this job now?\n\nThis will update the status to "Job In Progress" and notify the client.'
      );
      
      if (confirmed) {
        // Update lead status
        await updateLeadStatus(leadId, 'job_report_pdf_sent');
        
        // TODO: Send notification to client
        // await sendClientNotification(leadId, 'job-started');
        
        // Show success message
        alert('Job started! Status updated to "In Progress"');
      }
    },
    
    viewProgress: (leadId: number) => {
      navigate(`/job/progress?leadId=${leadId}`);
    },
    
    updateStatus: (leadId: number) => {
      console.log('Update status for lead:', leadId);
    },
    
    completeJob: async (leadId: number) => {
      const confirmed = window.confirm(
        'Mark this job as complete?\n\nThis will update the status to "Job Complete" and notify the client.'
      );
      
      if (confirmed) {
        await updateLeadStatus(leadId, 'inspection_report_pdf_completed');
        
        // TODO: Send client notification
        // await sendClientNotification(leadId, 'job-completed');
        
        alert('Job marked as complete! Status updated.');
      }
    },
    
    sendInvoice: (leadId: number) => {
      navigate(`/invoice/create?leadId=${leadId}`);
    },
    
    markPaid: async (leadId: number) => {
      await updateLeadStatus(leadId, 'paid-closed');
    },
    
    requestFeedback: async (leadId: number) => {
      console.log('Requesting feedback for lead:', leadId);
    },
    
    requestReview: async (leadId: number) => {
      console.log('Requesting review for lead:', leadId);
    },
    
    viewHistory: (leadId: number) => {
      navigate(`/client/${leadId}/history`);
    },
    
    archive: async (leadId: number) => {
      console.log('Archiving lead:', leadId);
    },
    
    addNotes: (leadId: number) => {
      navigate(`/client/${leadId}?addNotes=true`);
    },
    
    reactivate: async (leadId: number) => {
      await updateLeadStatus(leadId, 'inspection_waiting');
    },
    
    markClosed: async (leadId: number) => {
      await updateLeadStatus(leadId, 'finished');
    },
    
    call: (phone: string) => {
      window.location.href = `tel:${phone}`;
    },
    
    email: (email: string) => {
      window.location.href = `mailto:${email}`;
    },
    
    removeLead: (lead: any) => {
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
        // TODO: Update in Supabase
        await updateLeadStatus(selectedLeadForRemoval.id, 'lost');
        
        setShowRemoveReasonModal(false);
        setSelectedLeadForRemoval(null);
        setRemoveReason('');
        
        alert('Lead has been removed and marked as "Not Landed"');
      }
    },
    
    viewDetails: (leadId: number, status?: string) => {
      // If lead is NEW, go to simplified new lead view
      if (status === 'new_lead') {
        navigate(`/lead/new/${leadId}`);
      } else {
        // Otherwise, go to full client detail page
        navigate(`/client/${leadId}`);
      }
    }
  };

  const updateLeadStatus = async (leadId: number, newStatus: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ));
  };

  const getAvailableActions = (lead: any) => {
    const statusConfig = statusOptions.find(opt => opt.value === lead.status);
    return statusConfig?.availableButtons || [];
  };

  const renderActionButtons = (lead: any) => {
    const availableActions = getAvailableActions(lead);
    
    const buttonConfig: any = {
      call: {
        icon: '📞',
        label: 'Call',
        onClick: () => stageActions.call(lead.phone),
        style: 'primary'
      },
      email: {
        icon: '📧',
        label: 'Email',
        onClick: () => stageActions.email(lead.email),
        style: 'primary'
      },
      removeLead: {
        icon: '❌',
        label: 'Remove Lead',
        onClick: () => stageActions.removeLead(lead),
        style: 'danger'
      },
      viewDetails: {
        icon: '👁️',
        label: 'View',
        onClick: () => stageActions.viewDetails(lead.id, lead.status),
        style: 'secondary'
      },
      markContacted: {
        icon: '✓',
        label: 'Contacted',
        onClick: () => stageActions.markContacted(lead.id),
        style: 'success'
      },
      sendQuote: {
        icon: '💰',
        label: 'Quote',
        onClick: () => stageActions.sendQuote(lead.id),
        style: 'primary'
      },
      scheduleInspection: {
        icon: '📅',
        label: 'Schedule',
        onClick: () => stageActions.scheduleInspection(lead.id),
        style: 'success'
      },
      resendQuote: {
        icon: '📄',
        label: 'Resend',
        onClick: () => stageActions.resendQuote(lead.id),
        style: 'secondary'
      },
      startInspection: {
        icon: '📝',
        label: 'Start',
        onClick: () => stageActions.startInspection(lead.id),
        style: 'success'
      },
      reschedule: {
        icon: '🔄',
        label: 'Reschedule',
        onClick: () => stageActions.reschedule(lead.id),
        style: 'secondary'
      },
      viewInspection: {
        icon: '📋',
        label: 'View',
        onClick: () => stageActions.viewInspection(lead.id),
        style: 'secondary'
      },
      generateReport: {
        icon: '📄',
        label: 'Generate',
        onClick: () => stageActions.generateReport(lead.id),
        style: 'primary'
      },
      viewQuote: {
        icon: '💰',
        label: 'View',
        onClick: () => stageActions.viewQuote(lead.id),
        style: 'secondary'
      },
      markApproved: {
        icon: '✓',
        label: 'Approved',
        onClick: () => stageActions.markApproved(lead.id),
        style: 'success'
      },
      viewSchedule: {
        icon: '📅',
        label: 'Schedule',
        onClick: () => stageActions.viewSchedule(lead.id),
        style: 'secondary'
      },
      directions: {
        icon: '🗺️',
        label: 'Directions',
        onClick: () => {
          const address = encodeURIComponent(
            `${lead.property}, ${lead.suburb} ${lead.state} ${lead.postcode}`
          );
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${address}`,
            '_blank'
          );
        },
        style: 'primary'
      },
      startJob: {
        icon: '🚀',
        label: 'Start Job',
        onClick: () => stageActions.startJob(lead.id),
        style: 'success'
      },
      completeJob: {
        icon: '✅',
        label: 'Complete',
        onClick: () => stageActions.completeJob(lead.id),
        style: 'success'
      },
      sendInvoice: {
        icon: '💵',
        label: 'Invoice',
        onClick: () => stageActions.sendInvoice(lead.id),
        style: 'primary'
      },
      markPaid: {
        icon: '💚',
        label: 'Paid',
        onClick: () => stageActions.markPaid(lead.id),
        style: 'success'
      },
      requestFeedback: {
        icon: '⭐',
        label: 'Feedback',
        onClick: () => stageActions.requestFeedback(lead.id),
        style: 'secondary'
      },
      requestReview: {
        icon: '⭐',
        label: 'Review',
        onClick: () => stageActions.requestReview(lead.id),
        style: 'secondary'
      },
      viewHistory: {
        icon: '📜',
        label: 'History',
        onClick: () => stageActions.viewHistory(lead.id),
        style: 'secondary'
      },
      archive: {
        icon: '📦',
        label: 'Archive',
        onClick: () => stageActions.archive(lead.id),
        style: 'secondary'
      },
      addNotes: {
        icon: '📝',
        label: 'Notes',
        onClick: () => stageActions.addNotes(lead.id),
        style: 'secondary'
      },
      markClosed: {
        icon: '🎉',
        label: 'Close',
        onClick: () => stageActions.markClosed(lead.id),
        style: 'success'
      },
      reactivate: {
        icon: '🔄',
        label: 'Reactivate',
        onClick: () => stageActions.reactivate(lead.id),
        style: 'success'
      },
      viewPDF: {
        icon: '👁️',
        label: 'View PDF',
        onClick: () => {
          navigate(`/report/view/${lead.id}`);
        },
        style: 'secondary'
      },
      generatePDF: {
        icon: '📄',
        label: 'Generate PDF',
        onClick: async () => {
          const loadingToast = toast.loading('Generating PDF report...');
          
          try {
            // Fetch inspection data
            const { data: inspection, error } = await supabase
              .from('inspections')
              .select(`
                *,
                inspection_areas (
                  *,
                  moisture_readings (*)
                ),
                equipment_bookings (
                  *,
                  equipment (*)
                )
              `)
              .eq('lead_id', lead.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (error) throw error;
            if (!inspection) throw new Error('No inspection found for this lead');

            // Prepare data for PDF generation
            const inspectionData = {
              jobNumber: inspection.job_number,
              inspector: inspection.inspector_id,
              requestedBy: inspection.requested_by || lead.name,
              attentionTo: inspection.attention_to || lead.name,
              inspectionDate: inspection.inspection_date,
              address: `${lead.property}, ${lead.suburb} VIC ${lead.postcode}`,
              dwellingType: inspection.dwelling_type,
              outdoorTemperature: inspection.outdoor_temperature,
              outdoorHumidity: inspection.outdoor_humidity,
              outdoorDewPoint: inspection.outdoor_dew_point,
              totalCost: inspection.estimated_cost_inc_gst,
              areas: inspection.inspection_areas || []
            };

            // Call edge function
            const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-inspection-pdf', {
              body: {
                inspectionData,
                leadId: lead.id
              }
            });

            if (pdfError) throw pdfError;
            if (!pdfData.success) throw new Error(pdfData.error || 'Failed to generate PDF');

            toast.dismiss(loadingToast);
            toast.success('PDF Generated!', {
              description: 'Redirecting to PDF viewer...'
            });

            setTimeout(() => {
              navigate(`/report/view/${lead.id}`);
            }, 1000);

          } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error('Failed to generate PDF', {
              description: error.message
            });
            console.error('PDF generation error:', error);
          }
        },
        style: 'primary'
      },
      approvePDF: {
        icon: '✓',
        label: 'Approve & Send',
        onClick: () => {
          navigate(`/report/view/${lead.id}`);
        },
        style: 'success'
      }
    };

    return availableActions.map(actionKey => {
      const config = buttonConfig[actionKey];
      if (!config) return null;

      return (
        <button
          key={actionKey}
          className={`action-btn action-btn-${config.style}`}
          onClick={(e) => {
            e.stopPropagation();
            config.onClick();
          }}
          title={config.label}
        >
          <span className="action-icon">{config.icon}</span>
          <span className="action-label">{config.label}</span>
        </button>
      );
    });
  };

  useEffect(() => {
    loadLeads();
  }, [statusFilter, urgencyFilter, sortBy]);

  const loadLeads = async () => {
    setLoading(true);
    
    // Mock data covering ALL 9 pipeline stages
    const mockLeads = [
      // 1. NEW_LEAD - Brand new inquiry from website
      {
        id: 1,
        name: 'John Doe',
        email: 'john@email.com',
        phone: '0412 345 678',
        property: '123 Smith Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        status: 'new_lead',
        urgency: 'high',
        source: 'Website Form',
        dateCreated: '2025-01-29T10:30:00',
        lastContact: null,
        estimatedValue: null,
        issueDescription: 'Visible black mould in bathroom around shower area and on bedroom ceiling near window'
      },
      {
        id: 2,
        name: 'Emma Wilson',
        email: 'emma@email.com',
        phone: '0434 567 890',
        property: '67 High Street',
        suburb: 'Preston',
        state: 'VIC',
        postcode: '3072',
        status: 'new_lead',
        urgency: 'medium',
        source: 'Google Ads',
        dateCreated: '2025-01-29T08:15:00',
        lastContact: null,
        estimatedValue: null,
        issueDescription: 'Musty smell in laundry room and visible spots on walls'
      },
      
      // 2. INSPECTION_WAITING - Inspection has been scheduled
      {
        id: 3,
        name: 'Sarah Miller',
        email: 'sarah@email.com',
        phone: '0423 456 789',
        property: '45 Queen Street',
        suburb: 'Richmond',
        state: 'VIC',
        postcode: '3121',
        status: 'inspection_waiting',
        urgency: 'high',
        source: 'Referral',
        dateCreated: '2025-01-28T14:15:00',
        lastContact: '2025-01-29T09:30:00',
        scheduledDate: '2025-01-30T14:00:00',
        estimatedValue: null,
        issueDescription: 'Roof leak causing mould growth in multiple rooms - urgent'
      },
      {
        id: 4,
        name: 'Peter Thompson',
        email: 'peter@email.com',
        phone: '0445 123 456',
        property: '78 Station Road',
        suburb: 'Box Hill',
        state: 'VIC',
        postcode: '3128',
        status: 'inspection_waiting',
        urgency: 'medium',
        source: 'Website Form',
        dateCreated: '2025-01-27T16:45:00',
        lastContact: '2025-01-28T10:00:00',
        scheduledDate: '2025-01-31T10:00:00',
        estimatedValue: null,
        issueDescription: 'Black mould in bathroom after recent flooding'
      },
      // NEW: APPROVE_REPORT_PDF - Report ready for review
      {
        id: 16,
        name: 'Lisa Anderson',
        email: 'lisa@email.com',
        phone: '0412 678 901',
        property: '92 Park Avenue',
        suburb: 'Hawthorn',
        state: 'VIC',
        postcode: '3122',
        status: 'approve_report_pdf',
        urgency: 'medium',
        source: 'Website Form',
        dateCreated: '2025-01-26T11:30:00',
        lastContact: '2025-01-29T10:00:00',
        estimatedValue: 3200,
        issueDescription: 'Inspection complete - PDF report ready for approval'
      },
      // 3. JOB_WAITING - Awaiting Approval
      {
        id: 5,
        name: 'Jennifer White',
        email: 'jennifer@email.com',
        phone: '0456 345 678',
        property: '45 Collins Street',
        suburb: 'Essendon',
        state: 'VIC',
        postcode: '3040',
        status: 'job_waiting',
        urgency: 'low',
        source: 'Google Ads',
        dateCreated: '2025-01-23T14:45:00',
        lastContact: '2025-01-25T11:00:00',
        estimatedValue: 2800,
        issueDescription: 'Bathroom and ensuite mould - waiting on insurance approval'
      },
      
      // 4. JOB_COMPLETED - Job Booked
      {
        id: 6,
        name: 'Jessica Taylor',
        email: 'jessica@email.com',
        phone: '0478 901 234',
        property: '34 Lygon Street',
        suburb: 'Carlton',
        state: 'VIC',
        postcode: '3053',
        status: 'job_completed',
        urgency: 'high',
        source: 'Referral',
        dateCreated: '2025-01-22T13:45:00',
        lastContact: '2025-01-26T09:00:00',
        scheduledDate: '2025-01-31T09:00:00',
        estimatedValue: 6700,
        issueDescription: 'Extensive mould remediation - multiple rooms and subfloor treatment'
      },
      {
        id: 7,
        name: 'Andrew Martin',
        email: 'andrew@email.com',
        phone: '0467 567 890',
        property: '89 Main Street',
        suburb: 'Eltham',
        state: 'VIC',
        postcode: '3095',
        status: 'job_completed',
        urgency: 'medium',
        source: 'Website Form',
        dateCreated: '2025-01-21T09:30:00',
        lastContact: '2025-01-24T15:00:00',
        scheduledDate: '2025-02-03T08:00:00',
        estimatedValue: 3900,
        issueDescription: 'Kitchen and bathroom mould removal and sanitization',
        scheduled_dates: ['2025-02-03', '2025-02-04', '2025-02-05'],
        scheduled_time: '9:00 AM',
        access_instructions: 'Key under doormat at front entrance. Please park on street.',
        booked_at: '2025-01-27T15:30:00'
      },
      
      // 5. JOB_REPORT_PDF_SENT - Job In Progress
      {
        id: 8,
        name: 'Michelle Lee',
        email: 'michelle@email.com',
        phone: '0423 789 012',
        property: '56 Railway Parade',
        suburb: 'Glen Waverley',
        state: 'VIC',
        postcode: '3150',
        status: 'job_report_pdf_sent',
        urgency: 'high',
        source: 'Referral',
        dateCreated: '2025-01-20T11:00:00',
        lastContact: '2025-01-29T08:00:00',
        estimatedValue: 5200,
        issueDescription: 'Full house mould treatment - day 2 of 3'
      },
      
      // 6. INSPECTION_REPORT_PDF_COMPLETED - Job Complete
      {
        id: 9,
        name: 'Daniel Green',
        email: 'daniel@email.com',
        phone: '0434 890 123',
        property: '12 River Street',
        suburb: 'Kew',
        state: 'VIC',
        postcode: '3101',
        status: 'inspection_report_pdf_completed',
        urgency: 'low',
        source: 'Google Ads',
        dateCreated: '2025-01-18T14:20:00',
        lastContact: '2025-01-27T16:00:00',
        estimatedValue: 4100,
        issueDescription: 'Bathroom and laundry mould remediation - work completed'
      },
      
      // 7. INVOICING_SENT - Quote Sent (after job complete)
      {
        id: 10,
        name: 'Robert Davis',
        email: 'robert@email.com',
        phone: '0489 123 456',
        property: '23 Beach Road',
        suburb: 'Sandringham',
        state: 'VIC',
        postcode: '3191',
        status: 'invoicing_sent',
        urgency: 'medium',
        source: 'Website Form',
        dateCreated: '2025-01-24T10:15:00',
        lastContact: '2025-01-26T16:00:00',
        estimatedValue: 4200,
        issueDescription: 'Mould remediation complete - invoice sent'
      },
      {
        id: 11,
        name: 'Sophie Clarke',
        email: 'sophie@email.com',
        phone: '0445 234 567',
        property: '78 Garden Road',
        suburb: 'Malvern',
        state: 'VIC',
        postcode: '3144',
        status: 'invoicing_sent',
        urgency: 'medium',
        source: 'Referral',
        dateCreated: '2025-01-19T10:45:00',
        lastContact: '2025-01-28T11:00:00',
        estimatedValue: 3600,
        issueDescription: 'Bedroom mould treatment complete - awaiting payment'
      },
      
      // 8. PAID - Payment received
      {
        id: 12,
        name: 'William Johnson',
        email: 'william@email.com',
        phone: '0456 678 901',
        property: '23 Hill Street',
        suburb: 'Thornbury',
        state: 'VIC',
        postcode: '3071',
        status: 'paid',
        urgency: 'low',
        source: 'Website Form',
        dateCreated: '2025-01-15T09:00:00',
        lastContact: '2025-01-26T14:00:00',
        estimatedValue: 2900,
        issueDescription: 'Kitchen mould removal - paid'
      },
      
      // 9. GOOGLE_REVIEW - Awaiting review
      {
        id: 13,
        name: 'Olivia Harris',
        email: 'olivia@email.com',
        phone: '0467 789 012',
        property: '45 Forest Drive',
        suburb: 'Doncaster',
        state: 'VIC',
        postcode: '3108',
        status: 'google_review',
        urgency: 'low',
        source: 'Referral',
        dateCreated: '2025-01-14T13:30:00',
        lastContact: '2025-01-25T10:00:00',
        estimatedValue: 5800,
        issueDescription: 'Multiple rooms remediation - awaiting Google review'
      },
      
      // 10. FINISHED - Closed
      {
        id: 14,
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        phone: '0411 222 333',
        property: '12 Ocean Drive',
        suburb: 'Frankston',
        state: 'VIC',
        postcode: '3199',
        status: 'finished',
        urgency: 'low',
        source: 'Website Form',
        dateCreated: '2025-01-10T09:00:00',
        lastContact: '2025-01-22T14:00:00',
        estimatedValue: 3400,
        issueDescription: 'Bathroom mould - fully closed with positive review'
      },
      
      // 11. LOST - Not Landed
      {
        id: 15,
        name: 'Thomas Wright',
        email: 'thomas@email.com',
        phone: '0478 890 123',
        property: '67 Church Street',
        suburb: 'Brighton',
        state: 'VIC',
        postcode: '3186',
        status: 'lost',
        urgency: 'low',
        source: 'Facebook',
        dateCreated: '2025-01-20T15:45:00',
        lastContact: '2025-01-24T09:00:00',
        estimatedValue: 3200,
        issueDescription: 'Bathroom mould - decided to go with another company'
      }
    ];
    
    setLeads(mockLeads);
    setLoading(false);
  };

  const getFilteredLeads = () => {
    let filtered = [...leads];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }
    
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(lead => lead.urgency === urgencyFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
          return b.estimatedValue - a.estimatedValue;
        case 'value-low':
          return a.estimatedValue - b.estimatedValue;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.label || status;
  };

  const getStatusIcon = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.icon || '📋';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-AU', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusCounts = () => {
    return statusOptions.map(option => ({
      ...option,
      count: option.value === 'all' 
        ? leads.length 
        : leads.filter(lead => lead.status === option.value).length
    }));
  };

  const filteredLeads = getFilteredLeads();

  return (
    <div className="leads-page">
      <div className="leads-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <nav className="leads-nav">
        <div className="nav-container">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <span className="back-arrow">←</span>
            <span>Dashboard</span>
          </button>
          
          <div className="nav-title">
            <span className="nav-icon">📋</span>
            <span>Leads</span>
          </div>

          <button className="btn-primary btn-new-lead" onClick={() => navigate('/lead/new')}>
            <span>+</span>
            <span>New Lead</span>
          </button>
          
          <button 
            className="btn-secondary" 
            onClick={handleCreateTestLead}
            style={{ 
              marginLeft: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#7c3aed'}
            onMouseOut={(e) => e.currentTarget.style.background = '#8b5cf6'}
          >
            <FlaskConical size={18} />
            <span>Create Test Lead</span>
          </button>
        </div>
      </nav>

      <main className="leads-main">
        <div className="leads-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Lead Management</h1>
              <p className="page-subtitle">
                Showing {filteredLeads.length} of {leads.length} leads
              </p>
            </div>
          </div>

          <div className="status-tabs-scroll">
            <div className="status-tabs">
              {getStatusCounts().map(status => (
                <button
                  key={status.value}
                  className={`status-tab ${statusFilter === status.value ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status.value)}
                  style={{
                    // @ts-ignore
                    '--status-color': status.color
                  }}
                  title={status.description}
                >
                  <span className="status-tab-icon">{status.icon}</span>
                  <div className="status-tab-content">
                    <span className="status-tab-label">{status.label}</span>
                    <span className="status-tab-count">{status.count}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="controls-section">
            <div className="search-bar">
              <Search size={18} strokeWidth={2} className="search-icon-leads" />
              <input
                type="text"
                placeholder="Search by name, property, suburb, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label className="filter-label">URGENCY</label>
                <div className="filter-select-wrapper">
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                  <ChevronDown size={16} className="filter-select-arrow" />
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">SORT BY</label>
                <div className="filter-select-wrapper">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="filter-select"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="value-high">Value: High to Low</option>
                    <option value="value-low">Value: Low to High</option>
                    <option value="name">Name A-Z</option>
                  </select>
                  <ChevronDown size={16} className="filter-select-arrow" />
                </div>
              </div>

              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                >
                  <span className="view-icon">▦</span>
                  <span className="view-label">Cards</span>
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <span className="view-icon">☰</span>
                  <span className="view-label">List</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {searchQuery || statusFilter !== 'all' || urgencyFilter !== 'all' ? '🔍' : '📋'}
              </div>
              <h3>
                {searchQuery || statusFilter !== 'all' || urgencyFilter !== 'all'
                  ? 'No leads found'
                  : 'No leads yet'}
              </h3>
              <p>
                {searchQuery || statusFilter !== 'all' || urgencyFilter !== 'all'
                  ? 'Try adjusting your filters or search'
                  : 'Create your first lead to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && urgencyFilter === 'all' && (
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/lead/new')}
                >
                  <span>+</span>
                  <span>Create First Lead</span>
                </button>
              )}
            </div>
          ) : (
            <div className={`leads-grid ${viewMode}`}>
              {filteredLeads.map(lead => (
                <div 
                  key={lead.id} 
                  className="lead-card"
                  onClick={() => navigate(`/client/${lead.id}`)}
                >
                  <div className="lead-card-header">
                    <div className="lead-avatar">
                      {lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    
                    <div className="lead-header-info">
                      <h3 className="lead-name">{lead.name}</h3>
                      <div className="lead-badges">
                        <span 
                          className="status-badge"
                          style={{ background: `${getStatusColor(lead.status)}15`, color: getStatusColor(lead.status) }}
                        >
                          {getStatusIcon(lead.status)} {getStatusLabel(lead.status)}
                        </span>
                        {lead.urgency === 'high' && (
                          <span className="urgency-badge high">
                            <AlertTriangle size={12} strokeWidth={2.5} />
                            Urgent
                          </span>
                        )}
                        {lead.urgency === 'medium' && (
                          <span className="urgency-badge medium">
                            <Circle size={12} strokeWidth={2.5} />
                            Medium
                          </span>
                        )}
                        {lead.urgency === 'low' && (
                          <span className="urgency-badge low">
                            <Circle size={12} strokeWidth={2.5} />
                            Low
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lead-property">
                    <MapPin size={14} strokeWidth={2} className="property-icon-leads" />
                    <span className="property-text">
                      {lead.property}, {lead.suburb} {lead.state} {lead.postcode}
                    </span>
                  </div>

                  <div className="lead-contact-row">
                    <div className="contact-item">
                      <Phone size={14} strokeWidth={2} className="contact-icon-leads" />
                      <a href={`tel:${lead.phone}`} className="contact-link" onClick={(e) => e.stopPropagation()}>
                        {lead.phone}
                      </a>
                    </div>
                    <div className="contact-item">
                      <Mail size={14} strokeWidth={2} className="contact-icon-leads" />
                      <a href={`mailto:${lead.email}`} className="contact-link" onClick={(e) => e.stopPropagation()}>
                        {lead.email}
                      </a>
                    </div>
                  </div>

                  <div className="lead-issue">
                    <MessageSquare size={14} strokeWidth={2} className="issue-icon-leads" />
                    <p className="issue-text">{lead.issueDescription}</p>
                  </div>

                  {/* SCHEDULE INFO BANNER FOR JOB BOOKED */}
                  {lead.status === 'job_completed' && lead.scheduled_dates && (
                    <div className="schedule-info-banner">
                      <div className="schedule-icon">📅</div>
                      <div className="schedule-details">
                        <div className="schedule-title">Scheduled Service</div>
                        <div className="schedule-dates">
                          {lead.scheduled_dates.length === 1 ? (
                            <span className="date-item">
                              {new Date(lead.scheduled_dates[0]).toLocaleDateString('en-AU', {
                                weekday: 'long',
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          ) : (
                            <div className="multi-day-schedule">
                              {lead.scheduled_dates.slice(0, 3).map((date: string, index: number) => (
                                <span key={date} className="date-item">
                                  Day {index + 1}: {new Date(date).toLocaleDateString('en-AU', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              ))}
                              {lead.scheduled_dates.length > 3 && (
                                <span className="date-item">+{lead.scheduled_dates.length - 3} more days</span>
                              )}
                            </div>
                          )}
                        </div>
                        {lead.scheduled_time && (
                          <div className="schedule-time">
                            <span className="time-icon">🕐</span>
                            <span className="time-text">Start: {lead.scheduled_time}</span>
                          </div>
                        )}
                        {lead.access_instructions && (
                          <div className="access-preview">
                            <span className="access-icon">🔑</span>
                            <span className="access-text">{lead.access_instructions}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="lead-meta">
                    <div className="meta-item">
                      <span className="meta-label">Value</span>
                      <span className="meta-value">${lead.estimatedValue?.toLocaleString() || 'TBD'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Source</span>
                      <span className="meta-value">{lead.source}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Created</span>
                      <span className="meta-value">{formatDate(lead.dateCreated)}</span>
                    </div>
                  </div>

                  {/* NEXT ACTION INDICATOR */}
                  {statusOptions.find(opt => opt.value === lead.status)?.nextActions && (
                    <div className="lead-next-action">
                      <span className="next-action-icon">→</span>
                      <span className="next-action-text">
                        Next: {statusOptions.find(opt => opt.value === lead.status)?.nextActions?.[0]}
                      </span>
                    </div>
                  )}

                  {/* STAGE-SPECIFIC ACTION BUTTONS */}
                  <div className="lead-actions" onClick={(e) => e.stopPropagation()}>
                    {renderActionButtons(lead)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredLeads.length > 0 && (
            <div className="results-summary">
              <p className="results-text">
                Showing <strong>{filteredLeads.length}</strong> {filteredLeads.length === 1 ? 'lead' : 'leads'}
                {statusFilter !== 'all' && ` in "${getStatusLabel(statusFilter)}"`}
              </p>
              <p className="results-value">
                Total estimated value: <strong>${filteredLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0).toLocaleString()}</strong>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Remove Lead Reason Modal */}
      {showRemoveReasonModal && selectedLeadForRemoval && (
        <div className="modal-overlay" onClick={() => setShowRemoveReasonModal(false)}>
          <div className="modal-content modal-warning" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon warning">⚠️</div>
              <div>
                <h2 className="modal-title">Remove Lead</h2>
                <p className="modal-subtitle">
                  Why is this lead being removed?
                </p>
              </div>
              <button 
                className="modal-close"
                onClick={() => setShowRemoveReasonModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="lead-removal-info">
                <p className="removal-lead-name">
                  <strong>{selectedLeadForRemoval.name}</strong>
                </p>
                <p className="removal-lead-property">
                  📍 {selectedLeadForRemoval.property}, {selectedLeadForRemoval.suburb}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Removal *</label>
                <select
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  className="form-select"
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
                <div className="form-group">
                  <label className="form-label">Additional Details</label>
                  <textarea
                    placeholder="Please provide more details..."
                    className="form-textarea"
                    rows={3}
                  />
                </div>
              )}

              <div className="warning-box">
                <span className="warning-icon">ℹ️</span>
                <p className="warning-text">
                  This lead will be moved to "Not Landed" and removed from the active pipeline. 
                  You can reactivate it later if needed.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowRemoveReasonModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={() => stageActions.confirmRemoveLead()}
                disabled={!removeReason}
              >
                <span className="btn-icon">❌</span>
                <span className="btn-label">Remove Lead</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsManagement;
