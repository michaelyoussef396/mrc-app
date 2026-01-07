import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Clock,
  FileText, AlertTriangle, Sparkles, Globe, CheckCircle,
  X, User, Home, ChevronRight
} from 'lucide-react'

const NewLeadView = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')

  // Fetch lead data from Supabase using React Query
  const { data: lead, isLoading: loading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      if (!id) throw new Error('Lead ID is required');

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  })

  // Pre-populate modal with existing data when it opens
  useEffect(() => {
    if (lead && showScheduleModal) {
      if (lead.inspection_scheduled_date) {
        setScheduleDate(lead.inspection_scheduled_date)
      }
      if (lead.scheduled_time) {
        setScheduleTime(lead.scheduled_time)
      }
      if (lead.notes) {
        setNotes(lead.notes)
      }
    }
  }, [lead, showScheduleModal])

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
          inspection_scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          notes: notes
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
            <ArrowLeft size={20} strokeWidth={2} />
            <span>Back to Leads</span>
          </button>
          
          <div className="nav-title">
            <Sparkles size={20} strokeWidth={2} className="nav-icon" />
            <span>New Lead</span>
          </div>

          <div className="nav-actions">
            <button 
              className="btn-icon-label"
              onClick={() => window.location.href = `tel:${lead.phone}`}
            >
              <Phone size={18} strokeWidth={2} />
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
            <div className="status-icon-wrapper">
              <div className="status-icon">
                <Sparkles size={32} strokeWidth={2} />
              </div>
            </div>
            <div className="status-info">
              <div className="status-header">
                <h3 className="status-title">New Lead - Initial Inquiry</h3>
                <span className="status-badge">Active</span>
              </div>
              <p className="status-desc">
                This lead was submitted via website form. Review the information and schedule an inspection.
              </p>
              <div className="status-meta">
                <div className="meta-item">
                  <Clock size={14} strokeWidth={2} />
                  <span>Received {new Date(lead.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="meta-item">
                  <Globe size={14} strokeWidth={2} />
                  <span>{lead.lead_source || 'Website Form'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Information Card */}
          <div className="info-card">
            <div className="card-header">
              <h2 className="card-title">
                <User size={24} strokeWidth={2} />
                Lead Information
              </h2>
              <span className="source-badge">
                <Globe size={16} strokeWidth={2} />
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
                    <Phone size={16} strokeWidth={2} />
                    {lead.phone}
                  </a>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <a href={`mailto:${lead.email}`} className="info-value info-link">
                    <Mail size={16} strokeWidth={2} />
                    {lead.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="info-section">
              <h3 className="section-title">
                <Home size={18} strokeWidth={2} />
                Property Information
              </h3>
              <div className="property-address">
                <div className="address-icon">
                  <MapPin size={24} strokeWidth={2} />
                </div>
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
                <MapPin size={18} strokeWidth={2} />
                <span className="btn-label">View on Google Maps</span>
              </a>
            </div>

            {/* Issue Description */}
            {lead.issue_description && (
              <div className="info-section">
                <h3 className="section-title">
                  <FileText size={18} strokeWidth={2} />
                  Issue Description
                </h3>
                <div className="issue-box">
                  <div className="issue-icon">
                    <AlertTriangle size={20} strokeWidth={2} />
                  </div>
                  <p className="issue-text">{lead.issue_description}</p>
                </div>
              </div>
            )}

            {/* Urgency & Timeline */}
            <div className="info-section">
              <h3 className="section-title">
                <Clock size={18} strokeWidth={2} />
                Urgency & Timeline
              </h3>
              <div className="info-grid">
                {lead.urgency && (
                  <div className="info-item">
                    <span className="info-label">Urgency Level</span>
                    <span className={`urgency-tag ${lead.urgency}`}>
                      <AlertTriangle size={16} strokeWidth={2} />
                      {lead.urgency === 'ASAP' && 'ASAP - As soon as possible'}
                      {lead.urgency === 'within_week' && 'Within a week'}
                      {lead.urgency === 'couple_weeks' && 'Next couple of weeks'}
                      {lead.urgency === 'within_month' && 'Within a month'}
                      {lead.urgency === 'couple_months' && 'Next couple of months'}
                      {lead.urgency === 'high' && 'High Priority'}
                      {lead.urgency === 'medium' && 'Medium Priority'}
                      {lead.urgency === 'low' && 'Low Priority'}
                      {lead.urgency === 'emergency' && 'Emergency - Same day'}
                    </span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Submitted</span>
                  <span className="info-value">
                    <Clock size={16} strokeWidth={2} />
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

            {/* Lead Details Section */}
            <div className="info-section">
              <h3 className="section-title">
                <FileText size={18} strokeWidth={2} />
                Lead Details
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Source</span>
                  <span className="info-value">
                    {lead.lead_source === 'other' && lead.lead_source_other
                      ? `Other: ${lead.lead_source_other}`
                      : lead.lead_source || 'Website'
                    }
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Date Created</span>
                  <span className="info-value">
                    {new Date(lead.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Lead ID</span>
                  <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    #{lead.id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Card - Completely Redesigned */}
          <div className="action-card-redesign">
            <div className="action-card-inner">
              {/* Decorative Background Elements */}
              <div className="action-bg-pattern"></div>
              <div className="action-gradient-orb"></div>
              
              {/* Main Content */}
              <div className="action-content-redesign">
                <div className="action-icon-badge">
                  <div className="icon-pulse"></div>
                  <Calendar size={28} strokeWidth={2} />
                </div>
                
                <div className="action-text-content">
                  <div className="action-label">Ready to proceed</div>
                  <h3 className="action-title-redesign">Schedule Your Inspection</h3>
                  <p className="action-description">
                    Book a convenient time for our expert team to assess the mould issue and provide a comprehensive quote
                  </p>
                  
                  <div className="action-features">
                    <div className="feature-item">
                      <div className="feature-icon">
                        <CheckCircle size={18} strokeWidth={2} />
                      </div>
                      <span>Professional assessment</span>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon">
                        <CheckCircle size={18} strokeWidth={2} />
                      </div>
                      <span>Detailed quote provided</span>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon">
                        <CheckCircle size={18} strokeWidth={2} />
                      </div>
                      <span>Same-day availability</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* CTA Button */}
              <button 
                className="btn-schedule-redesign"
                onClick={() => setShowScheduleModal(true)}
              >
                <span className="btn-schedule-content">
                  <Calendar size={22} strokeWidth={2.5} />
                  <span className="btn-schedule-text">Schedule Inspection Now</span>
                </span>
                <span className="btn-schedule-arrow">
                  <ChevronRight size={20} strokeWidth={2.5} />
                </span>
              </button>
            </div>
          </div>

          {/* Display Scheduled Inspection Info if exists */}
          {lead.inspection_scheduled_date && (
            <div className="info-card scheduled-info-card">
              <div className="card-header">
                <h2 className="card-title">
                  <CheckCircle size={24} strokeWidth={2} style={{ color: '#34C759' }} />
                  Inspection Scheduled
                </h2>
                <span className="status-badge" style={{ background: '#34C759', color: 'white' }}>
                  Confirmed
                </span>
              </div>

              <div className="info-section">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Date</span>
                    <span className="info-value">
                      <Calendar size={16} strokeWidth={2} />
                      {new Date(lead.inspection_scheduled_date).toLocaleDateString('en-AU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {lead.scheduled_time && (
                    <div className="info-item">
                      <span className="info-label">Time</span>
                      <span className="info-value">
                        <Clock size={16} strokeWidth={2} />
                        {lead.scheduled_time.substring(0, 2) === '12'
                          ? '12:00 PM'
                          : parseInt(lead.scheduled_time.substring(0, 2)) > 12
                            ? `${parseInt(lead.scheduled_time.substring(0, 2)) - 12}:00 PM`
                            : `${parseInt(lead.scheduled_time.substring(0, 2))}:00 AM`
                        }
                      </span>
                    </div>
                  )}
                </div>
                {lead.notes && (
                  <div className="info-item" style={{ marginTop: '16px' }}>
                    <span className="info-label">Internal Notes</span>
                    <div className="issue-box" style={{ marginTop: '8px' }}>
                      <div className="issue-icon">
                        <FileText size={20} strokeWidth={2} />
                      </div>
                      <p className="issue-text">{lead.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn-secondary"
                style={{ marginTop: '16px', width: '100%' }}
                onClick={() => setShowScheduleModal(true)}
              >
                <Calendar size={18} strokeWidth={2} />
                <span className="btn-label">Reschedule Inspection</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Schedule Inspection Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <Calendar size={24} strokeWidth={2} />
                Schedule Inspection
              </h2>
              <button 
                className="modal-close"
                onClick={() => setShowScheduleModal(false)}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="modal-body">
              <div className="client-info-summary">
                <h4>
                  <User size={18} strokeWidth={2} />
                  Client: {lead.full_name}
                </h4>
                <p>
                  <MapPin size={14} strokeWidth={2} />
                  {lead.property_address_street}, {lead.property_address_suburb}
                </p>
                <p>
                  <Phone size={14} strokeWidth={2} />
                  {lead.phone}
                </p>
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
                <CheckCircle size={18} strokeWidth={2} />
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
