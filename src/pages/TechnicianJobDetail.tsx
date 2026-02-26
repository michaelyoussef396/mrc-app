import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TechnicianBottomNav } from '@/components/technician';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookInspectionModal } from '@/components/leads/BookInspectionModal';
import { useLeadUpdate } from '@/hooks/useLeadUpdate';
import { leadSourceOptions } from '@/lib/leadUtils';
import { AddressAutocomplete, type AddressValue } from '@/components/booking/AddressAutocomplete';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Clock,
  Globe, ExternalLink, StickyNote, CheckCircle2,
  Edit, X, Save, RefreshCw, Navigation,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface LeadData {
  id: string;
  lead_number: string | null;
  full_name: string;
  phone: string;
  email: string;
  property_address_street: string;
  property_address_suburb: string;
  property_address_state: string;
  property_address_postcode: string;
  property_lat: number | null;
  property_lng: number | null;
  lead_source: string | null;
  lead_source_other: string | null;
  issue_description: string | null;
  notes: string | null;
  internal_notes: string | null;
  urgency: string | null;
  property_type: string | null;
  access_instructions: string | null;
  status: string;
  created_at: string;
  inspection_scheduled_date: string | null;
  scheduled_time: string | null;
  assigned_to: string | null;
}

interface BookingData {
  id: string;
  start_datetime: string;
  end_datetime: string;
  description: string | null;
  inspection_id: string | null;
}

