import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

const ClientDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    assignedTo: '',
    notes: ''
  })

  useEffect(() => {
    loadLeadDetails()
  }, [id])

  const loadLeadDetails = async () => {
    setLoading(true)
    // TODO: Load from Supabase
    
    // Mock data
    const mockLead = {
      id: parseInt(id || '1'),
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '0412 345 678',
      alternatePhone: '03 9123 4567',
      property: '123 Smith Street',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      propertyType: 'Residential',
      status: 'contacted',
      urgency: 'high',
      source: 'Google Ads',
      dateCreated: '2025-01-29T10:30:00',
      lastContact: '2025-01-29T14:20:00',
      issueDescription: 'Customer reports visible black mould growth in bathroom around shower area and on bedroom ceiling near window. Musty smell throughout the property. Recent water damage from roof leak (now fixed). Customer is concerned about health impacts and wants urgent inspection.',
      preferredContactTime: 'Weekday afternoons',
      accessNotes: 'Property is vacant - key available from real estate agent',
      estimatedValue: 2400,
      callHistory: [
        {
          date: '2025-01-29T14:20:00',
          type: 'outbound',
          duration: '5 min',
          notes: 'Left voicemail - requested callback to schedule inspection',
          technicianName: 'Tech 1'
        },
        {
          date: '2025-01-29T10:30:00',
          type: 'inbound',
          duration: '3 min',
          notes: 'Initial inquiry - customer described mould issue',
          technicianName: 'Tech 2'
        }
      ],
      attachments: [
        {
          name: 'bathroom-mould-photo.jpg',
          type: 'image',
          uploadedAt: '2025-01-29T10:32:00'
        }
      ]
    }
    
    setLead(mockLead)
    setLoading(false)
  }

  const handleCall = () => {
    window.location.href = `tel:${lead.phone}`
  }

  const handleEmail = () => {
    window.location.href = `mailto:${lead.email}`
  }

  const handleScheduleInspection = async () => {
    // TODO: Save to Supabase and update lead status
    console.log('Scheduling inspection:', scheduleData)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Navigate to inspection form
    navigate(`/inspection?leadId=${lead.id}`)
  }

  const handleAddNotes = async () => {
    // TODO: Save notes to Supabase
    console.log('Adding call notes:', callNotes)
    
    // Add to call history
    const newCall = {
      date: new Date().toISOString(),
      type: 'outbound',
      duration: 'Just now',
      notes: callNotes,
      technicianName: 'Current User'
    }
    
    setLead((prev: any) => ({
      ...prev,
      callHistory: [newCall, ...prev.callHistory]
    }))
    
    setCallNotes('')
    setShowNotesModal(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'blue',
      'contacted': 'purple',
      'quoted': 'yellow',
      'inspection-scheduled': 'green'
    }
    return colors[status] || 'gray'
  }

  if (loading) {
    return (
      <div className="client-detail-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading lead details...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="client-detail-page">
        <div className="error-state">
          <h2>Lead not found</h2>
          <button onClick={() => navigate('/inspection/select-lead')}>
            Back to Leads
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="client-detail-page">
      {/* Background */}
      <div className="client-detail-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Navigation */}
      <nav className="client-detail-nav">
        <div className="nav-container">
          <button 
            className="back-btn" 
            onClick={() => navigate('/inspection/select-lead')}
          >
            <span className="back-arrow">←</span>
            <span>Back to Leads</span>
          </button>
          
          <div className="nav-actions">
            <button className="btn-icon" onClick={handleCall} title="Call">
              📞
            </button>
            <button className="btn-icon" onClick={handleEmail} title="Email">
              📧
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="client-detail-main">
        <div className="client-detail-container">
          {/* Header Card */}
          <div className="client-header-card">
            <div className="client-header-top">
              <div className="client-avatar-section">
                <div className="client-avatar-large">
                  {lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </div>
                <div className="client-header-info">
                  <h1 className="client-name">{lead.name}</h1>
                  <div className="client-meta">
                    <span className={`status-badge ${getStatusColor(lead.status)}`}>
                      {lead.status.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                    {lead.urgency === 'high' && (
                      <span className="urgency-badge high">
                        🔴 High Priority
                      </span>
                    )}
                    <span className="source-tag">
                      Source: {lead.source}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-action-buttons">
                <button 
                  className="btn-primary btn-call"
                  onClick={handleCall}
                >
                  <span>📞</span>
                  <span>Call Now</span>
                </button>
                <button 
                  className="btn-success"
                  onClick={() => setShowScheduleModal(true)}
                >
                  <span>📅</span>
                  <span>Schedule Inspection</span>
                </button>
              </div>
            </div>

            {/* Contact Info Strip */}
            <div className="contact-info-strip">
              <div className="contact-item">
                <span className="contact-icon">📱</span>
                <div className="contact-details">
                  <span className="contact-label">Mobile</span>
                  <a href={`tel:${lead.phone}`} className="contact-value">
                    {lead.phone}
                  </a>
                </div>
              </div>

              {lead.alternatePhone && (
                <div className="contact-item">
                  <span className="contact-icon">☎️</span>
                  <div className="contact-details">
                    <span className="contact-label">Alternate</span>
                    <a href={`tel:${lead.alternatePhone}`} className="contact-value">
                      {lead.alternatePhone}
                    </a>
                  </div>
                </div>
              )}

              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div className="contact-details">
                  <span className="contact-label">Email</span>
                  <a href={`mailto:${lead.email}`} className="contact-value">
                    {lead.email}
                  </a>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">🕐</span>
                <div className="contact-details">
                  <span className="contact-label">Best Time</span>
                  <span className="contact-value">{lead.preferredContactTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="detail-grid">
            {/* Left Column */}
            <div className="detail-left-col">
              {/* Property Information */}
              <div className="detail-section">
                <div className="section-header">
                  <div className="section-icon">🏠</div>
                  <h2 className="section-title">Property Information</h2>
                </div>

                <div className="info-rows">
                  <div className="info-row">
                    <span className="info-label">Address</span>
                    <span className="info-value">{lead.property}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Suburb</span>
                    <span className="info-value">{lead.suburb}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">State & Postcode</span>
                    <span className="info-value">{lead.state} {lead.postcode}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Property Type</span>
                    <span className="info-value">
                      {lead.propertyType === 'Residential' ? '🏠' : '🏢'} {lead.propertyType}
                    </span>
                  </div>
                  {lead.accessNotes && (
                    <div className="info-row full-width">
                      <span className="info-label">Access Notes</span>
                      <span className="info-value access-notes">{lead.accessNotes}</span>
                    </div>
                  )}
                </div>

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.property + ' ' + lead.suburb + ' ' + lead.state)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary btn-map"
                >
                  <span>🗺️</span>
                  <span>View on Google Maps</span>
                </a>
              </div>

              {/* Issue Description */}
              <div className="detail-section">
                <div className="section-header">
                  <div className="section-icon">💬</div>
                  <h2 className="section-title">Issue Description</h2>
                </div>

                <div className="issue-content">
                  <p className="issue-text">{lead.issueDescription}</p>
                </div>

                {lead.attachments && lead.attachments.length > 0 && (
                  <div className="attachments-section">
                    <p className="attachments-label">Attachments:</p>
                    <div className="attachments-list">
                      {lead.attachments.map((file: any, index: number) => (
                        <div key={index} className="attachment-item">
                          <span className="attachment-icon">
                            {file.type === 'image' ? '🖼️' : '📄'}
                          </span>
                          <span className="attachment-name">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lead Timeline */}
              <div className="detail-section">
                <div className="section-header">
                  <div className="section-icon">📋</div>
                  <h2 className="section-title">Lead Timeline</h2>
                </div>

                <div className="timeline-list">
                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <p className="timeline-title">Lead Created</p>
                      <p className="timeline-date">{formatDate(lead.dateCreated)}</p>
                    </div>
                  </div>

                  {lead.lastContact && (
                    <div className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <p className="timeline-title">Last Contact</p>
                        <p className="timeline-date">{formatDate(lead.lastContact)}</p>
                      </div>
                    </div>
                  )}

                  <div className="timeline-item">
                    <div className="timeline-dot current"></div>
                    <div className="timeline-content">
                      <p className="timeline-title">⏳ Awaiting Booking</p>
                      <p className="timeline-date">Contact to schedule inspection</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="detail-right-col">
              {/* Call Notes & History */}
              <div className="detail-section sticky-section">
                <div className="section-header">
                  <div className="section-icon">📝</div>
                  <h2 className="section-title">Call History & Notes</h2>
                  <button 
                    className="btn-add-notes"
                    onClick={() => setShowNotesModal(true)}
                  >
                    + Add Notes
                  </button>
                </div>

                {lead.callHistory && lead.callHistory.length > 0 ? (
                  <div className="call-history-list">
                    {lead.callHistory.map((call: any, index: number) => (
                      <div key={index} className="call-history-item">
                        <div className="call-header">
                          <span className={`call-type ${call.type}`}>
                            {call.type === 'inbound' ? '📞 Inbound' : '📱 Outbound'}
                          </span>
                          <span className="call-duration">{call.duration}</span>
                        </div>
                        <p className="call-date">{formatDate(call.date)}</p>
                        <p className="call-notes">{call.notes}</p>
                        <p className="call-tech">— {call.technicianName}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-notes">
                    <p>No call history yet</p>
                    <button 
                      className="btn-secondary"
                      onClick={() => setShowNotesModal(true)}
                    >
                      Add First Note
                    </button>
                  </div>
                )}
              </div>

              {/* Estimated Value */}
              <div className="detail-section value-section">
                <div className="section-header">
                  <div className="section-icon">💰</div>
                  <h2 className="section-title">Estimated Value</h2>
                </div>
                <div className="value-display">
                  <span className="value-amount">
                    ${lead.estimatedValue?.toLocaleString() || 'TBD'}
                  </span>
                  <span className="value-label">Potential Job Value</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Schedule Inspection Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Schedule Inspection</h2>
              <button 
                className="modal-close"
                onClick={() => setShowScheduleModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Inspection Date *</label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time *</label>
                <select
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                  className="form-select"
                >
                  <option value="">Select time...</option>
                  <option value="07:00">7:00 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign To</label>
                <select
                  value={scheduleData.assignedTo}
                  onChange={(e) => setScheduleData({...scheduleData, assignedTo: e.target.value})}
                  className="form-select"
                >
                  <option value="">Select technician...</option>
                  <option value="tech1">Technician 1</option>
                  <option value="tech2">Technician 2</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Booking Notes</label>
                <textarea
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({...scheduleData, notes: e.target.value})}
                  placeholder="Add any notes about the booking..."
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleScheduleInspection}
                disabled={!scheduleData.date || !scheduleData.time}
              >
                <span>✓</span>
                <span>Confirm Booking</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Notes Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Call Notes</h2>
              <button 
                className="modal-close"
                onClick={() => setShowNotesModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Notes from call with {lead.name}</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="What did you discuss? Did they confirm availability? Any special requirements?"
                  className="form-textarea"
                  rows={6}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowNotesModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleAddNotes}
                disabled={!callNotes.trim()}
              >
                <span>✓</span>
                <span>Save Notes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDetail
