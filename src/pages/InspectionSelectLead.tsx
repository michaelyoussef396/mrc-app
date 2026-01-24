import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const InspectionSelectLead = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ready'); // 'ready' or 'booking'
  const [leads, setLeads] = useState({
    needBooking: [] as any[],
    readyToInspect: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    // TODO: Load from Supabase
    
    // Mock data - separated by workflow status
    const mockData = {
      // Leads that need booking (new_lead - no inspection scheduled)
      needBooking: [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@email.com',
          phone: '0412 345 678',
          property: '123 Smith Street, Melbourne VIC 3000',
          suburb: 'Melbourne',
          status: 'new',
          urgency: 'high',
          dateCreated: '2025-01-29T10:30:00',
          issueDescription: 'Mould in bathroom and bedroom ceiling',
          lastContact: null
        },
        {
          id: 2,
          name: 'Sarah Miller',
          email: 'sarah@email.com',
          phone: '0423 456 789',
          property: '45 Queen Street, Richmond VIC 3121',
          suburb: 'Richmond',
          status: 'new_lead',
          urgency: 'medium',
          dateCreated: '2025-01-28T14:15:00',
          issueDescription: 'Roof leak causing mould growth',
          lastContact: '2025-01-28T16:30:00'
        },
        {
          id: 5,
          name: 'David Brown',
          email: 'david@email.com',
          phone: '0467 890 123',
          property: '56 Bourke Street, Melbourne CBD VIC 3000',
          suburb: 'Melbourne CBD',
          status: 'quoted',
          urgency: 'high',
          dateCreated: '2025-01-27T11:20:00',
          issueDescription: 'Commercial office - multiple rooms with mould',
          lastContact: '2025-01-28T09:15:00'
        }
      ],
      
      // Leads ready for inspection (inspection scheduled/booked)
      readyToInspect: [
        {
          id: 3,
          name: 'Emily Watson',
          email: 'emily@email.com',
          phone: '0445 678 901',
          property: '12 Chapel Street, Windsor VIC 3181',
          suburb: 'Windsor',
          status: 'inspection-scheduled',
          urgency: 'high',
          scheduledDate: '2025-01-29T14:00:00',
          dateCreated: '2025-01-27T09:45:00',
          issueDescription: 'Black mould in bathroom - health concerns',
          assignedTo: 'Tech 1'
        },
        {
          id: 4,
          name: 'Michael Chen',
          email: 'michael@email.com',
          phone: '0456 789 012',
          property: '89 Brunswick Street, Fitzroy VIC 3065',
          suburb: 'Fitzroy',
          status: 'inspection-scheduled',
          urgency: 'medium',
          scheduledDate: '2025-01-30T10:00:00',
          dateCreated: '2025-01-26T16:20:00',
          issueDescription: 'Musty smell in basement, possible mould',
          assignedTo: 'Tech 2'
        },
        {
          id: 6,
          name: 'Jessica Taylor',
          email: 'jessica@email.com',
          phone: '0478 901 234',
          property: '34 Lygon Street, Carlton VIC 3053',
          suburb: 'Carlton',
          status: 'inspection-scheduled',
          urgency: 'low',
          scheduledDate: '2025-01-29T16:30:00',
          dateCreated: '2025-01-25T13:45:00',
          issueDescription: 'Water damage and potential mould in laundry',
          assignedTo: 'Tech 1'
        }
      ]
    };
    
    setLeads(mockData);
    setLoading(false);
  };

  const getCurrentLeads = () => {
    const leadsToShow = activeTab === 'ready' ? leads.readyToInspect : leads.needBooking;
    
    if (!searchQuery) return leadsToShow;
    
    return leadsToShow.filter(lead => 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.suburb.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleStartInspection = (leadId: number) => {
    navigate(`/inspection?leadId=${leadId}`);
  };

  const handleContactLead = (lead: any) => {
    // Open phone dialer
    window.location.href = `tel:${lead.phone}`;
  };

  const filteredLeads = getCurrentLeads();

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
            <span>Inspection Workflow</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="select-lead-main">
        <div className="select-lead-container">
          {/* Header with Tabs */}
          <div className="page-header">
            <div className="header-top">
              <div>
                <h1 className="page-title">Select Lead for Inspection</h1>
                <p className="page-subtitle">
                  {activeTab === 'ready' 
                    ? 'Leads scheduled and ready to inspect' 
                    : 'Leads that need booking confirmation'}
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

            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button
                className={`tab-btn ${activeTab === 'ready' ? 'active' : ''}`}
                onClick={() => setActiveTab('ready')}
              >
                <span className="tab-icon">✓</span>
                <div className="tab-content">
                  <span className="tab-label">Ready to Inspect</span>
                  <span className="tab-count">{leads.readyToInspect.length}</span>
                </div>
              </button>

              <button
                className={`tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
                onClick={() => setActiveTab('booking')}
              >
                <span className="tab-icon">📞</span>
                <div className="tab-content">
                  <span className="tab-label">Need Booking</span>
                  <span className="tab-count">{leads.needBooking.length}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-section">
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
          </div>

          {/* Info Banner */}
          {activeTab === 'ready' ? (
            <div className="info-banner ready">
              <span className="banner-icon">✓</span>
              <div className="banner-content">
                <p className="banner-title">Ready to Start</p>
                <p className="banner-text">
                  These leads have confirmed inspection times. Click to begin the inspection form.
                </p>
              </div>
            </div>
          ) : (
            <div className="info-banner booking">
              <span className="banner-icon">📞</span>
              <div className="banner-content">
                <p className="banner-title">Booking Required</p>
                <p className="banner-text">
                  Contact these leads to schedule their inspection appointment.
                </p>
              </div>
            </div>
          )}

          {/* Leads List */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {activeTab === 'ready' ? '✓' : '📞'}
              </div>
              <h3>
                {searchQuery 
                  ? 'No leads found' 
                  : activeTab === 'ready'
                    ? 'No inspections scheduled'
                    : 'No leads need booking'}
              </h3>
              <p>
                {searchQuery
                  ? 'Try adjusting your search'
                  : activeTab === 'ready'
                    ? 'Schedule inspections from the "Need Booking" tab'
                    : 'All leads have been scheduled or completed'}
              </p>
            </div>
          ) : (
            <div className="leads-list">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className={`lead-item ${activeTab}`}
                >
                  {/* Lead Info */}
                  <div className="lead-info-section">
                    <div className="lead-main-info">
                      <div className="lead-avatar-wrapper">
                        <div className="lead-avatar">
                          {lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        {lead.urgency === 'high' && (
                          <div className="urgency-badge high">
                            <span>🔴</span>
                          </div>
                        )}
                      </div>

                      <div className="lead-details">
                        <h3 className="lead-name">{lead.name}</h3>
                        
                        <div className="lead-property-line">
                          <span className="property-icon">📍</span>
                          <span className="property-text">{lead.property}</span>
                        </div>

                        <div className="lead-meta-row">
                          <div className="meta-item">
                            <span className="meta-icon">📧</span>
                            <a href={`mailto:${lead.email}`} className="meta-link" onClick={(e) => e.stopPropagation()}>
                              {lead.email}
                            </a>
                          </div>
                          <div className="meta-item">
                            <span className="meta-icon">📱</span>
                            <a href={`tel:${lead.phone}`} className="meta-link" onClick={(e) => e.stopPropagation()}>
                              {lead.phone}
                            </a>
                          </div>
                        </div>

                        {activeTab === 'ready' && lead.scheduledDate && (
                          <div className="scheduled-time">
                            <span className="time-icon">🕐</span>
                            <span className="time-text">
                              Scheduled: <strong>{formatDate(lead.scheduledDate)}</strong>
                            </span>
                          </div>
                        )}

                        <div className="issue-preview">
                          <span className="issue-icon">💬</span>
                          <p className="issue-text">{lead.issueDescription}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lead-actions">
                    {activeTab === 'ready' ? (
                      <button 
                        className="btn-primary btn-start-inspection"
                        onClick={() => handleStartInspection(lead.id)}
                      >
                        <span>📝</span>
                        <span>Start Inspection</span>
                      </button>
                    ) : (
                      <>
                        <button 
                          className="btn-contact"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactLead(lead);
                          }}
                        >
                          <span>📞</span>
                          <span>Call to Book</span>
                        </button>
                        <button 
                          className="btn-secondary btn-view"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/client/${lead.id}`);
                          }}
                        >
                          <span>👁️</span>
                          <span>View Details</span>
                        </button>
                      </>
                    )}
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
