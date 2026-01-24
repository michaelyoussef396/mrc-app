import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadInspectionPhotos } from '@/lib/utils/photoUpload';
import { calculateCostEstimate, LABOUR_RATES, getDiscountTierDescription } from '@/lib/calculations/pricing';
import { BookInspectionModal } from '@/components/leads/BookInspectionModal';
import { AddressAutocomplete, type AddressValue } from '@/components/booking';

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
  const [editedAddress, setEditedAddress] = useState<AddressValue | undefined>(undefined);

  // Schedule inspection state (using new smart booking modal)
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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
        // Lat/lng for accurate Google Maps
        property_lat: data.property_lat || null,
        property_lng: data.property_lng || null,
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

  // Fetch calendar booking data for this lead (includes booking notes)
  const { data: bookingData } = useQuery({
    queryKey: ['calendar-booking', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('calendar_bookings')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching booking:', error);
        return null;
      }
      return data;
    },
    enabled: !!id,
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

  // Handle successful booking from the new smart modal
  const handleBookingSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['lead', id] });
    queryClient.invalidateQueries({ queryKey: ['unscheduled-leads'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedLead({ ...lead });
    // Initialize address autocomplete with current address
    setEditedAddress({
      street: lead?.property || '',
      suburb: lead?.suburb || '',
      state: lead?.state || 'VIC',
      postcode: lead?.postcode || '',
      fullAddress: `${lead?.property || ''}, ${lead?.suburb || ''} ${lead?.state || ''} ${lead?.postcode || ''}`.trim()
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditedLead({ ...lead });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Use editedAddress if available, otherwise fall back to editedLead
      const addressData = editedAddress?.street
        ? {
            property_address_street: editedAddress.street,
            property_address_suburb: editedAddress.suburb,
            property_address_state: editedAddress.state || 'VIC',
            property_address_postcode: editedAddress.postcode,
            property_lat: editedAddress.lat || null,
            property_lng: editedAddress.lng || null,
          }
        : {
            property_address_street: editedLead.property,
            property_address_suburb: editedLead.suburb,
            property_address_state: editedLead.state,
            property_address_postcode: editedLead.postcode,
          };

      // Transform component format back to database fields
      const { error } = await supabase
        .from('leads')
        .update({
          full_name: editedLead.name,
          email: editedLead.email,
          phone: editedLead.phone,
          ...addressData,
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

            {editMode ? (
              <div className="space-y-4">
                <AddressAutocomplete
                  label="Property Address"
                  placeholder="Start typing address... (e.g., 123 High St)"
                  value={editedAddress}
                  onChange={(address) => setEditedAddress(address)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Select from dropdown to ensure accurate suburb and coordinates
                </p>
              </div>
            ) : (
              <>
                <div className="info-grid">
                  <div className="info-item full-width">
                    <label className="info-label">Address</label>
                    <div className="info-value">📍 {lead.property}</div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">Suburb</label>
                    <div className="info-value">{lead.suburb}</div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">State</label>
                    <div className="info-value">{lead.state}</div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">Postcode</label>
                    <div className="info-value">{lead.postcode}</div>
                  </div>
                </div>

                <a
                  href={lead.property_lat && lead.property_lng
                    ? `https://www.google.com/maps?q=${lead.property_lat},${lead.property_lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.property + ' ' + lead.suburb + ' ' + lead.state + ' ' + lead.postcode)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary btn-map"
                >
                  🗺️ View on Google Maps
                </a>
              </>
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

                {/* Technician from calendar booking - assigned_to contains user ID */}
                {bookingData?.assigned_to && (
                  <div className="info-item">
                    <label className="info-label">Assigned To</label>
                    <div className="info-value">
                      👷 Technician Assigned
                    </div>
                  </div>
                )}
              </div>

              {/* Booking notes from calendar_bookings.description */}
              {bookingData?.description && (
                <div className="info-item" style={{ marginTop: '16px' }}>
                  <label className="info-label">📝 Notes from Booking Call</label>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '8px',
                  }}>
                    <div style={{
                      borderBottom: '1px dashed #cbd5e1',
                      paddingBottom: '8px',
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: '#64748b',
                    }}>
                      Notes captured during booking
                    </div>
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      color: '#334155',
                      fontSize: '14px',
                      lineHeight: '1.6',
                    }}>
                      {bookingData.description}
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy internal notes from leads.notes (if different from booking notes) */}
              {lead.notes && lead.notes !== bookingData?.description && (
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
                      <div className="info-value">{inspection.inspector_name || '-'}</div>
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

                          {/* 6b. External Moisture (if set) */}
                          {area.external_moisture != null && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                                External Moisture
                              </div>
                              <div style={{
                                background: '#f9fafb',
                                padding: '12px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{ color: '#374151' }}>Reading:</span>
                                <span style={{
                                  fontWeight: '600',
                                  color: area.external_moisture > 15 ? '#dc2626' : '#16a34a'
                                }}>
                                  {area.external_moisture}%
                                </span>
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

              {/* SECTION 6 OF 10: WASTE DISPOSAL */}
              {inspection.waste_disposal_required && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Section Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    padding: '16px 24px',
                    borderBottom: '3px solid #b91c1c'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      SECTION 6 OF 10
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      WASTE DISPOSAL
                    </div>
                  </div>

                  {/* Section Content */}
                  <div style={{ padding: '24px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px',
                      background: '#fef2f2',
                      borderRadius: '8px',
                      border: '2px solid #fecaca'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#991b1b',
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Waste Disposal Required
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#7f1d1d'
                        }}>
                          {inspection.waste_disposal_amount || 'Not specified'}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '40px'
                      }}>
                        🗑️
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7 OF 10: WORK PROCEDURE */}
              {(inspection.hepa_vac ||
                inspection.antimicrobial ||
                inspection.stain_removing_antimicrobial ||
                inspection.home_sanitation_fogging ||
                inspection.drying_equipment_enabled) && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Section Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    padding: '16px 24px',
                    borderBottom: '3px solid #b45309'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      SECTION 7 OF 10
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      WORK PROCEDURE
                    </div>
                  </div>

                  {/* Section Content */}
                  <div style={{ padding: '24px' }}>

                    {/* Main Procedures Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>

                      {/* 1. HEPA VAC */}
                      {inspection.hepa_vac && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            HEPA VAC
                          </span>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#d1fae5',
                            color: '#065f46'
                          }}>
                            ON
                          </span>
                        </div>
                      )}

                      {/* 2. ANTIMICROBIAL */}
                      {inspection.antimicrobial && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            ANTIMICROBIAL
                          </span>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#d1fae5',
                            color: '#065f46'
                          }}>
                            ON
                          </span>
                        </div>
                      )}

                      {/* 3. STAIN REMOVING ANTIMICROBIAL */}
                      {inspection.stain_removing_antimicrobial && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            STAIN REMOVING ANTIMICROBIAL
                          </span>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#d1fae5',
                            color: '#065f46'
                          }}>
                            ON
                          </span>
                        </div>
                      )}

                      {/* 4. HOME SANITATION AND FOGGING */}
                      {inspection.home_sanitation_fogging && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            HOME SANITATION AND FOGGING
                          </span>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#d1fae5',
                            color: '#065f46'
                          }}>
                            ON
                          </span>
                        </div>
                      )}

                    </div>

                    {/* 5. DRYING EQUIPMENT SECTION */}
                    {inspection.drying_equipment_enabled && (
                      <div style={{
                        background: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px',
                          paddingBottom: '12px',
                          borderBottom: '2px solid #f59e0b'
                        }}>
                          <h4 style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#92400e',
                            margin: 0,
                            textTransform: 'uppercase'
                          }}>
                            DRYING EQUIPMENT
                          </h4>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#10b981',
                            color: 'white'
                          }}>
                            ENABLED
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                          {/* Commercial Dehumidifier */}
                          {inspection.commercial_dehumidifier_enabled && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: 'white',
                              borderRadius: '6px',
                              border: '1px solid #fbbf24'
                            }}>
                              <div>
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#374151',
                                  marginRight: '8px'
                                }}>
                                  COMMERCIAL DEHUMIDIFIER
                                </span>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: '#dbeafe',
                                  color: '#1e40af'
                                }}>
                                  ON
                                </span>
                              </div>
                              <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1e40af'
                              }}>
                                Qty: {inspection.commercial_dehumidifier_qty ?? 0}
                              </div>
                            </div>
                          )}

                          {/* Air Movers */}
                          {inspection.air_movers_enabled && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: 'white',
                              borderRadius: '6px',
                              border: '1px solid #fbbf24'
                            }}>
                              <div>
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#374151',
                                  marginRight: '8px'
                                }}>
                                  AIR MOVERS
                                </span>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: '#dbeafe',
                                  color: '#1e40af'
                                }}>
                                  ON
                                </span>
                              </div>
                              <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1e40af'
                              }}>
                                Qty: {inspection.air_movers_qty ?? 0}
                              </div>
                            </div>
                          )}

                          {/* RCD Box */}
                          {inspection.rcd_box_enabled && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: 'white',
                              borderRadius: '6px',
                              border: '1px solid #fbbf24'
                            }}>
                              <div>
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#374151',
                                  marginRight: '8px'
                                }}>
                                  RCD BOX
                                </span>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: '#dbeafe',
                                  color: '#1e40af'
                                }}>
                                  ON
                                </span>
                              </div>
                              <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1e40af'
                              }}>
                                Qty: {inspection.rcd_box_qty ?? 0}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* SECTION 8 OF 10: JOB SUMMARY */}
              {(inspection.recommended_dehumidifier ||
                inspection.cause_of_mould ||
                inspection.additional_info_technician ||
                inspection.additional_equipment_comments ||
                inspection.parking_option) && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Section Header - Blue */}
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    padding: '16px 24px',
                    borderBottom: '3px solid #1d4ed8'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      SECTION 8 OF 10
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      JOB SUMMARY
                    </div>
                  </div>

                  {/* Section Content */}
                  <div style={{ padding: '24px' }}>

                    {/* 1 & 2. RECOMMEND DEHUMIDIFIER */}
                    {inspection.recommended_dehumidifier && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          background: '#dbeafe',
                          borderRadius: '8px',
                          border: '2px solid #3b82f6'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#1e40af',
                              marginBottom: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              Recommend Dehumidifier?
                            </div>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1e3a8a',
                              marginTop: '4px'
                            }}>
                              {inspection.recommended_dehumidifier}
                            </div>
                          </div>
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 16px',
                            borderRadius: '9999px',
                            fontSize: '14px',
                            fontWeight: '700',
                            background: '#10b981',
                            color: 'white'
                          }}>
                            YES
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 3. CAUSE OF MOULD */}
                    {inspection.cause_of_mould && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Cause of Mould
                        </div>
                        <div style={{
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          padding: '12px',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          color: '#374151'
                        }}>
                          {inspection.cause_of_mould}
                        </div>
                      </div>
                    )}

                    {/* 4. ADDITIONAL INFORMATION FOR TECHNICIAN */}
                    {inspection.additional_info_technician && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Additional Information for Technician
                        </div>
                        <div style={{
                          background: '#fef3c7',
                          border: '1px solid #fbbf24',
                          borderLeft: '4px solid #f59e0b',
                          padding: '12px',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          color: '#78350f'
                        }}>
                          {inspection.additional_info_technician}
                        </div>
                      </div>
                    )}

                    {/* 5. ADDITIONAL EQUIPMENT COMMENTS */}
                    {inspection.additional_equipment_comments && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Additional Equipment Comments for Technicians
                        </div>
                        <div style={{
                          background: '#fef3c7',
                          border: '1px solid #fbbf24',
                          borderLeft: '4px solid #f59e0b',
                          padding: '12px',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          color: '#78350f'
                        }}>
                          {inspection.additional_equipment_comments}
                        </div>
                      </div>
                    )}

                    {/* 6. PARKING OPTIONS */}
                    {inspection.parking_option && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Parking Options
                        </span>
                        <span style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#111827'
                        }}>
                          {inspection.parking_option}
                        </span>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* SECTION 9 OF 10: COST ESTIMATE */}
              {(inspection.labor_cost_ex_gst || inspection.equipment_cost_ex_gst || inspection.total_inc_gst) && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Section Header - Green */}
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    padding: '16px 24px',
                    borderBottom: '3px solid #047857'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      SECTION 9 OF 10
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      COST ESTIMATE
                    </div>
                  </div>

                  {/* Section Content */}
                  <div style={{ padding: '24px' }}>

                    {/* LABOUR SECTION - Tier Pricing */}
                    {(() => {
                      const totalHours = (inspection.no_demolition_hours ?? 0) + (inspection.demolition_hours ?? 0) + (inspection.subfloor_hours ?? 0);
                      const hasLabour = totalHours > 0 || (inspection.labor_cost_ex_gst ?? 0) > 0;

                      if (!hasLabour) return null;

                      // Calculate costs using tier pricing
                      const estimate = calculateCostEstimate({
                        nonDemoHours: inspection.no_demolition_hours ?? 0,
                        demolitionHours: inspection.demolition_hours ?? 0,
                        subfloorHours: inspection.subfloor_hours ?? 0,
                        equipmentCost: inspection.equipment_cost_ex_gst ?? 0,
                      });

                      return (
                        <div style={{ marginBottom: '24px' }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#111827',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            paddingBottom: '8px',
                            borderBottom: '2px solid #3b82f6'
                          }}>
                            Labour Breakdown (Tier Pricing)
                          </div>

                          {/* Labour Table */}
                          <div style={{
                            background: '#f9fafb',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '12px'
                          }}>
                            {/* Header Row */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr',
                              gap: '8px',
                              padding: '12px',
                              background: '#e5e7eb',
                              fontWeight: '600',
                              fontSize: '12px',
                              color: '#374151',
                              textTransform: 'uppercase'
                            }}>
                              <div>Type</div>
                              <div style={{ textAlign: 'center' }}>Hours</div>
                              <div style={{ textAlign: 'right' }}>2h Rate</div>
                              <div style={{ textAlign: 'right' }}>8h Rate</div>
                              <div style={{ textAlign: 'right' }}>Cost</div>
                            </div>

                            {/* Non-Demolition Row */}
                            {(inspection.no_demolition_hours ?? 0) > 0 && (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr',
                                gap: '8px',
                                padding: '12px',
                                borderBottom: '1px solid #e5e7eb',
                                alignItems: 'center'
                              }}>
                                <div style={{ fontWeight: '500', color: '#374151' }}>Non-Demolition</div>
                                <div style={{ textAlign: 'center', color: '#6b7280' }}>{inspection.no_demolition_hours}h</div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>${LABOUR_RATES.nonDemo.tier2h.toFixed(0)}</div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>${LABOUR_RATES.nonDemo.tier8h.toFixed(0)}</div>
                                <div style={{ textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                                  {formatCurrency(estimate.nonDemoCost)}
                                </div>
                              </div>
                            )}

                            {/* Demolition Row */}
                            {(inspection.demolition_hours ?? 0) > 0 && (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr',
                                gap: '8px',
                                padding: '12px',
                                borderBottom: '1px solid #e5e7eb',
                                alignItems: 'center'
                              }}>
                                <div style={{ fontWeight: '500', color: '#374151' }}>Demolition</div>
                                <div style={{ textAlign: 'center', color: '#6b7280' }}>{inspection.demolition_hours}h</div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>${LABOUR_RATES.demolition.tier2h.toFixed(0)}</div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>${LABOUR_RATES.demolition.tier8h.toFixed(0)}</div>
                                <div style={{ textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                                  {formatCurrency(estimate.demolitionCost)}
                                </div>
                              </div>
                            )}

                            {/* Subfloor Row */}
                            {(inspection.subfloor_hours ?? 0) > 0 && (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr',
                                gap: '8px',
                                padding: '12px',
                                borderBottom: '1px solid #e5e7eb',
                                alignItems: 'center'
                              }}>
                                <div style={{ fontWeight: '500', color: '#374151' }}>Subfloor</div>
                                <div style={{ textAlign: 'center', color: '#6b7280' }}>{inspection.subfloor_hours}h</div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>${LABOUR_RATES.subfloor.tier2h.toFixed(0)}</div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>${LABOUR_RATES.subfloor.tier8h.toFixed(0)}</div>
                                <div style={{ textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                                  {formatCurrency(estimate.subfloorCost)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Discount Info */}
                          {estimate.discountPercent > 0 && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: '#fef3c7',
                              borderRadius: '6px',
                              marginBottom: '12px'
                            }}>
                              <div>
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#92400e'
                                }}>
                                  Multi-Day Discount ({(estimate.discountPercent * 100).toFixed(2)}%)
                                </span>
                                <div style={{
                                  fontSize: '12px',
                                  color: '#b45309',
                                  marginTop: '2px'
                                }}>
                                  {estimate.discountTierDescription}
                                </div>
                              </div>
                              <span style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                color: '#b45309'
                              }}>
                                -{formatCurrency(estimate.discountAmount)}
                              </span>
                            </div>
                          )}

                          {/* Labour subtotal (after discount) */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            background: '#dbeafe',
                            borderRadius: '6px'
                          }}>
                            <div>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: '#1e40af'
                              }}>
                                Labour Total {estimate.discountPercent > 0 ? '(After Discount)' : ''}
                              </span>
                              <div style={{
                                fontSize: '12px',
                                color: '#3b82f6',
                                marginTop: '2px'
                              }}>
                                {totalHours} total hours
                              </div>
                            </div>
                            <span style={{
                              fontSize: '18px',
                              fontWeight: '700',
                              color: '#1e40af'
                            }}>
                              {formatCurrency(estimate.labourAfterDiscount)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* EQUIPMENT SECTION - Direct Cost Entry */}
                    {(inspection.equipment_cost_ex_gst ?? 0) > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#111827',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          paddingBottom: '8px',
                          borderBottom: '2px solid #8b5cf6'
                        }}>
                          Equipment Cost
                        </div>

                        {/* Equipment Total */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          background: '#ede9fe',
                          borderRadius: '6px'
                        }}>
                          <div>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: '700',
                              color: '#6d28d9'
                            }}>
                              Equipment Total (Ex GST)
                            </span>
                            <div style={{
                              fontSize: '12px',
                              color: '#7c3aed',
                              marginTop: '2px'
                            }}>
                              Dehumidifiers, air movers, RCD boxes, etc.
                            </div>
                          </div>
                          <span style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#6d28d9'
                          }}>
                            {formatCurrency(inspection.equipment_cost_ex_gst)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* FINANCIAL TOTALS */}
                    <div style={{
                      background: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      padding: '20px',
                      marginTop: '24px'
                    }}>

                      {/* Subtotal (Ex GST) */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid #d1fae5'
                      }}>
                        <span style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#065f46'
                        }}>
                          Subtotal (Ex GST)
                        </span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#047857'
                        }}>
                          {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(inspection.subtotal_ex_gst || 0)}
                        </span>
                      </div>

                      {/* GST (10%) */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '2px solid #10b981'
                      }}>
                        <span style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#065f46'
                        }}>
                          GST (10%)
                        </span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#047857'
                        }}>
                          {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(inspection.gst_amount || 0)}
                        </span>
                      </div>

                      {/* TOTAL (Inc GST) */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 0 0 0'
                      }}>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#064e3b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          TOTAL (Inc GST)
                        </span>
                        <span style={{
                          fontSize: '28px',
                          fontWeight: '800',
                          color: '#059669'
                        }}>
                          {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(inspection.total_inc_gst || 0)}
                        </span>
                      </div>

                    </div>

                  </div>
                </div>
              )}

              {/* SECTION 10 OF 10: AI JOB SUMMARY */}
              {inspection.ai_summary_text && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Section Header - Purple */}
                  <div style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    padding: '16px 24px',
                    borderBottom: '3px solid #6b21a8'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      SECTION 10 OF 10
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>🤖</span>
                      <span>AI JOB SUMMARY</span>
                    </div>
                  </div>

                  {/* Section Content */}
                  <div style={{ padding: '24px' }}>

                    {/* AI Generated Summary */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                        border: '2px solid #e9d5ff',
                        borderRadius: '12px',
                        padding: '24px',
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: '#374151',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {inspection.ai_summary_text}
                      </div>

                      {/* Generation timestamp */}
                      {inspection.ai_summary_generated_at && (
                        <div style={{
                          marginTop: '12px',
                          fontSize: '13px',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>🤖</span>
                          <span>
                            Generated {new Date(inspection.ai_summary_generated_at).toLocaleString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* PDF Sections (if they exist) */}
                    {(inspection.what_we_found_text || inspection.what_we_will_do_text || inspection.what_you_get_text) && (
                      <div style={{
                        display: 'grid',
                        gap: '20px',
                        marginTop: '24px'
                      }}>

                        {/* What We Found */}
                        {inspection.what_we_found_text && (
                          <div>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: '#7c3aed',
                              marginBottom: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span>🔍</span>
                              <span>What We Found</span>
                            </div>
                            <div style={{
                              background: '#fef3c7',
                              border: '2px solid #fbbf24',
                              borderLeft: '4px solid #f59e0b',
                              borderRadius: '8px',
                              padding: '16px',
                              fontSize: '14px',
                              lineHeight: '1.7',
                              color: '#78350f',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {inspection.what_we_found_text}
                            </div>
                          </div>
                        )}

                        {/* What We Will Do */}
                        {inspection.what_we_will_do_text && (
                          <div>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: '#7c3aed',
                              marginBottom: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span>🛠️</span>
                              <span>What We Will Do</span>
                            </div>
                            <div style={{
                              background: '#dbeafe',
                              border: '2px solid #3b82f6',
                              borderLeft: '4px solid #2563eb',
                              borderRadius: '8px',
                              padding: '16px',
                              fontSize: '14px',
                              lineHeight: '1.7',
                              color: '#1e3a8a',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {inspection.what_we_will_do_text}
                            </div>
                          </div>
                        )}

                        {/* What You Get */}
                        {inspection.what_you_get_text && (
                          <div>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: '#7c3aed',
                              marginBottom: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span>✨</span>
                              <span>What You Get</span>
                            </div>
                            <div style={{
                              background: '#d1fae5',
                              border: '2px solid #10b981',
                              borderLeft: '4px solid #059669',
                              borderRadius: '8px',
                              padding: '16px',
                              fontSize: '14px',
                              lineHeight: '1.7',
                              color: '#065f46',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {inspection.what_you_get_text}
                            </div>
                          </div>
                        )}

                      </div>
                    )}

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

      {/* Schedule Inspection Modal - NEW Smart Booking Modal */}
      {lead && (
        <BookInspectionModal
          open={showScheduleModal}
          onOpenChange={(open) => {
            setShowScheduleModal(open);
            if (!open) {
              handleBookingSuccess();
            }
          }}
          leadId={lead.id}
          leadNumber={''}
          customerName={lead.name || 'Unknown'}
          propertyAddress={`${lead.property || ''}, ${lead.suburb || ''} ${lead.state || ''} ${lead.postcode || ''}`}
          propertySuburb={lead.suburb || ''}
        />
      )}
    </div>
  );
};

export default ClientDetail;
