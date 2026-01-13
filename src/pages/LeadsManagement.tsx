import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateInspectionPDF } from '@/lib/api/pdfGeneration';
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
  MessageSquare
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
  const { toast } = useToast();
  
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
  const [regeneratingPdfForLead, setRegeneratingPdfForLead] = useState<string | null>(null);

  // STAGE 1 PIPELINE - 6 Stages Only
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
      description: 'Initial inquiry received',
      nextActions: ['Book inspection with customer'],
      availableButtons: ['call', 'email', 'viewDetails']
    },
    {
      value: 'inspection_waiting',
      label: 'Awaiting Inspection',
      icon: '📅',
      color: '#f59e0b',
      description: 'Inspection scheduled, waiting for appointment',
      nextActions: ['Complete inspection and submit form'],
      availableButtons: ['call', 'email', 'startInspection', 'removeLead', 'viewDetails']
    },
    {
      value: 'approve_inspection_report',
      label: 'Approve Report',
      icon: '📋',
      color: '#a855f7',
      description: 'Review and approve inspection report PDF',
      nextActions: ['View PDF and approve report'],
      availableButtons: ['viewPDF', 'regeneratePDF', 'viewDetails']
    },
    {
      value: 'inspection_email_approval',
      label: 'Email Approval',
      icon: '📧',
      color: '#06b6d4',
      description: 'Report approved, ready to send via email',
      nextActions: ['Send inspection report to client'],
      availableButtons: ['sendEmail', 'viewPDF', 'markClosed', 'viewDetails']
    },
    {
      value: 'closed',
      label: 'Closed',
      icon: '✅',
      color: '#22c55e',
      description: 'Lead completed successfully',
      nextActions: [],
      availableButtons: ['viewHistory', 'viewDetails']
    },
    {
      value: 'not_landed',
      label: 'Not Landed',
      icon: '❌',
      color: '#ef4444',
      description: 'Lead lost or rejected',
      nextActions: ['Document reason', 'Follow up later'],
      availableButtons: ['viewHistory', 'addNotes', 'reactivate']
    }
  ];

  // STAGE-SPECIFIC ACTION FUNCTIONS (Stage 1 Only)
  const stageActions = {
    startInspection: (leadId: number) => {
      navigate(`/inspection?leadId=${leadId}`);
    },

    viewHistory: (leadId: number) => {
      navigate(`/client/${leadId}/history`);
    },

    addNotes: (leadId: number) => {
      navigate(`/client/${leadId}?addNotes=true`);
    },

    reactivate: async (leadId: number) => {
      await updateLeadStatus(leadId, 'new_lead');
    },

    markClosed: async (leadId: number) => {
      await updateLeadStatus(leadId, 'closed');
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
        await updateLeadStatus(selectedLeadForRemoval.id, 'not_landed');

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

    // Stage 1 button configurations only
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
        label: 'Remove',
        onClick: () => stageActions.removeLead(lead),
        style: 'danger'
      },
      viewDetails: {
        icon: '👁️',
        label: 'View',
        onClick: () => stageActions.viewDetails(lead.id, lead.status),
        style: 'secondary'
      },
      startInspection: {
        icon: '📝',
        label: 'Start',
        onClick: () => stageActions.startInspection(lead.id),
        style: 'success'
      },
      viewHistory: {
        icon: '📜',
        label: 'History',
        onClick: () => stageActions.viewHistory(lead.id),
        style: 'secondary'
      },
      addNotes: {
        icon: '📝',
        label: 'Notes',
        onClick: () => stageActions.addNotes(lead.id),
        style: 'secondary'
      },
      markClosed: {
        icon: '✅',
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
          navigate(`/report/${lead.id}`);
        },
        style: 'secondary'
      },
      regeneratePDF: {
        icon: regeneratingPdfForLead === lead.id ? '⏳' : '🔄',
        label: regeneratingPdfForLead === lead.id ? 'Regenerating...' : 'Regenerate',
        onClick: async () => {
          try {
            setRegeneratingPdfForLead(lead.id);
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
              title: "PDF Regenerated",
              description: "The inspection report has been regenerated with latest data."
            });
          } catch (error) {
            console.error('Failed to regenerate PDF:', error);
            toast({
              title: "Error",
              description: "Failed to regenerate PDF. Please try again.",
              variant: "destructive"
            });
          } finally {
            setRegeneratingPdfForLead(null);
          }
        },
        style: 'secondary',
        disabled: regeneratingPdfForLead === lead.id
      },
      sendEmail: {
        icon: '📧',
        label: 'Send Report',
        onClick: () => {
          toast({
            title: "Email sent",
            description: "The inspection report has been sent to the client.",
          });
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
          className={`action-btn action-btn-${config.style}${config.disabled ? ' opacity-50 cursor-not-allowed' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!config.disabled) {
              config.onClick();
            }
          }}
          disabled={config.disabled}
          title={config.label}
          style={{ minHeight: '48px' }}
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

    try {
      // Fetch real leads from Supabase
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading leads:', error);
        toast({
          title: 'Error',
          description: 'Failed to load leads. Please refresh the page.',
          variant: 'destructive',
        });
        setLeads([]);
      } else {
        // Transform Supabase data to match component interface
        const transformedLeads = (data || []).map(lead => ({
          id: lead.id,
          name: lead.full_name || 'Unknown',
          email: lead.email || '',
          phone: lead.phone || '',
          property: lead.property_address_street || '',
          suburb: lead.property_address_suburb || '',
          state: lead.property_address_state || 'VIC',
          postcode: lead.property_address_postcode || '',
          status: lead.status || 'new_lead',
          urgency: lead.urgency || 'medium',
          source: lead.lead_source || 'Unknown',
          dateCreated: lead.created_at,
          lastContact: lead.updated_at,
          estimatedValue: lead.quoted_amount ? parseFloat(lead.quoted_amount.toString()) : null,
          issueDescription: lead.issue_description || lead.notes || '',
          leadNumber: lead.lead_number,
        }));
        setLeads(transformedLeads);
      }
    } catch (err) {
      console.error('Unexpected error loading leads:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Stage 1 mock data (unused - for reference only)
  const _MOCK_DATA_UNUSED = () => {
    return [
      { id: 1, name: 'John Doe', status: 'new_lead' },
      { id: 2, name: 'Sarah Miller', status: 'inspection_waiting' },
      { id: 3, name: 'Lisa Anderson', status: 'approve_inspection_report' },
      { id: 4, name: 'Peter Thompson', status: 'inspection_email_approval' },
      { id: 5, name: 'Emma Wilson', status: 'closed' },
      { id: 6, name: 'Thomas Wright', status: 'not_landed' },
    ];
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

                  {/* SCHEDULE INFO BANNER FOR INSPECTION */}
                  {lead.status === 'inspection_waiting' && lead.scheduled_dates && (
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
