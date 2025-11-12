import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editedLead, setEditedLead] = useState<any>({});

  // Fetch lead data from Supabase using React Query
  const { data: leadData, isLoading: loading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform database fields to component format
      return {
        id: data.id,
        name: data.full_name || 'Unknown',
        email: data.email || '',
        phone: data.phone || '',
        property: data.property_address_street || '',
        suburb: data.property_address_suburb || '',
        state: data.property_address_state || 'VIC',
        postcode: data.property_address_postcode || '',
        status: data.status || 'new_lead',
        urgency: data.urgency || 'medium',
        issueDescription: data.issue_description || data.notes || '',
        source: data.lead_source || 'Unknown',
        dateCreated: data.created_at,
        estimatedValue: data.quoted_amount ? parseFloat(data.quoted_amount.toString()) : null,
      };
    },
  });

  // Use leadData directly instead of local state
  const lead = leadData;

  const handleEdit = () => {
    setEditMode(true);
    setEditedLead({ ...lead });
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditedLead({ ...lead });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Transform component format back to database fields
      const { error } = await supabase
        .from('leads')
        .update({
          full_name: editedLead.name,
          email: editedLead.email,
          phone: editedLead.phone,
          property_address_street: editedLead.property,
          property_address_suburb: editedLead.suburb,
          property_address_state: editedLead.state,
          property_address_postcode: editedLead.postcode,
          urgency: editedLead.urgency,
          issue_description: editedLead.issueDescription,
          lead_source: editedLead.source,
          quoted_amount: editedLead.estimatedValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setEditMode(false);
      alert('Lead updated successfully!');

      // Refetch the data to show updated values
      window.location.reload();
    } catch (error) {
      alert('Failed to save changes');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setEditedLead((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCompleteJob = async (leadId: number) => {
    const confirmed = window.confirm(
      'Mark this job as complete?\n\nThis will update the status and notify the client.'
    );

    if (confirmed) {
      try {
        const { error } = await supabase
          .from('leads')
          .update({
            status: 'inspection_report_pdf_completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId);

        if (error) throw error;

        alert('Job marked as complete!');
        window.location.reload();
      } catch (error) {
        alert('Failed to update status');
        console.error(error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new_lead': '#3b82f6',
      'inspection_waiting': '#8b5cf6',
      'job_waiting': '#f59e0b',
      'job_completed': '#8b5cf6',
      'job_report_pdf_sent': '#f97316',
      'inspection_report_pdf_completed': '#22c55e',
      'invoicing_sent': '#0ea5e9',
      'paid': '#10b981',
      'google_review': '#f59e0b',
      'finished': '#059669',
      'lost': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'new_lead': 'New Lead',
      'inspection_waiting': 'Awaiting Inspection',
      'job_waiting': 'Awaiting Approval',
      'job_completed': 'Job Booked',
      'job_report_pdf_sent': 'Job In Progress',
      'inspection_report_pdf_completed': 'Job Complete',
      'invoicing_sent': 'Quote Sent',
      'paid': 'Paid',
      'google_review': 'Google Review',
      'finished': 'Closed',
      'lost': 'Not Landed'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      'new_lead': '🌟',
      'inspection_waiting': '📅',
      'job_waiting': '⏳',
      'job_completed': '🔨',
      'job_report_pdf_sent': '🔧',
      'inspection_report_pdf_completed': '✅',
      'invoicing_sent': '💰',
      'paid': '💚',
      'google_review': '⭐',
      'finished': '🎉',
      'lost': '❌'
    };
    return icons[status] || '📋';
  };

  if (loading) {
    return (
      <div className="client-detail-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="client-detail-page">
        <div className="error-state">
          <h2>Lead not found</h2>
          <button onClick={() => navigate('/leads')}>Back to Leads</button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-detail-page">
      {/* Navigation */}
      <nav className="detail-nav">
        <button className="back-btn" onClick={() => navigate('/leads')}>
          ← Back to Leads
        </button>
        
        <div className="nav-actions">
          {!editMode ? (
            <>
              <button className="btn-secondary" onClick={handleEdit}>
                <span>✏️</span>
                <span>Edit</span>
              </button>
              <button className="btn-call" onClick={() => window.location.href = `tel:${lead.phone}`}>
                <span>📞</span>
                <span>Call</span>
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : '✓ Save Changes'}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="detail-main">
        <div className="detail-container">
          
          {/* Header Card */}
          <div className={`detail-header-card ${editMode ? 'editing' : ''}`}>
            <div className="header-row">
              <div className="client-avatar">
                {lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div className="client-info">
                {editMode ? (
                  <input
                    type="text"
                    value={editedLead.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="edit-input edit-name"
                  />
                ) : (
                  <h1 className="client-name">{lead.name}</h1>
                )}
                
                <div className="status-badges">
                  <span 
                    className="status-badge" 
                    style={{ 
                      background: `${getStatusColor(lead.status)}15`, 
                      color: getStatusColor(lead.status) 
                    }}
                  >
                    {getStatusIcon(lead.status)} {getStatusLabel(lead.status)}
                  </span>
                  {editMode ? (
                    <select
                      value={editedLead.urgency}
                      onChange={(e) => updateField('urgency', e.target.value)}
                      className="edit-select"
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  ) : (
                    <span className={`urgency-badge ${lead.urgency}`}>
                      {lead.urgency === 'high' && '🔴 High'}
                      {lead.urgency === 'medium' && '🟡 Medium'}
                      {lead.urgency === 'low' && '🟢 Low'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="info-card">
            <h2 className="card-title">Contact Information</h2>
            
            <div className="info-grid">
              <div className="info-item">
                <label className="info-label">Phone</label>
                {editMode ? (
                  <input
                    type="tel"
                    value={editedLead.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <a href={`tel:${lead.phone}`} className="info-value info-link">
                    📱 {lead.phone}
                  </a>
                )}
              </div>

              <div className="info-item">
                <label className="info-label">Email</label>
                {editMode ? (
                  <input
                    type="email"
                    value={editedLead.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <a href={`mailto:${lead.email}`} className="info-value info-link">
                    📧 {lead.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="info-card">
            <h2 className="card-title">Property Information</h2>
            
            <div className="info-grid">
              <div className="info-item full-width">
                <label className="info-label">Address</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedLead.property}
                    onChange={(e) => updateField('property', e.target.value)}
                    className="edit-input"
                    placeholder="Street address"
                  />
                ) : (
                  <div className="info-value">📍 {lead.property}</div>
                )}
              </div>

              <div className="info-item">
                <label className="info-label">Suburb</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedLead.suburb}
                    onChange={(e) => updateField('suburb', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <div className="info-value">{lead.suburb}</div>
                )}
              </div>

              <div className="info-item">
                <label className="info-label">State</label>
                {editMode ? (
                  <select
                    value={editedLead.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="edit-select"
                  >
                    <option value="VIC">VIC</option>
                    <option value="NSW">NSW</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                ) : (
                  <div className="info-value">{lead.state}</div>
                )}
              </div>

              <div className="info-item">
                <label className="info-label">Postcode</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedLead.postcode}
                    onChange={(e) => updateField('postcode', e.target.value)}
                    className="edit-input"
                    maxLength={4}
                  />
                ) : (
                  <div className="info-value">{lead.postcode}</div>
                )}
              </div>
            </div>

            {!editMode && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.property + ' ' + lead.suburb + ' ' + lead.state)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-map"
              >
                🗺️ View on Google Maps
              </a>
            )}
          </div>

          {/* Issue Description */}
          <div className="info-card">
            <h2 className="card-title">Issue Description</h2>
            {editMode ? (
              <textarea
                value={editedLead.issueDescription}
                onChange={(e) => updateField('issueDescription', e.target.value)}
                className="edit-textarea"
                rows={4}
              />
            ) : (
              <p className="issue-description">{lead.issueDescription}</p>
            )}
          </div>

          {/* Lead Details */}
          <div className="info-card">
            <h2 className="card-title">Lead Details</h2>
            
            <div className="info-grid">
              <div className="info-item">
                <label className="info-label">Source</label>
                {editMode ? (
                  <select
                    value={editedLead.source}
                    onChange={(e) => updateField('source', e.target.value)}
                    className="edit-select"
                  >
                    <option value="Website">Website</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Referral">Referral</option>
                    <option value="Phone">Phone</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <div className="info-value">{lead.source}</div>
                )}
              </div>

              <div className="info-item">
                <label className="info-label">Estimated Value</label>
                {editMode ? (
                  <input
                    type="number"
                    value={editedLead.estimatedValue}
                    onChange={(e) => updateField('estimatedValue', parseFloat(e.target.value))}
                    className="edit-input"
                    min="0"
                    step="0.01"
                  />
                ) : (
                  <div className="info-value">${lead.estimatedValue?.toLocaleString()}</div>
                )}
              </div>

              <div className="info-item">
                <label className="info-label">Date Created</label>
                <div className="info-value">
                  {new Date(lead.dateCreated).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>

              <div className="info-item">
                <label className="info-label">Lead ID</label>
                <div className="info-value">#{lead.id}</div>
              </div>
            </div>
          </div>

          {/* Job completion handled from Leads Management and Calendar only */}

        </div>
      </main>
    </div>
  );
};

export default ClientDetail;
