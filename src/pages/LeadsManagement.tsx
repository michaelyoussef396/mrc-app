import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateInspectionPDF } from '@/lib/api/pdfGeneration';
import { ChevronDown, Search, X, LayoutGrid, List } from 'lucide-react';

// Components
import AdminSidebar from '@/components/admin/AdminSidebar';
import PipelineTabs from '@/components/leads/PipelineTabs';
import LeadCard, { type TransformedLead } from '@/components/leads/LeadCard';
import CreateLeadCard from '@/components/leads/CreateLeadCard';
import CreateLeadModal from '@/components/admin/CreateLeadModal';

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
  { value: 'approve_inspection_report', label: 'Approve Report', dotColor: 'bg-slate-700' },
  { value: 'inspection_email_approval', label: 'Email Approval', dotColor: 'bg-purple-500' },
  { value: 'closed', label: 'Closed', dotColor: 'bg-blue-500' },
  { value: 'not_landed', label: 'Not Landed', dotColor: 'bg-red-500' },
];

// ============================================================================
// COMPONENT
// ============================================================================

const LeadsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leads, setLeads] = useState<TransformedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRemoveReasonModal, setShowRemoveReasonModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [selectedLeadForRemoval, setSelectedLeadForRemoval] = useState<TransformedLead | null>(null);
  const [regeneratingPdfForLead, setRegeneratingPdfForLead] = useState<string | null>(null);

  // ============================================================================
  // STAGE-SPECIFIC ACTION FUNCTIONS
  // ============================================================================

  const stageActions = {
    startInspection: (leadId: number | string) => {
      navigate(`/inspection?leadId=${leadId}`);
    },

    viewHistory: (leadId: number | string) => {
      navigate(`/client/${leadId}/history`);
    },

    addNotes: (leadId: number | string) => {
      navigate(`/client/${leadId}?addNotes=true`);
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

    viewDetails: (leadId: number | string, status?: string) => {
      // If lead is NEW, go to simplified new lead view
      if (status === 'new_lead') {
        navigate(`/lead/new/${leadId}`);
      } else {
        // Otherwise, go to full client detail page
        navigate(`/client/${leadId}`);
      }
    },

    viewPDF: (leadId: number | string) => {
      navigate(`/report/${leadId}`);
    },

    regeneratePDF: async (lead: TransformedLead) => {
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
    setLeads(prev =>
      prev.map(lead => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadLeads();
  }, [statusFilter, sortBy]);

  const loadLeads = async () => {
    setLoading(true);

    try {
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
        const transformedLeads: TransformedLead[] = (data || []).map(lead => ({
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
    // TODO: Implement email composer with MRC template
    // This will be implemented in Phase 2
  };

  const handleArchive = (id: string | number) => {
    // TODO: Implement archive lead functionality
    // This will move the lead to an archived state
  };

  const handleReactivate = (id: string | number) => {
    stageActions.reactivate(id);
  };

  const handleViewHistory = (id: string | number) => {
    // TODO: Implement history view
    // This will show the activity timeline for the lead
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
          <div className="flex items-center px-6 py-4 justify-between">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ color: '#1d1d1f' }}>
                menu
              </span>
            </button>

            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div
                className="flex w-10 h-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: '#007AFF' }}
              >
                <span className="material-symbols-outlined">inbox</span>
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
              <span className="material-symbols-outlined text-lg">add</span>
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
                className={`h-11 w-11 flex items-center justify-center transition-colors
                  ${viewMode === 'cards' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="Card view"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`h-11 w-11 flex items-center justify-center transition-colors border-l border-slate-200
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
              <span className="material-symbols-outlined text-3xl text-slate-400">
                {searchQuery || statusFilter !== 'all' ? 'search_off' : 'inbox'}
              </span>
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
                <span className="material-symbols-outlined text-lg">add</span>
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
              />
            ))}

            {/* Create New Lead Card */}
            <CreateLeadCard onClick={() => setShowCreateModal(true)} />
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
            </p>
          </div>
        )}
          </div>
        </div>
      </main>

      {/* Create Lead Modal */}
      <CreateLeadModal
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
                  <span className="material-symbols-outlined text-amber-600">warning</span>
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
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Lead info */}
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="font-medium text-slate-900">{selectedLeadForRemoval.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-base">location_on</span>
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
                <span className="material-symbols-outlined text-lg shrink-0">info</span>
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
                <span className="material-symbols-outlined text-lg">delete</span>
                Remove Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsManagement;
