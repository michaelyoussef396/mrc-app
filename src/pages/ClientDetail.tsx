import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadInspectionPhotos } from '@/lib/utils/photoUpload';

// Helper to format currency in Australian format
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Helper to format date in Australian format
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Helper to format time
const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return '-';
  const hour = parseInt(timeString.substring(0, 2));
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editedLead, setEditedLead] = useState<any>({});

  // Schedule inspection state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

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
        issueDescription: data.issue_description || '',
        source: data.lead_source || 'Unknown',
        lead_source_other: data.lead_source_other || null,
        dateCreated: data.created_at,
        // Scheduled inspection fields
        inspection_scheduled_date: data.inspection_scheduled_date || null,
        scheduled_time: data.scheduled_time || null,
        notes: data.notes || null,
      };
    },
  });

  // Use leadData directly instead of local state
  const lead = leadData;

  // Fetch inspection data for this lead (with 30s polling for auto-save updates)
  const { data: inspectionData } = useQuery({
    queryKey: ['inspection', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('lead_id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching inspection:', error);
        return null;
      }

      // DEBUG: Log subfloor data from inspections table
      console.log('🔍 SUBFLOOR DATA FROM INSPECTIONS TABLE:', {
        subfloor_required: data?.subfloor_required,
        subfloor_moisture_readings: data?.subfloor_moisture_readings,
        subfloor_sanitation: data?.subfloor_sanitation,
        subfloor_racking: data?.subfloor_racking,
        subfloor_treatment_time: data?.subfloor_treatment_time,
        subfloor_observations: data?.subfloor_observations,
        subfloor_landscape: data?.subfloor_landscape,
        subfloor_comments: data?.subfloor_comments
      });

      return data;
    },
    enabled: !!id,
    refetchInterval: 30000, // Poll every 30 seconds for auto-save updates
  });

  // Fetch inspector profile (separate query since no FK relationship)
  const { data: inspectorProfile } = useQuery({
    queryKey: ['inspector-profile', inspectionData?.inspector_id],
    queryFn: async () => {
      if (!inspectionData?.inspector_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', inspectionData.inspector_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching inspector profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!inspectionData?.inspector_id,
  });

  // Fetch inspection areas
  const { data: areasData } = useQuery({
    queryKey: ['inspection-areas', inspectionData?.id],
    queryFn: async () => {
      if (!inspectionData?.id) return [];
      const { data, error } = await supabase
        .from('inspection_areas')
        .select('*')
        .eq('inspection_id', inspectionData.id)
        .order('area_order', { ascending: true });

      if (error) {
        console.error('Error fetching areas:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!inspectionData?.id,
    refetchInterval: 30000,
  });

  // Fetch photos for this inspection (with signed URLs)
  const { data: photosData } = useQuery({
    queryKey: ['inspection-photos', inspectionData?.id],
    queryFn: async () => {
      if (!inspectionData?.id) return [];
      try {
        return await loadInspectionPhotos(inspectionData.id);
      } catch (error) {
        console.error('Error fetching photos:', error);
        return [];
      }
    },
    enabled: !!inspectionData?.id,
    refetchInterval: 30000,
  });

  // Fetch moisture readings for all areas
  const { data: moistureReadingsData } = useQuery({
    queryKey: ['moisture-readings', inspectionData?.id],
    queryFn: async () => {
      if (!inspectionData?.id || !areasData?.length) return [];
      const areaIds = areasData.map(a => a.id);
      const { data, error } = await supabase
        .from('moisture_readings')
        .select('*')
        .in('area_id', areaIds)
        .order('reading_order', { ascending: true });

      if (error) {
        console.error('Error fetching moisture readings:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!inspectionData?.id && !!areasData?.length,
    refetchInterval: 30000,
  });

  // Fetch subfloor data
  const { data: subfloorData } = useQuery({
    queryKey: ['subfloor-data', inspectionData?.id],
    queryFn: async () => {
      if (!inspectionData?.id) return null;
      const { data, error } = await supabase
        .from('subfloor_data')
        .select('*')
        .eq('inspection_id', inspectionData.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subfloor data:', error);
        return null;
      }

      // DEBUG: Log subfloor_data table content
      console.log('🔍 SUBFLOOR_DATA TABLE:', data);

      return data;
    },
    enabled: !!inspectionData?.id,
    refetchInterval: 30000,
  });

  // Fetch subfloor readings
  const { data: subfloorReadingsData } = useQuery({
    queryKey: ['subfloor-readings', subfloorData?.id],
    queryFn: async () => {
      if (!subfloorData?.id) return [];
      const { data, error } = await supabase
        .from('subfloor_readings')
        .select('*')
        .eq('subfloor_id', subfloorData.id)
        .order('reading_order', { ascending: true });

      if (error) {
        console.error('Error fetching subfloor readings:', error);
        return [];
      }

      // DEBUG: Log subfloor_readings table content
      console.log('🔍 SUBFLOOR_READINGS TABLE:', data);

      return data || [];
    },
    enabled: !!subfloorData?.id,
    refetchInterval: 30000,
  });

  // Fetch subfloor photos
  const { data: subfloorPhotosData } = useQuery({
    queryKey: ['subfloor-photos', inspectionData?.id, subfloorData?.id],
    queryFn: async () => {
      if (!inspectionData?.id) return [];
      try {
        const allPhotos = await loadInspectionPhotos(inspectionData.id);
        // Filter for subfloor photos (by subfloor_id or photo_type='subfloor')
        return allPhotos.filter(p =>
          p.subfloor_id === subfloorData?.id ||
          (p.photo_type === 'subfloor' && !p.subfloor_id)
        );
      } catch (error) {
        console.error('Error fetching subfloor photos:', error);
        return [];
      }
    },
    enabled: !!inspectionData?.id,
    refetchInterval: 30000,
  });

  // Fetch outdoor photos (photo_type='outdoor', grouped by caption: front_door, front_house, mailbox, street, direction)
  const { data: outdoorPhotosData } = useQuery({
    queryKey: ['outdoor-photos', inspectionData?.id],
    queryFn: async () => {
      if (!inspectionData?.id) return [];
      try {
        const allPhotos = await loadInspectionPhotos(inspectionData.id);
        // Filter for outdoor photos (photo_type='outdoor')
        const outdoorPhotos = allPhotos.filter(p => p.photo_type === 'outdoor');
        console.log('🔍 OUTDOOR PHOTOS:', {
          total: allPhotos.length,
          outdoor: outdoorPhotos.length,
          captions: outdoorPhotos.map(p => p.caption)
        });
        return outdoorPhotos;
      } catch (error) {
        console.error('Error fetching outdoor photos:', error);
        return [];
      }
    },
    enabled: !!inspectionData?.id,
    refetchInterval: 30000,
  });

  const inspection = inspectionData;
  const areas = areasData || [];
  const photos = photosData || [];
  const moistureReadings = moistureReadingsData || [];
  const subfloor = subfloorData;
  const subfloorReadings = subfloorReadingsData || [];
  const subfloorPhotos = subfloorPhotosData || [];
  const outdoorPhotos = outdoorPhotosData || [];

  // Debug logging
  console.log('Lead data loaded:', {
    inspection_scheduled_date: lead?.inspection_scheduled_date,
    scheduled_time: lead?.scheduled_time,
    notes: lead?.notes
  });
  console.log('Inspection data:', inspection);
  console.log('Areas:', areas);
  console.log('Photos:', photos);

  // Pre-populate modal with existing data when it opens
  useEffect(() => {
    if (lead && showScheduleModal) {
      if (lead.inspection_scheduled_date) {
        setScheduleDate(lead.inspection_scheduled_date);
      }
      if (lead.scheduled_time) {
        setScheduleTime(lead.scheduled_time);
      }
      if (lead.notes) {
        setScheduleNotes(lead.notes);
      }
    }
  }, [lead, showScheduleModal]);

  // Handle scheduling inspection
  const handleScheduleInspection = async () => {
    if (!scheduleDate || !scheduleTime) {
      alert('Please select a date and time');
      return;
    }

    console.log('Saving schedule:', { scheduleDate, scheduleTime, scheduleNotes });

    try {
      const { error, data } = await supabase
        .from('leads')
        .update({
          status: 'inspection_waiting',
          inspection_scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          notes: scheduleNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      console.log('Save result:', { error, data });

      if (error) throw error;

      setShowScheduleModal(false);
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      alert('Inspection scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      alert('Failed to schedule inspection');
    }
  };

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
                    <option value="hipages">HiPages</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <div className="info-value">
                    {lead.source === 'other' && lead.lead_source_other
                      ? `Other: ${lead.lead_source_other}`
                      : lead.source || 'Website'
                    }
                  </div>
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
                <div className="info-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                  #{lead.id}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Inspection Section */}
          {!lead.inspection_scheduled_date && (
            <div className="info-card" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)' }}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <h2 className="card-title" style={{ justifyContent: 'center', marginBottom: '16px' }}>
                  📅 Schedule Inspection
                </h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Book a convenient time for our expert team to assess the mould issue
                </p>
                <button
                  className="btn-primary"
                  onClick={() => setShowScheduleModal(true)}
                  style={{ padding: '12px 24px', fontSize: '16px' }}
                >
                  📅 Schedule Inspection Now
                </button>
              </div>
            </div>
          )}

          {/* Scheduled Inspection Info Display */}
          {lead.inspection_scheduled_date && (
            <div className="info-card" style={{ borderLeft: '4px solid #34C759' }}>
              <h2 className="card-title" style={{ color: '#34C759' }}>
                ✅ Inspection Scheduled
              </h2>

              <div className="info-grid">
                <div className="info-item">
                  <label className="info-label">Date</label>
                  <div className="info-value">
                    📅 {new Date(lead.inspection_scheduled_date).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                {lead.scheduled_time && (
                  <div className="info-item">
                    <label className="info-label">Time</label>
                    <div className="info-value">
                      🕐 {lead.scheduled_time.substring(0, 2) === '12'
                        ? '12:00 PM'
                        : parseInt(lead.scheduled_time.substring(0, 2)) > 12
                          ? `${parseInt(lead.scheduled_time.substring(0, 2)) - 12}:00 PM`
                          : `${parseInt(lead.scheduled_time.substring(0, 2))}:00 AM`
                      }
                    </div>
                  </div>
                )}
              </div>

              {lead.notes && (
                <div className="info-item" style={{ marginTop: '16px' }}>
                  <label className="info-label">Internal Notes</label>
                  <div className="info-value" style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '8px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    📝 {lead.notes}
                  </div>
                </div>
              )}

              <button
                className="btn-secondary"
                onClick={() => setShowScheduleModal(true)}
                style={{ marginTop: '16px', width: '100%' }}
              >
                ✏️ Reschedule Inspection
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* INSPECTION INFORMATION - Section 1: Basic Information Only */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {inspection && (
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* SECTION 1: BASIC INFORMATION */}
              {/* ══════════════════════════════════════════════════════════════ */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  padding: '16px 20px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', opacity: 0.9, marginBottom: '4px' }}>
                    SECTION 1 OF 10
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700' }}>
                    BASIC INFORMATION
                  </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <div className="info-grid">
                    <div className="info-item">
                      <label className="info-label">Job Number</label>
                      <div className="info-value">{inspection.job_number || '-'}</div>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Inspection Date</label>
                      <div className="info-value">{formatDate(inspection.inspection_date)}</div>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Start Time</label>
                      <div className="info-value">{formatTime(inspection.inspection_start_time)}</div>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Inspector</label>
                      <div className="info-value">{inspectorProfile?.full_name || '-'}</div>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Requested By</label>
                      <div className="info-value">{inspection.requested_by || '-'}</div>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Attention To</label>
                      <div className="info-value">{inspection.attention_to || '-'}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <label className="info-label">Job Description</label>
                    <div className="info-value" style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {inspection.triage_description || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* SECTION 2: PROPERTY DETAILS */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {(inspection.property_occupation || inspection.dwelling_type) && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    padding: '16px 20px',
                    color: 'white'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', opacity: 0.9, marginBottom: '4px' }}>
                      SECTION 2 OF 10
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>
                      PROPERTY DETAILS
                    </div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div className="info-item">
                        <label className="info-label">Property Occupation</label>
                        <div className="info-value">
                          {inspection.property_occupation
                            ? inspection.property_occupation.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                            : '-'}
                        </div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">Dwelling Type</label>
                        <div className="info-value">
                          {inspection.dwelling_type
                            ? inspection.dwelling_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* SECTION 3: AREA INSPECTION */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {areas.length > 0 && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    padding: '16px 20px',
                    color: 'white'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', opacity: 0.9, marginBottom: '4px' }}>
                      SECTION 3 OF 10
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>
                      AREA INSPECTION
                    </div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    {areas.map((area, areaIndex) => {
                      // Get photos for this area
                      const areaPhotos = photos.filter(p => p.area_id === area.id);
                      const roomViewPhotos = areaPhotos.filter(p => p.caption === 'room_view' || (!p.caption && !p.moisture_reading_id));
                      const infraredPhoto = areaPhotos.find(p => p.caption === 'infrared');
                      const naturalInfraredPhoto = areaPhotos.find(p => p.caption === 'natural_infrared');

                      // Get moisture readings for this area
                      const areaMoistureReadings = moistureReadings.filter(r => r.area_id === area.id);

                      // Get infrared observations
                      const infraredObs = [];
                      if (area.infrared_observation_water_leak) infraredObs.push('Active Water Leak');
                      if (area.infrared_observation_moisture) infraredObs.push('Moisture Detected');
                      if (area.infrared_observation_condensation) infraredObs.push('Condensation Pattern');
                      if (area.infrared_observation_missing_insulation) infraredObs.push('Missing/Inadequate Insulation');

                      return (
                        <div key={area.id} style={{
                          marginBottom: areaIndex < areas.length - 1 ? '24px' : 0,
                          paddingBottom: areaIndex < areas.length - 1 ? '24px' : 0,
                          borderBottom: areaIndex < areas.length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}>
                          {/* Area Header */}
                          <div style={{
                            background: '#f3f4f6',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '16px'
                          }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                              Area {areaIndex + 1}: {area.area_name || 'Unnamed Area'}
                            </div>
                          </div>

                          {/* 1. Mould Visibility */}
                          {area.mould_description && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Mould Visibility
                              </div>
                              <div style={{
                                background: '#f9fafb',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: '#374151',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {area.mould_description}
                              </div>
                            </div>
                          )}

                          {/* 2. Comments/Findings */}
                          {area.comments && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Comments/Findings
                              </div>
                              <div style={{
                                background: '#f0f9ff',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: '#0369a1',
                                whiteSpace: 'pre-wrap',
                                borderLeft: '3px solid #0ea5e9'
                              }}>
                                {area.comments}
                              </div>
                            </div>
                          )}

                          {/* 3-5. Environmental Readings (Temperature, Humidity, Dew Point) */}
                          {(area.temperature || area.humidity || area.dew_point) && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Environmental Readings
                              </div>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                                background: '#f9fafb',
                                padding: '16px',
                                borderRadius: '8px'
                              }}>
                                {area.temperature && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Temperature</div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>{area.temperature}°C</div>
                                  </div>
                                )}
                                {area.humidity && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Humidity</div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>{area.humidity}%</div>
                                  </div>
                                )}
                                {area.dew_point && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Dew Point</div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>{area.dew_point}°C</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 6. Moisture Readings */}
                          {areaMoistureReadings.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Moisture Readings ({areaMoistureReadings.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {areaMoistureReadings.map((reading, readingIndex) => {
                                  const readingPhoto = areaPhotos.find(p => p.moisture_reading_id === reading.id);
                                  return (
                                    <div key={reading.id} style={{
                                      background: '#f9fafb',
                                      padding: '12px',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      gap: '12px',
                                      alignItems: 'flex-start'
                                    }}>
                                      {readingPhoto && (
                                        <img
                                          src={readingPhoto.signed_url}
                                          alt={`Reading ${readingIndex + 1}`}
                                          style={{
                                            width: '80px',
                                            height: '80px',
                                            objectFit: 'cover',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                          }}
                                          onClick={() => window.open(readingPhoto.signed_url, '_blank')}
                                        />
                                      )}
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                                          {reading.title || `Reading ${readingIndex + 1}`}
                                        </div>
                                        <div style={{ fontSize: '13px' }}>
                                          <span style={{ color: '#6b7280' }}>Moisture: </span>
                                          <span style={{ fontWeight: '600', color: reading.moisture_percentage > 15 ? '#dc2626' : '#16a34a' }}>
                                            {reading.moisture_percentage}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 7. Internal Office Notes */}
                          {area.internal_office_notes && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Internal Office Notes
                              </div>
                              <div style={{
                                background: '#fffbeb',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#92400e',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {area.internal_office_notes}
                              </div>
                            </div>
                          )}

                          {/* 8. Room View Photos */}
                          {roomViewPhotos.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Room View Photos ({roomViewPhotos.length})
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {roomViewPhotos.map(photo => (
                                  <img
                                    key={photo.id}
                                    src={photo.signed_url}
                                    alt="Room view"
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(photo.signed_url, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 9-10. Infrared Photos */}
                          {(infraredPhoto || naturalInfraredPhoto) && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Infrared Imaging
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {infraredPhoto && (
                                  <div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Infrared View</div>
                                    <img
                                      src={infraredPhoto.signed_url}
                                      alt="Infrared view"
                                      style={{
                                        width: '100%',
                                        aspectRatio: '4/3',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => window.open(infraredPhoto.signed_url, '_blank')}
                                    />
                                  </div>
                                )}
                                {naturalInfraredPhoto && (
                                  <div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Natural View</div>
                                    <img
                                      src={naturalInfraredPhoto.signed_url}
                                      alt="Natural view"
                                      style={{
                                        width: '100%',
                                        aspectRatio: '4/3',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => window.open(naturalInfraredPhoto.signed_url, '_blank')}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 11. Infrared Observations */}
                          {infraredObs.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Infrared Observations
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {infraredObs.map(obs => (
                                  <span key={obs} style={{
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}>
                                    {obs}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 12-13. Job Time Estimate */}
                          {((area.job_time_minutes && area.job_time_minutes > 0) || (area.demolition_time_minutes && area.demolition_time_minutes > 0)) && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Job Time Estimate
                              </div>
                              <div style={{
                                background: '#f9fafb',
                                borderRadius: '8px',
                                overflow: 'hidden'
                              }}>
                                {area.job_time_minutes > 0 && (
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderBottom: area.demolition_time_minutes > 0 ? '1px solid #e5e7eb' : 'none'
                                  }}>
                                    <span style={{ color: '#374151' }}>Time Without Demolition</span>
                                    <span style={{ fontWeight: '600', color: '#1f2937' }}>
                                      {area.job_time_minutes} {area.job_time_minutes === 1 ? 'hour' : 'hours'}
                                    </span>
                                  </div>
                                )}
                                {area.demolition_time_minutes > 0 && (
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #e5e7eb'
                                  }}>
                                    <span style={{ color: '#374151' }}>Demolition Time</span>
                                    <span style={{ fontWeight: '600', color: '#dc2626' }}>
                                      {area.demolition_time_minutes} {area.demolition_time_minutes === 1 ? 'hour' : 'hours'}
                                    </span>
                                  </div>
                                )}
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '12px 16px',
                                  background: '#eff6ff'
                                }}>
                                  <span style={{ fontWeight: '600', color: '#1e40af' }}>Total Time</span>
                                  <span style={{ fontWeight: '700', color: '#1e40af' }}>
                                    {(area.job_time_minutes || 0) + (area.demolition_time_minutes || 0)} hours
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 14. Demolition Description */}
                          {area.demolition_description && (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                Demolition Required
                              </div>
                              <div style={{
                                background: '#fef2f2',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: '#991b1b',
                                whiteSpace: 'pre-wrap',
                                borderLeft: '3px solid #dc2626'
                              }}>
                                {area.demolition_description}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 4 OF 10: SUBFLOOR */}
              {inspection.subfloor_required && subfloor && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Section Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    padding: '16px 24px',
                    borderBottom: '3px solid #6d28d9'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      SECTION 4 OF 10
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      SUBFLOOR
                    </div>
                  </div>

                  {/* Section Content */}
                  <div style={{ padding: '24px' }}>

                    {/* 1. Subfloor Observations */}
                    {subfloor.observations && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}>
                          Subfloor Observations
                        </div>
                        <div style={{
                          background: '#f9fafb',
                          padding: '12px',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          color: '#374151'
                        }}>
                          {subfloor.observations}
                        </div>
                      </div>
                    )}

                    {/* 2. Subfloor Landscape */}
                    {subfloor.landscape && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        marginBottom: '16px'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280'
                        }}>
                          Subfloor Landscape
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#111827'
                        }}>
                          {subfloor.landscape === 'flat_block' ? 'Flat Block' :
                           subfloor.landscape === 'sloping_block' ? 'Sloping Block' :
                           subfloor.landscape}
                        </span>
                      </div>
                    )}

                    {/* 3. Subfloor Comments */}
                    {subfloor.comments && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}>
                          Subfloor Comments
                        </div>
                        <div style={{
                          background: '#f9fafb',
                          padding: '12px',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          color: '#374151'
                        }}>
                          {subfloor.comments}
                        </div>
                      </div>
                    )}

                    {/* 4. Subfloor Moisture Readings */}
                    {subfloorReadings.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}>
                          Subfloor Moisture Readings ({subfloorReadings.length})
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          {subfloorReadings.map((reading: any, idx: number) => (
                            <div key={reading.id || idx} style={{
                              background: '#f9fafb',
                              borderRadius: '8px',
                              padding: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                {reading.location || `Reading ${idx + 1}`}
                              </span>
                              {reading.moisture_percentage != null && (
                                <span style={{
                                  fontSize: '18px',
                                  fontWeight: '700',
                                  color: parseFloat(reading.moisture_percentage) > 15 ? '#dc2626' : '#16a34a'
                                }}>
                                  {reading.moisture_percentage}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Subfloor Photos */}
                    {subfloorPhotos.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}>
                          Subfloor Photos ({subfloorPhotos.length})
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '8px'
                        }}>
                          {subfloorPhotos.map((photo: any) => (
                            <img
                              key={photo.id}
                              src={photo.signed_url}
                              alt="Subfloor"
                              style={{
                                width: '100%',
                                aspectRatio: '1',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(photo.signed_url, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. Subfloor Sanitation */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#6b7280'
                      }}>
                        Subfloor Sanitation
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: subfloor.sanitation_required ? '#d1fae5' : '#f3f4f6',
                        color: subfloor.sanitation_required ? '#065f46' : '#6b7280'
                      }}>
                        {subfloor.sanitation_required ? 'Yes' : 'No'}
                      </span>
                    </div>

                    {/* 7. Subfloor Racking */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      marginBottom: '16px'
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#6b7280'
                      }}>
                        Subfloor Racking
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: subfloor.racking_required ? '#d1fae5' : '#f3f4f6',
                        color: subfloor.racking_required ? '#065f46' : '#6b7280'
                      }}>
                        {subfloor.racking_required ? 'Yes' : 'No'}
                      </span>
                    </div>

                    {/* 8. Subfloor Treatment Time */}
                    {subfloor.treatment_time_minutes != null && subfloor.treatment_time_minutes > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        background: '#eff6ff',
                        borderRadius: '6px',
                        borderLeft: '3px solid #3b82f6'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1e40af'
                        }}>
                          Subfloor Treatment Time
                        </span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#1e40af'
                        }}>
                          {subfloor.treatment_time_minutes} {subfloor.treatment_time_minutes === 1 ? 'hour' : 'hours'}
                        </span>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* SECTION 5 OF 10: OUTDOOR INFO */}
              {(inspection.outdoor_temperature || inspection.outdoor_humidity || inspection.outdoor_comments || outdoorPhotos.length > 0) && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Section Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    padding: '16px 24px',
                    borderBottom: '3px solid #0e7490'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      SECTION 5 OF 10
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      OUTDOOR INFO
                    </div>
                  </div>

                  {/* Section Content */}
                  <div style={{ padding: '24px' }}>

                    {/* 1-3. Environmental Readings: Temperature, Humidity, Dew Point */}
                    {(inspection.outdoor_temperature || inspection.outdoor_humidity || inspection.outdoor_dew_point) && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Environmental Readings
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '16px',
                          background: '#f9fafb',
                          padding: '20px',
                          borderRadius: '8px'
                        }}>
                          {inspection.outdoor_temperature != null && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '8px',
                                fontWeight: '500'
                              }}>
                                Temperature
                              </div>
                              <div style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                {inspection.outdoor_temperature}°C
                              </div>
                            </div>
                          )}
                          {inspection.outdoor_humidity != null && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '8px',
                                fontWeight: '500'
                              }}>
                                Humidity
                              </div>
                              <div style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                {inspection.outdoor_humidity}%
                              </div>
                            </div>
                          )}
                          {inspection.outdoor_dew_point != null && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '8px',
                                fontWeight: '500'
                              }}>
                                Dew Point
                              </div>
                              <div style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                {inspection.outdoor_dew_point}°C
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 4. Outdoor Comments */}
                    {inspection.outdoor_comments && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}>
                          Outdoor Comments
                        </div>
                        <div style={{
                          background: '#f9fafb',
                          padding: '12px',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          color: '#374151'
                        }}>
                          {inspection.outdoor_comments}
                        </div>
                      </div>
                    )}

                    {/* 5. Front Door Photo */}
                    {(() => {
                      const frontDoorPhotos = outdoorPhotos.filter((p: any) => p.caption === 'front_door');
                      if (frontDoorPhotos.length === 0) return null;
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '8px'
                          }}>
                            Front Door Photo
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px'
                          }}>
                            {frontDoorPhotos.map((photo: any) => (
                              <img
                                key={photo.id}
                                src={photo.signed_url}
                                alt="Front Door"
                                style={{
                                  width: '100%',
                                  height: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                                onClick={() => window.open(photo.signed_url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 6. Front of House Photo */}
                    {(() => {
                      const frontHousePhotos = outdoorPhotos.filter((p: any) => p.caption === 'front_house');
                      if (frontHousePhotos.length === 0) return null;
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '8px'
                          }}>
                            Front of House Photo
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px'
                          }}>
                            {frontHousePhotos.map((photo: any) => (
                              <img
                                key={photo.id}
                                src={photo.signed_url}
                                alt="Front of House"
                                style={{
                                  width: '100%',
                                  height: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                                onClick={() => window.open(photo.signed_url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 7. Mailbox Photo */}
                    {(() => {
                      const mailboxPhotos = outdoorPhotos.filter((p: any) => p.caption === 'mailbox');
                      if (mailboxPhotos.length === 0) return null;
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '8px'
                          }}>
                            Mailbox Photo
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px'
                          }}>
                            {mailboxPhotos.map((photo: any) => (
                              <img
                                key={photo.id}
                                src={photo.signed_url}
                                alt="Mailbox"
                                style={{
                                  width: '100%',
                                  height: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                                onClick={() => window.open(photo.signed_url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 8. Street Photo */}
                    {(() => {
                      const streetPhotos = outdoorPhotos.filter((p: any) => p.caption === 'street');
                      if (streetPhotos.length === 0) return null;
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '8px'
                          }}>
                            Street Photo
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px'
                          }}>
                            {streetPhotos.map((photo: any) => (
                              <img
                                key={photo.id}
                                src={photo.signed_url}
                                alt="Street"
                                style={{
                                  width: '100%',
                                  height: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                                onClick={() => window.open(photo.signed_url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 9. Direction Photos */}
                    {(() => {
                      const directionPhotos = outdoorPhotos.filter((p: any) => p.caption === 'direction');
                      if (directionPhotos.length === 0) return null;
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '8px'
                          }}>
                            Direction Photos ({directionPhotos.length})
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px'
                          }}>
                            {directionPhotos.map((photo: any) => (
                              <img
                                key={photo.id}
                                src={photo.signed_url}
                                alt="Direction"
                                style={{
                                  width: '100%',
                                  height: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                                onClick={() => window.open(photo.signed_url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/inspection/${id}`)}
                  style={{ flex: 1 }}
                >
                  ✏️ Edit Inspection
                </button>
                {inspection.report_pdf_url && (
                  <button
                    className="btn-secondary"
                    onClick={() => window.open(inspection.report_pdf_url, '_blank')}
                    style={{ flex: 1 }}
                  >
                    📄 View PDF Report
                  </button>
                )}
              </div>
            </div>
          )}

          {/* No inspection yet - show option to start */}
          {!inspection && lead?.inspection_scheduled_date && (
            <div className="info-card" style={{ marginTop: '24px', textAlign: 'center', padding: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#6b7280' }}>
                📋 No Inspection Data Yet
              </h3>
              <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                The inspection form hasn't been started. Data will appear here as the form is filled out.
              </p>
              <button
                className="btn-primary"
                onClick={() => navigate(`/inspection/${id}`)}
              >
                🚀 Start Inspection Form
              </button>
            </div>
          )}

          {/* Job completion handled from Leads Management and Calendar only */}

        </div>
      </main>

      {/* Schedule Inspection Modal */}
      {showScheduleModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="modal-content"
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '450px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: '20px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                📅 Schedule Inspection
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div
                style={{
                  background: '#f8f9fa',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <p style={{ margin: 0, fontWeight: '500' }}>👤 Client: {lead.name}</p>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>
                  📍 {lead.property}, {lead.suburb}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                  }}
                >
                  Inspection Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                  }}
                >
                  Time *
                </label>
                <select
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
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

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                  }}
                >
                  Internal Notes (Optional)
                </label>
                <textarea
                  placeholder="Add any notes about the booking..."
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                padding: '20px',
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: '12px',
              }}
            >
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleInspection}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#007AFF',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                ✓ Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
