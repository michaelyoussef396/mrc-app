import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

  // COMPLETE 12-STAGE PIPELINE
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
      description: 'Inspection has been scheduled, waiting for appointment',
      nextActions: ['Prepare for inspection', 'Confirm appointment'],
      availableButtons: ['call', 'email', 'startInspection', 'reschedule', 'viewDetails']
    },
    { 
      value: 'quoted', 
      label: 'Quoted', 
      icon: '💰', 
      color: '#f59e0b',
      description: 'Initial quote provided (before inspection)',
      nextActions: ['Follow up on quote', 'Book inspection'],
      availableButtons: ['call', 'email', 'scheduleInspection', 'resendQuote', 'viewDetails']
    },
    { 
      value: 'inspection-scheduled', 
      label: 'Inspection Scheduled', 
      icon: '📅', 
      color: '#10b981',
      description: 'Inspection appointment booked',
      nextActions: ['Prepare for inspection', 'Confirm appointment'],
      availableButtons: ['startInspection', 'reschedule', 'viewDetails', 'call', 'email']
    },
    { 
      value: 'inspection-complete', 
      label: 'Inspection Complete', 
      icon: '✓', 
      color: '#059669',
      description: 'Inspection finished, report being prepared',
      nextActions: ['Generate report', 'Prepare quote'],
      availableButtons: ['viewInspection', 'generateReport', 'sendQuote', 'viewDetails']
    },
    { 
      value: 'quote-sent', 
      label: 'Quote Sent', 
      icon: '📄', 
      color: '#0ea5e9',
      description: 'Full quote sent after inspection',
      nextActions: ['Follow up on quote', 'Answer questions'],
      availableButtons: ['call', 'email', 'resendQuote', 'viewQuote', 'viewDetails']
    },
    { 
      value: 'awaiting-approval', 
      label: 'Awaiting Approval', 
      icon: '⏳', 
      color: '#f59e0b',
      description: 'Waiting for client to approve quote',
      nextActions: ['Follow up', 'Check decision timeline'],
      availableButtons: ['call', 'email', 'viewQuote', 'markApproved', 'viewDetails']
    },
    { 
      value: 'job-booked', 
      label: 'Job Booked', 
      icon: '🔨', 
      color: '#8b5cf6',
      description: 'Client approved, job scheduled',
      nextActions: ['Prepare equipment', 'Confirm start date'],
      availableButtons: ['viewSchedule', 'startJob', 'reschedule', 'call', 'viewDetails']
    },
    { 
      value: 'job-in-progress', 
      label: 'Job In Progress', 
      icon: '🔧', 
      color: '#f97316',
      description: 'Technicians on site doing work',
      nextActions: ['Monitor progress', 'Update client'],
      availableButtons: ['viewProgress', 'updateStatus', 'completeJob', 'viewDetails']
    },
    { 
      value: 'job-complete', 
      label: 'Job Complete', 
      icon: '✅', 
      color: '#22c55e',
      description: 'Work finished, awaiting payment/sign-off',
      nextActions: ['Send invoice', 'Request payment', 'Get sign-off'],
      availableButtons: ['sendInvoice', 'markPaid', 'requestFeedback', 'viewDetails']
    },
    { 
      value: 'paid-closed', 
      label: 'Paid & Closed', 
      icon: '💚', 
      color: '#10b981',
      description: 'Payment received, job fully closed',
      nextActions: ['Request review', 'Archive'],
      availableButtons: ['requestReview', 'viewHistory', 'archive']
    },
    { 
      value: 'lost', 
      label: 'Lost', 
      icon: '❌', 
      color: '#ef4444',
      description: 'Client didn\'t proceed',
      nextActions: ['Document reason', 'Follow up later'],
      availableButtons: ['viewHistory', 'addNotes', 'reactivate']
    }
  ];

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
      await updateLeadStatus(leadId, 'job-in-progress');
    },
    
    viewProgress: (leadId: number) => {
      navigate(`/job/progress?leadId=${leadId}`);
    },
    
    updateStatus: (leadId: number) => {
      console.log('Update status for lead:', leadId);
    },
    
    completeJob: async (leadId: number) => {
      await updateLeadStatus(leadId, 'job-complete');
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
      await updateLeadStatus(leadId, 'contacted');
    },
    
    call: (phone: string) => {
      window.location.href = `tel:${phone}`;
    },
    
    email: (email: string) => {
      window.location.href = `mailto:${email}`;
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
      startJob: {
        icon: '🔨',
        label: 'Start',
        onClick: () => stageActions.startJob(lead.id),
        style: 'success'
      },
      viewProgress: {
        icon: '📊',
        label: 'Progress',
        onClick: () => stageActions.viewProgress(lead.id),
        style: 'secondary'
      },
      updateStatus: {
        icon: '🔄',
        label: 'Update',
        onClick: () => stageActions.updateStatus(lead.id),
        style: 'secondary'
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
      reactivate: {
        icon: '🔄',
        label: 'Reactivate',
        onClick: () => stageActions.reactivate(lead.id),
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
    
    // Mock data covering ALL 12 pipeline stages
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
      
      // 3. QUOTED - Initial quote provided (before inspection)
      {
        id: 5,
        name: 'Michael Chen',
        email: 'michael@email.com',
        phone: '0456 789 012',
        property: '89 Brunswick Street',
        suburb: 'Fitzroy',
        state: 'VIC',
        postcode: '3065',
        status: 'quoted',
        urgency: 'low',
        source: 'Facebook',
        dateCreated: '2025-01-26T16:20:00',
        lastContact: '2025-01-27T10:00:00',
        estimatedValue: 1800,
        issueDescription: 'Musty smell in basement, possible mould - wants rough quote first'
      },
      
      // 4. INSPECTION_SCHEDULED - Ready to start inspection
      {
        id: 6,
        name: 'Emily Watson',
        email: 'emily@email.com',
        phone: '0445 678 901',
        property: '12 Chapel Street',
        suburb: 'Windsor',
        state: 'VIC',
        postcode: '3181',
        status: 'inspection-scheduled',
        urgency: 'high',
        source: 'Website Form',
        dateCreated: '2025-01-27T09:45:00',
        lastContact: '2025-01-28T11:00:00',
        scheduledDate: '2025-01-29T14:00:00',
        estimatedValue: null,
        issueDescription: 'Black mould in bathroom - health concerns for young children'
      },
      
      // 5. INSPECTION_COMPLETE - Inspection done, preparing report
      {
        id: 7,
        name: 'David Brown',
        email: 'david@email.com',
        phone: '0467 890 123',
        property: '56 Bourke Street',
        suburb: 'Melbourne CBD',
        state: 'VIC',
        postcode: '3000',
        status: 'inspection-complete',
        urgency: 'medium',
        source: 'Google Ads',
        dateCreated: '2025-01-25T11:20:00',
        lastContact: '2025-01-27T15:30:00',
        estimatedValue: 5600,
        issueDescription: 'Commercial office - multiple rooms with mould contamination'
      },
      {
        id: 8,
        name: 'Lisa Anderson',
        email: 'lisa@email.com',
        phone: '0478 234 567',
        property: '34 Park Avenue',
        suburb: 'Hawthorn',
        state: 'VIC',
        postcode: '3122',
        status: 'inspection-complete',
        urgency: 'high',
        source: 'Referral',
        dateCreated: '2025-01-26T08:30:00',
        lastContact: '2025-01-27T14:00:00',
        estimatedValue: 3400,
        issueDescription: 'Extensive mould in subfloor and crawl space'
      },
      
      // 6. QUOTE_SENT - Full quote sent after inspection
      {
        id: 9,
        name: 'Robert Davis',
        email: 'robert@email.com',
        phone: '0489 123 456',
        property: '23 Beach Road',
        suburb: 'Sandringham',
        state: 'VIC',
        postcode: '3191',
        status: 'quote-sent',
        urgency: 'medium',
        source: 'Website Form',
        dateCreated: '2025-01-24T10:15:00',
        lastContact: '2025-01-26T16:00:00',
        estimatedValue: 4200,
        issueDescription: 'Mould in bedroom walls and ceiling - needs full remediation'
      },
      
      // 7. AWAITING_APPROVAL - Waiting for client decision
      {
        id: 10,
        name: 'Jennifer White',
        email: 'jennifer@email.com',
        phone: '0456 345 678',
        property: '45 Collins Street',
        suburb: 'Essendon',
        state: 'VIC',
        postcode: '3040',
        status: 'awaiting-approval',
        urgency: 'low',
        source: 'Google Ads',
        dateCreated: '2025-01-23T14:45:00',
        lastContact: '2025-01-25T11:00:00',
        estimatedValue: 2800,
        issueDescription: 'Bathroom and ensuite mould - waiting on insurance approval'
      },
      
      // 8. JOB_BOOKED - Client approved, job scheduled
      {
        id: 11,
        name: 'Jessica Taylor',
        email: 'jessica@email.com',
        phone: '0478 901 234',
        property: '34 Lygon Street',
        suburb: 'Carlton',
        state: 'VIC',
        postcode: '3053',
        status: 'job-booked',
        urgency: 'high',
        source: 'Referral',
        dateCreated: '2025-01-22T13:45:00',
        lastContact: '2025-01-26T09:00:00',
        scheduledDate: '2025-01-31T09:00:00',
        estimatedValue: 6700,
        issueDescription: 'Extensive mould remediation - multiple rooms and subfloor treatment'
      },
      {
        id: 12,
        name: 'Andrew Martin',
        email: 'andrew@email.com',
        phone: '0467 567 890',
        property: '89 Main Street',
        suburb: 'Eltham',
        state: 'VIC',
        postcode: '3095',
        status: 'job-booked',
        urgency: 'medium',
        source: 'Website Form',
        dateCreated: '2025-01-21T09:30:00',
        lastContact: '2025-01-24T15:00:00',
        scheduledDate: '2025-02-03T08:00:00',
        estimatedValue: 3900,
        issueDescription: 'Kitchen and bathroom mould removal and sanitization'
      },
      
      // 9. JOB_IN_PROGRESS - Work currently being done
      {
        id: 13,
        name: 'Michelle Lee',
        email: 'michelle@email.com',
        phone: '0423 789 012',
        property: '56 Railway Parade',
        suburb: 'Glen Waverley',
        state: 'VIC',
        postcode: '3150',
        status: 'job-in-progress',
        urgency: 'high',
        source: 'Referral',
        dateCreated: '2025-01-20T11:00:00',
        lastContact: '2025-01-29T08:00:00',
        estimatedValue: 5200,
        issueDescription: 'Full house mould treatment - day 2 of 3'
      },
      
      // 10. JOB_COMPLETE - Work finished, awaiting payment
      {
        id: 14,
        name: 'Daniel Green',
        email: 'daniel@email.com',
        phone: '0434 890 123',
        property: '12 River Street',
        suburb: 'Kew',
        state: 'VIC',
        postcode: '3101',
        status: 'job-complete',
        urgency: 'low',
        source: 'Google Ads',
        dateCreated: '2025-01-18T14:20:00',
        lastContact: '2025-01-27T16:00:00',
        estimatedValue: 4100,
        issueDescription: 'Bathroom and laundry mould remediation - completed yesterday'
      },
      {
        id: 15,
        name: 'Sophie Clarke',
        email: 'sophie@email.com',
        phone: '0445 234 567',
        property: '78 Garden Road',
        suburb: 'Malvern',
        state: 'VIC',
        postcode: '3144',
        status: 'job-complete',
        urgency: 'medium',
        source: 'Referral',
        dateCreated: '2025-01-19T10:45:00',
        lastContact: '2025-01-28T11:00:00',
        estimatedValue: 3600,
        issueDescription: 'Bedroom and wardrobe mould treatment - job completed'
      },
      
      // 11. PAID_CLOSED - Payment received, job closed
      {
        id: 16,
        name: 'William Johnson',
        email: 'william@email.com',
        phone: '0456 678 901',
        property: '23 Hill Street',
        suburb: 'Thornbury',
        state: 'VIC',
        postcode: '3071',
        status: 'paid-closed',
        urgency: 'low',
        source: 'Website Form',
        dateCreated: '2025-01-15T09:00:00',
        lastContact: '2025-01-26T14:00:00',
        estimatedValue: 2900,
        issueDescription: 'Kitchen mould removal - paid and closed'
      },
      {
        id: 17,
        name: 'Olivia Harris',
        email: 'olivia@email.com',
        phone: '0467 789 012',
        property: '45 Forest Drive',
        suburb: 'Doncaster',
        state: 'VIC',
        postcode: '3108',
        status: 'paid-closed',
        urgency: 'low',
        source: 'Referral',
        dateCreated: '2025-01-14T13:30:00',
        lastContact: '2025-01-25T10:00:00',
        estimatedValue: 5800,
        issueDescription: 'Multiple rooms mould remediation - fully paid'
      },
      
      // 12. LOST - Client didn't proceed
      {
        id: 18,
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
              <span className="search-icon">🔍</span>
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
                  ✕
                </button>
              )}
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label className="filter-label">Urgency</label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Sort By</label>
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
                            🔴 Urgent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lead-property">
                    <span className="property-icon">📍</span>
                    <span className="property-text">
                      {lead.property}, {lead.suburb} {lead.state} {lead.postcode}
                    </span>
                  </div>

                  <div className="lead-contact-row">
                    <div className="contact-item">
                      <span className="contact-icon">📱</span>
                      <a href={`tel:${lead.phone}`} className="contact-link" onClick={(e) => e.stopPropagation()}>
                        {lead.phone}
                      </a>
                    </div>
                    <div className="contact-item">
                      <span className="contact-icon">📧</span>
                      <a href={`mailto:${lead.email}`} className="contact-link" onClick={(e) => e.stopPropagation()}>
                        {lead.email}
                      </a>
                    </div>
                  </div>

                  <div className="lead-issue">
                    <span className="issue-icon">💬</span>
                    <p className="issue-text">{lead.issueDescription}</p>
                  </div>

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
    </div>
  );
};

export default LeadsManagement;
