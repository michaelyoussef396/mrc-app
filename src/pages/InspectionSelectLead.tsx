import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const InspectionSelectLead = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    // TODO: Load from Supabase - only show leads that need inspection
    const mockLeads = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@email.com',
        phone: '0412 345 678',
        property: '123 Smith Street, Melbourne VIC 3000',
        suburb: 'Melbourne',
        status: 'new',
        urgency: 'high',
        source: 'Google Ads',
        dateCreated: '2025-01-29T10:30:00',
        issueDescription: 'Mould in bathroom and bedroom ceiling'
      },
      {
        id: 2,
        name: 'Sarah Miller',
        email: 'sarah@email.com',
        phone: '0423 456 789',
        property: '45 Queen Street, Richmond VIC 3121',
        suburb: 'Richmond',
        status: 'contacted',
        urgency: 'medium',
        source: 'Facebook',
        dateCreated: '2025-01-28T14:15:00',
        issueDescription: 'Roof leak causing mould growth in living room'
      },
      {
        id: 3,
        name: 'Emily Watson',
        email: 'emily@email.com',
        phone: '0445 678 901',
        property: '12 Chapel Street, Windsor VIC 3181',
        suburb: 'Windsor',
        status: 'quoted',
        urgency: 'high',
        source: 'Referral',
        dateCreated: '2025-01-27T09:45:00',
        issueDescription: 'Black mould in bathroom - health concerns'
      },
      {
        id: 4,
        name: 'Michael Chen',
        email: 'michael@email.com',
        phone: '0456 789 012',
        property: '89 Brunswick Street, Fitzroy VIC 3065',
        suburb: 'Fitzroy',
        status: 'new',
        urgency: 'low',
        source: 'Website',
        dateCreated: '2025-01-26T16:20:00',
        issueDescription: 'Musty smell in basement, possible mould'
      }
    ];
    setLeads(mockLeads);
    setLoading(false);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.suburb.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      high: 'red',
      medium: 'yellow',
      low: 'green'
    };
    return colors[urgency] || 'gray';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const handleSelectLead = (leadId: number) => {
    navigate(`/inspection/new?leadId=${leadId}`);
  };

  return (
    <div className="select-lead-page">
      {/* Background */}
      <div className="select-lead-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Navigation */}
      <nav className="select-lead-nav">
        <div className="nav-container">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <span className="back-arrow">←</span>
            <span>Back</span>
          </button>
          
          <div className="nav-title">
            <span className="nav-icon">📝</span>
            <span>Select Lead for Inspection</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="select-lead-main">
        <div className="select-lead-container">
          {/* Header */}
          <div className="page-header">
            <div className="header-content">
              <h1 className="page-title">Choose a Lead</h1>
              <p className="page-subtitle">
                Select which lead you'd like to inspect
              </p>
            </div>
            
            <button 
              className="btn-secondary"
              onClick={() => navigate('/lead/new')}
            >
              <span>➕</span>
              <span>New Lead</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="filters-section">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, property, or suburb..."
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

            <div className="filter-pills">
              <button
                className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All Leads
              </button>
              <button
                className={`filter-pill ${statusFilter === 'new' ? 'active' : ''}`}
                onClick={() => setStatusFilter('new')}
              >
                New
              </button>
              <button
                className={`filter-pill ${statusFilter === 'contacted' ? 'active' : ''}`}
                onClick={() => setStatusFilter('contacted')}
              >
                Contacted
              </button>
              <button
                className={`filter-pill ${statusFilter === 'quoted' ? 'active' : ''}`}
                onClick={() => setStatusFilter('quoted')}
              >
                Quoted
              </button>
            </div>
          </div>

          {/* Leads Grid */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No leads found</h3>
              <p>Try adjusting your search or filters</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/lead/new')}
              >
                <span>➕</span>
                <span>Create New Lead</span>
              </button>
            </div>
          ) : (
            <div className="leads-grid">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="lead-card"
                  onClick={() => handleSelectLead(lead.id)}
                >
                  {/* Card Header */}
                  <div className="lead-card-header">
                    <div className="lead-avatar">
                      {lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="lead-header-info">
                      <h3 className="lead-name">{lead.name}</h3>
                      <p className="lead-date">{formatDate(lead.dateCreated)}</p>
                    </div>
                    <div className={`urgency-indicator ${getUrgencyColor(lead.urgency)}`}>
                      {lead.urgency === 'high' && '🔴'}
                      {lead.urgency === 'medium' && '🟡'}
                      {lead.urgency === 'low' && '🟢'}
                    </div>
                  </div>

                  {/* Property Info */}
                  <div className="lead-property">
                    <div className="property-icon">📍</div>
                    <div className="property-details">
                      <p className="property-address">{lead.property}</p>
                      <p className="property-suburb">{lead.suburb}</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="lead-contacts">
                    <a 
                      href={`tel:${lead.phone}`} 
                      className="contact-chip"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>📱</span>
                      <span>{lead.phone}</span>
                    </a>
                    <a 
                      href={`mailto:${lead.email}`} 
                      className="contact-chip"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>📧</span>
                      <span>{lead.email}</span>
                    </a>
                  </div>

                  {/* Issue Description */}
                  <div className="lead-issue">
                    <p className="issue-label">Issue:</p>
                    <p className="issue-text">{lead.issueDescription}</p>
                  </div>

                  {/* Card Footer */}
                  <div className="lead-card-footer">
                    <div className="lead-badges">
                      <span className="source-badge">{lead.source}</span>
                      <span className={`status-badge ${lead.status}`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </div>
                    <div className="select-arrow">→</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Count */}
          {!loading && filteredLeads.length > 0 && (
            <div className="results-footer">
              <p className="results-count">
                Showing <strong>{filteredLeads.length}</strong> {filteredLeads.length === 1 ? 'lead' : 'leads'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InspectionSelectLead;