interface InspectionData {
  id: string;
  pdf_url: string | null;
  report_generated: boolean | null;
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TechnicianJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Standalone notes save
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Inline edit state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLeadSource, setEditLeadSource] = useState('');
  const [editAddress, setEditAddress] = useState<AddressValue>({
    street: '', suburb: '', state: '', postcode: '', fullAddress: '',
  });

  const { updateLead, isUpdating } = useLeadUpdate(id || '');

  // ── Data Fetching ──

  const fetchJobData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);

      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (leadError) throw leadError;
      setLead(leadData);

      const { data: bookingData, error: bookingError } = await supabase
        .from('calendar_bookings')
        .select('id, start_datetime, end_datetime, description, inspection_id')
        .eq('lead_id', id)
        .order('start_datetime', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!bookingError) setBooking(bookingData);

      const { data: inspectionData } = await supabase
        .from('inspections')
        .select('id, pdf_url, report_generated')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inspectionData) setInspection(inspectionData);
    } catch (err: unknown) {
      console.error('Error fetching job details:', err);
      toast({
        title: 'Error',
        description: 'Failed to load job details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [id]);

  // Sync edit state when lead loads/changes
  useEffect(() => {
    if (!lead) return;
    setNotesValue(lead.internal_notes || '');
    resetEditState();
  }, [lead?.id, lead?.internal_notes]);

  // ── Helpers ──

  const resetEditState = () => {
    if (!lead) return;
    setEditName(lead.full_name || '');
    setEditPhone(lead.phone || '');
    setEditEmail(lead.email || '');
    setEditDescription(lead.issue_description || '');
    setEditLeadSource(lead.lead_source || '');
    setEditAddress({
      street: lead.property_address_street || '',
      suburb: lead.property_address_suburb || '',
      state: lead.property_address_state || '',
      postcode: lead.property_address_postcode || '',
      fullAddress: [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(', '),
      lat: lead.property_lat ?? undefined,
      lng: lead.property_lng ?? undefined,
    });
    setIsEditing(false);
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      resetEditState();
    } else {
      setIsEditing(true);
    }
  };

  const handleSaveInline = async () => {
    if (!lead) return;
    const payload: Record<string, string | number | null> = {};
    const original: Record<string, unknown> = {
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      issue_description: lead.issue_description,
      lead_source: lead.lead_source,
      property_address_street: lead.property_address_street,
      property_address_suburb: lead.property_address_suburb,
      property_address_state: lead.property_address_state,
      property_address_postcode: lead.property_address_postcode,
      property_lat: lead.property_lat,
      property_lng: lead.property_lng,
    };

    if (editName !== (lead.full_name || '')) payload.full_name = editName;
    if (editPhone !== (lead.phone || '')) payload.phone = editPhone;
    if (editEmail !== (lead.email || '')) payload.email = editEmail;
    if (editDescription !== (lead.issue_description || '')) payload.issue_description = editDescription || null;
    if (editLeadSource !== (lead.lead_source || '')) payload.lead_source = editLeadSource || null;

    // Address fields
    if (editAddress.street !== (lead.property_address_street || '')) payload.property_address_street = editAddress.street || null;
    if (editAddress.suburb !== (lead.property_address_suburb || '')) payload.property_address_suburb = editAddress.suburb || null;
    if (editAddress.state !== (lead.property_address_state || '')) payload.property_address_state = editAddress.state || null;
    if (editAddress.postcode !== (lead.property_address_postcode || '')) payload.property_address_postcode = editAddress.postcode || null;
    if (editAddress.lat !== (lead.property_lat ?? undefined)) payload.property_lat = editAddress.lat ?? null;
    if (editAddress.lng !== (lead.property_lng ?? undefined)) payload.property_lng = editAddress.lng ?? null;

    const success = await updateLead(payload, original);
    if (success) {
      setIsEditing(false);
      fetchJobData();
    }
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    if (notesValue === (lead.internal_notes || '')) return;
    setIsSavingNotes(true);
    const original = { internal_notes: lead.internal_notes };
    const payload = { internal_notes: notesValue || null };
    const success = await updateLead(payload, original);
    if (success) fetchJobData();
    setIsSavingNotes(false);
  };

  const handleBookingSuccess = () => {
    fetchJobData();
  };

  const handleStartInspection = () => {
    navigate(`/technician/inspection?leadId=${id}`);
  };

  const handleCall = () => {
    if (lead?.phone) window.location.href = `tel:${lead.phone.replace(/\s/g, '')}`;
  };

  const handleDirections = () => {
    if (!lead) return;
    const address = [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(', ');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  };

  // ── Derived values ──

  const fullAddress = lead
    ? [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(', ')
    : '';

  const mapsUrl = lead
    ? lead.property_lat && lead.property_lng
      ? `https://www.google.com/maps?q=${lead.property_lat},${lead.property_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : '#';

  const leadIdShort = lead
    ? lead.lead_number
      ? `#${lead.lead_number}`
      : `#MRC-${lead.id.substring(lead.id.length - 4).toUpperCase()}`
    : '';

  const createdDate = lead?.created_at
    ? new Date(lead.created_at).toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '-';

  const createdTime = lead?.created_at
    ? new Date(lead.created_at).toLocaleTimeString('en-AU', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Melbourne',
      })
    : '-';

  const elapsedText = lead?.created_at
    ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })
    : null;

  const sourceLabel = lead
    ? lead.lead_source === 'other' && lead.lead_source_other
      ? lead.lead_source_other
      : lead.lead_source || 'Website Form'
    : '';

  const isScheduled = lead?.status === 'inspection_waiting';

  const scheduledDateDisplay = lead?.inspection_scheduled_date
    ? new Date(lead.inspection_scheduled_date + 'T00:00:00').toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const scheduledTimeDisplay = lead?.scheduled_time
    ? (() => {
        const [h, m] = lead.scheduled_time.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
      })()
    : null;

  // ── Loading State ──

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading job info...</p>
        </div>
      </div>
    );
  }

  // ── Not Found State ──

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-6">This lead may have been deleted or moved.</p>
          <Button onClick={() => navigate('/technician')} className="h-12 px-6">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="px-4">
          <div className="flex items-center h-14">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ minWidth: '48px', minHeight: '48px' }}
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>
          <div className="pb-4 pt-1">
            <h1 className="text-xl font-bold text-foreground">{lead.full_name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              {isScheduled ? (
                <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">
                  Inspection Scheduled
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                  New Lead
                </Badge>
              )}
              <span className="text-xs font-mono text-muted-foreground">{leadIdShort}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ───── Main Content ───── */}
      <main className="px-4 py-4 pb-48 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-16 flex-col gap-1 border-slate-200 bg-white shadow-sm"
            onClick={handleCall}
          >
            <Phone className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold">Call</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1 border-slate-200 bg-white shadow-sm"
            onClick={handleDirections}
          >
            <Navigation className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold">Directions</span>
          </Button>
        </div>

        {/* ── Contact Information Card ── */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contact Information
              </span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                <a href={`tel:${lead.phone}`} className="flex items-center gap-4 group">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                    <Phone className="h-4 w-4 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.phone}</p>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                  </div>
                </a>
                <a href={`mailto:${lead.email}`} className="flex items-center gap-4 group">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                    <Mail className="h-4 w-4 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.email}</p>
                    <p className="text-xs text-muted-foreground">Email</p>
                  </div>
                </a>
              </>
            )}
          </div>
        </div>

        {/* ── Lead Source Card ── */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Lead Source
              </span>
            </div>
          </div>
          <div className="p-5">
            {isEditing ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Lead Source</label>
                <select
                  value={editLeadSource}
                  onChange={(e) => setEditLeadSource(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg text-sm font-medium border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer bg-white"
                >
                  <option value="">Select lead source...</option>
                  {leadSourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{sourceLabel}</p>
                    <p className="text-xs text-muted-foreground">Lead source channel</p>
                  </div>
                </div>
                {lead.urgency && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Urgency</span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {lead.urgency}
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Created On Card ── */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Created On
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{createdDate}</p>
                <p className="text-xs text-muted-foreground">{createdTime}</p>
              </div>
            </div>
            {elapsedText && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Elapsed</span>
                  <span className="text-xs font-medium text-foreground">{elapsedText}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Inquiry Details Card ── */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50/50">
            <h2 className="text-sm font-semibold text-foreground">Inquiry Details</h2>
          </div>
          <div className="p-5 space-y-6">
            {/* Property Address */}
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Property Address
              </span>
              {isEditing ? (
                <div className="mt-3">
                  <AddressAutocomplete
                    label=""
                    value={editAddress}
                    onChange={setEditAddress}
                    placeholder="Search for an address..."
                  />
                </div>
              ) : (
                <>
                  <div className="mt-3 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{fullAddress}</p>
                    </div>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors group"
                  >
                    <MapPin className="h-4 w-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
                      View on Google Maps
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </a>
                </>
              )}
            </div>

            {/* Issue Description */}
            {isEditing ? (
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Issue Description
                </span>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="mt-3 w-full p-4 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            ) : lead.issue_description ? (
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Issue Description
                </span>
                <div className="mt-3 bg-slate-50 rounded-lg p-4 border">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {lead.issue_description}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Access Instructions - prominent for technicians */}
            {!isEditing && (
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Access Instructions
                </span>
                <div className="mt-3 bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-sm text-foreground font-medium italic">
                    {lead.access_instructions || 'No specific instructions provided.'}
                  </p>
                </div>
              </div>
            )}

            {/* Save / Cancel inline edit footer */}
            {isEditing && (
              <div className="pt-4 border-t flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-slate-300"
                  onClick={resetEditState}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSaveInline}
                  disabled={isUpdating}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Internal Notes Card (always editable) ── */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Internal Notes
                </span>
              </div>
              {notesValue !== (lead.internal_notes || '') && (
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                >
                  <Save className="h-3 w-3 mr-1.5" />
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              )}
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={4}
              placeholder="Add internal notes..."
              className="w-full p-4 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* ── Scheduled Inspection Card ── */}
        {isScheduled && (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-green-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium uppercase tracking-wider text-green-700">
                  Scheduled Inspection
                </span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {scheduledDateDisplay && (
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{scheduledDateDisplay}</p>
                    <p className="text-xs text-muted-foreground">Inspection Date</p>
                  </div>
                </div>
              )}
              {scheduledTimeDisplay && (
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{scheduledTimeDisplay}</p>
                    <p className="text-xs text-muted-foreground">Inspection Time</p>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full h-12 border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => setShowScheduleModal(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reschedule Inspection
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ───── Mobile Fixed Bottom Bar ───── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 px-4 py-3 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 flex-shrink-0 border-slate-300 text-slate-600"
                onClick={resetEditState}
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSaveInline}
                disabled={isUpdating}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 flex-shrink-0 border-slate-300 text-slate-600"
                onClick={handleToggleEdit}
              >
                <Edit className="h-5 w-5" />
              </Button>
              {isScheduled && (
                <Button
                  variant="outline"
                  className="h-12 border-slate-300 text-slate-600"
                  onClick={() => setShowScheduleModal(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
              )}
              {inspection?.pdf_url ? (
                <Button
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  onClick={() => navigate(`/inspection/${inspection.id}/report`)}
                >
                  View Report
                </Button>
              ) : inspection ? (
                <Button
                  className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                  onClick={handleStartInspection}
                >
                  Continue Inspection
                </Button>
              ) : (
                <Button
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  onClick={handleStartInspection}
                >
                  Start Inspection
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ───── Book Inspection Modal ───── */}
      <BookInspectionModal
        open={showScheduleModal}
        onOpenChange={(open) => {
          setShowScheduleModal(open);
          if (!open) handleBookingSuccess();
        }}
        leadId={lead.id}
        leadNumber={lead.lead_number || ''}
        customerName={lead.full_name || 'Unknown'}
        propertyAddress={fullAddress}
        propertySuburb={lead.property_address_suburb || ''}
      />

      {/* Bottom Nav */}
      <TechnicianBottomNav />
    </div>
  );
}
