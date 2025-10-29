import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

const NewLeadView = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadLeadData()
  }, [id])

  const loadLeadData = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      setLead(data)
    } catch (error) {
      console.error('Error loading lead:', error)
    }
    
    setLoading(false)
  }

  const handleScheduleInspection = async () => {
    if (!scheduleDate || !scheduleTime) {
      alert('Please select a date and time')
      return
    }

    try {
      // Update lead status to 'inspection_waiting'
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'inspection_waiting',
          inspection_scheduled_date: scheduleDate
        })
        .eq('id', id)
      
      if (error) throw error
      
      setShowScheduleModal(false)
      navigate('/leads')
    } catch (error) {
      console.error('Error scheduling inspection:', error)
      alert('Failed to schedule inspection')
    }
  }

  if (loading) {
    return (
      <div className="new-lead-view">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading lead details...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="new-lead-view">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <h3>Lead not found</h3>
          <button className="btn-primary" onClick={() => navigate('/leads')}>
            Back to Leads
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="new-lead-view">
      {/* Background */}
      <div className="new-lead-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Navigation */}
      <nav className="new-lead-nav">
        <div className="nav-container">
          <button className="back-btn" onClick={() => navigate('/leads')}>
            <span className="back-arrow">←</span>
            <span>Back to Leads</span>
          </button>
          
          <div className="nav-title">
            <span className="nav-icon">🌟</span>
            <span>New Lead</span>
          </div>

          <div className="nav-actions">
            <button 
              className="btn-icon-label"
              onClick={() => window.location.href = `tel:${lead.phone}`}
            >
              <span className="btn-icon">📞</span>
              <span className="btn-label">Call</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="new-lead-main">
        <div className="new-lead-container">
          {/* Status Banner */}
          <div className="status-banner">
            <span className="status-icon">🌟</span>
            <div className="status-info">
              <h3 className="status-title">New Lead - Initial Inquiry</h3>
              <p className="status-desc">
                This lead was submitted via website form. Review the information and schedule an inspection.
              </p>
            </div>
          </div>

          {/* Lead Information Card */}
          <div className="info-card">
            <div className="card-header">
              <h2 className="card-title">Lead Information</h2>
              <span className="source-badge">
                <span className="source-icon">🌐</span>
                <span>{lead.lead_source || 'Website Form'}</span>
              </span>
            </div>

            {/* Client Details */}
            <div className="info-section">
              <h3 className="section-title">Client Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name</span>
                  <span className="info-value">{lead.full_name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <a href={`tel:${lead.phone}`} className="info-value info-link">
                    📱 {lead.phone}
                  </a>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <a href={`mailto:${lead.email}`} className="info-value info-link">
                    📧 {lead.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="info-section">
              <h3 className="section-title">Property Information</h3>
              <div className="property-address">
                <span className="address-icon">📍</span>
                <div className="address-details">
                  <p className="address-line">{lead.property_address_street}</p>
                  <p className="address-line">
                    {lead.property_address_suburb} {lead.property_address_state} {lead.property_address_postcode}
                  </p>
                </div>
              </div>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  lead.property_address_street + ' ' + lead.property_address_suburb + ' ' + lead.property_address_state
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-map"
              >
                <span className="btn-icon">🗺️</span>
                <span className="btn-label">View on Google Maps</span>
              </a>
            </div>

            {/* Issue Description */}
            {lead.issue_description && (
              <div className="info-section">
                <h3 className="section-title">Issue Description</h3>
                <div className="issue-box">
                  <span className="issue-icon">💬</span>
                  <p className="issue-text">{lead.issue_description}</p>
                </div>
              </div>
            )}

            {/* Urgency & Timeline */}
            <div className="info-section">
              <h3 className="section-title">Urgency & Timeline</h3>
              <div className="info-grid">
                {lead.urgency && (
                  <div className="info-item">
                    <span className="info-label">Urgency Level</span>
                    <span className={`urgency-tag ${lead.urgency}`}>
                      {lead.urgency === 'high' && '🔴 High Priority'}
                      {lead.urgency === 'medium' && '🟡 Medium Priority'}
                      {lead.urgency === 'low' && '🟢 Low Priority'}
                    </span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Submitted</span>
                  <span className="info-value">
                    {new Date(lead.created_at).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="action-card">
            <div className="action-header">
              <div>
                <h3 className="action-title">Next Step</h3>
                <p className="action-desc">
                  Schedule an inspection to assess the mould issue and provide a detailed quote
                </p>
              </div>
              <span className="action-icon-large">📅</span>
            </div>
            
            <button 
              className="btn-primary btn-schedule"
              onClick={() => setShowScheduleModal(true)}
            >
              <span className="btn-icon">📅</span>
              <span className="btn-label">Schedule Inspection</span>
            </button>
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
              <div className="client-info-summary">
                <h4>Client: {lead.full_name}</h4>
                <p>📍 {lead.property_address_street}, {lead.property_address_suburb}</p>
                <p>📞 {lead.phone}</p>
              </div>

              <div className="form-group">
                <label className="form-label">Inspection Date *</label>
                <input
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time *</label>
                <select 
                  className="form-select"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
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
                <label className="form-label">Internal Notes (Optional)</label>
                <textarea
                  placeholder="Add any notes about the booking..."
                  className="form-textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
              >
                <span className="btn-icon">✓</span>
                <span className="btn-label">Confirm Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewLeadView
