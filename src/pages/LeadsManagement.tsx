import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const LeadsManagement = () => {
  const navigate = useNavigate();
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const statusOptions = [
    { value: 'all', label: 'All Leads', icon: '📋', color: '#6b7280' },
    { value: 'new', label: 'New', icon: '✨', color: '#3b82f6' },
    { value: 'contacted', label: 'Contacted', icon: '📞', color: '#8b5cf6' },
    { value: 'quoted', label: 'Quoted', icon: '💰', color: '#f59e0b' },
    { value: 'inspection-scheduled', label: 'Inspection Scheduled', icon: '📅', color: '#10b981' },
    { value: 'inspection-complete', label: 'Inspection Complete', icon: '✓', color: '#059669' },
    { value: 'job-booked', label: 'Job Booked', icon: '🔨', color: '#0ea5e9' },
    { value: 'completed', label: 'Completed', icon: '🎉', color: '#22c55e' },
    { value: 'lost', label: 'Lost', icon: '✕', color: '#ef4444' }
  ];

  useEffect(() => {
    loadLeads();
  }, [statusFilter, urgencyFilter, sortBy]);

  const loadLeads = async () => {
    setLoading(true);
    
    // Mock data for now - replace with Supabase query later
    const mockLeads = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@email.com',
        phone: '0412 345 678',
        property: '123 Smith Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        status: 'new',
        urgency: 'high',
        source: 'Google Ads',
        dateCreated: '2025-01-29T10:30:00',
        lastContact: null,
        estimatedValue: 2400,
        issueDescription: 'Visible black mould in bathroom and bedroom ceiling',
        nextAction: 'Contact to schedule inspection'
      },
      {
        id: 2,
        name: 'Sarah Miller',
        email: 'sarah@email.com',
        phone: '0423 456 789',
        property: '45 Queen Street',
        suburb: 'Richmond',
        state: 'VIC',
        postcode: '3121',
        status: 'contacted',
        urgency: 'medium',
        source: 'Referral',
        dateCreated: '2025-01-28T14:15:00',
        lastContact: '2025-01-28T16:30:00',
        estimatedValue: 3200,
        issueDescription: 'Roof leak causing mould growth in multiple rooms',
        nextAction: 'Follow up on inspection booking'
      },
      {
        id: 3,
        name: 'Emily Watson',
        email: 'emily@email.com',
        phone: '0445 678 901',
        property: '12 Chapel Street',
        suburb: 'Windsor',
        state: 'VIC',
        postcode: '3181',
        status: 'inspection-scheduled',
        urgency: 'high',
        source: 'Website',
        dateCreated: '2025-01-27T09:45:00',
        lastContact: '2025-01-28T11:00:00',
        scheduledDate: '2025-01-29T14:00:00',
        estimatedValue: 4500,
        issueDescription: 'Black mould in bathroom - health concerns',
        nextAction: 'Inspection tomorrow at 2pm'
      },
      {
        id: 4,
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
        issueDescription: 'Musty smell in basement, possible mould',
        nextAction: 'Waiting for client approval on quote'
      },
      {
        id: 5,
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
        issueDescription: 'Commercial office - multiple rooms with mould',
        nextAction: 'Send quote for remediation work'
      },
      {
        id: 6,
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
        dateCreated: '2025-01-24T13:45:00',
        lastContact: '2025-01-26T09:00:00',
        scheduledDate: '2025-01-31T09:00:00',
        estimatedValue: 6700,
        issueDescription: 'Extensive mould remediation needed',
        nextAction: 'Job scheduled for Jan 31st'
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
                  title="Card View"
                >
                  ▦
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  ☰
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

                  {lead.nextAction && (
                    <div className="lead-next-action">
                      <span className="next-action-icon">→</span>
                      <span className="next-action-text">{lead.nextAction}</span>
                    </div>
                  )}

                  <div className="lead-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="action-btn"
                      onClick={() => window.location.href = `tel:${lead.phone}`}
                      title="Call"
                    >
                      📞
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => window.location.href = `mailto:${lead.email}`}
                      title="Email"
                    >
                      📧
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => navigate(`/client/${lead.id}`)}
                      title="View Details"
                    >
                      👁️
                    </button>
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
