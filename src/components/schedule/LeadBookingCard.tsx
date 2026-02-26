import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LeadToSchedule } from '@/hooks/useLeadsToSchedule';
import { bookInspection, TIME_SLOTS, formatTimeForDisplay } from '@/lib/bookingService';
import { useBookingValidation, DateRecommendation } from '@/hooks/useBookingValidation';
import { useLoadGoogleMaps, useAddressAutocomplete } from '@/hooks/useGoogleMaps';
import { calculatePropertyZone, leadSourceOptions } from '@/lib/leadUtils';
import { useLeadUpdate } from '@/hooks/useLeadUpdate';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface Technician {
  id: string;
  name: string;
  color: string;
}

interface LeadBookingCardProps {
  lead: LeadToSchedule;
  technicians: Technician[];
  isExpanded: boolean;
  onToggle: () => void;
}

interface ValidatedAddress {
  street: string;
  suburb: string;
  postcode: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

// Medal icons for recommendation ranking
const MEDAL_ICONS = ['🥇', '🥈', '🥉'] as const;

const RATING_LABELS: Record<string, string> = {
  best: 'High Availability',
  good: 'Good Availability',
  available: 'Available',
  unknown: 'Available',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadBookingCard({
  lead,
  technicians,
  isExpanded,
  onToggle,
}: LeadBookingCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getRecommendedDates } = useBookingValidation();

  // Address validation state
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [validatedAddress, setValidatedAddress] = useState<ValidatedAddress | null>(null);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [addressSearchValue, setAddressSearchValue] = useState('');
  const [showPredictions, setShowPredictions] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [postcodeWarning, setPostcodeWarning] = useState<string | null>(null);

  // Google Maps
  const addressInputRef = useRef<HTMLInputElement>(null);
  const { isLoaded: mapsLoaded } = useLoadGoogleMaps();
  const { predictions, getPlacePredictions, getPlaceDetails, clearPredictions } = useAddressAutocomplete(addressInputRef);

  // Form state — pre-populate from customer's preferred date/time
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedDate, setSelectedDate] = useState<string>(lead.preferredDate || '');
  const [selectedTime, setSelectedTime] = useState<string>(lead.preferredTime || '');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lead info edit state
  const { updateLead, isUpdating: isLeadSaving } = useLeadUpdate(lead.id);
  const [editName, setEditName] = useState(lead.fullName);
  const [editPhone, setEditPhone] = useState(lead.phone);
  const [editEmail, setEditEmail] = useState(lead.email);
  const [editDescription, setEditDescription] = useState(lead.issueDescription || '');
  const [editLeadSource, setEditLeadSource] = useState(lead.leadSource || '');

  const hasLeadChanges =
    editName !== lead.fullName ||
    editPhone !== lead.phone ||
    editEmail !== lead.email ||
    editDescription !== (lead.issueDescription || '') ||
    editLeadSource !== (lead.leadSource || '');

  const handleSaveLeadInfo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload: Record<string, string | null> = {};
    const original: Record<string, unknown> = {
      full_name: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      issue_description: lead.issueDescription,
      lead_source: lead.leadSource,
    };

    if (editName !== lead.fullName) payload.full_name = editName;
    if (editPhone !== lead.phone) payload.phone = editPhone;
    if (editEmail !== lead.email) payload.email = editEmail;
    if (editDescription !== (lead.issueDescription || '')) payload.issue_description = editDescription || null;
    if (editLeadSource !== (lead.leadSource || '')) payload.lead_source = editLeadSource || null;

    const success = await updateLead(payload, original);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['leads-to-schedule'] });
    }
  };

  // Recommendation state
  const [recommendations, setRecommendations] = useState<DateRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [selectedRecDate, setSelectedRecDate] = useState<string>('');
  const [techInfo, setTechInfo] = useState<{ name: string; home: string | null; missingAddress: boolean } | null>(null);

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // ---- Address validation handlers ----

  const handleAddressSearchChange = useCallback((value: string) => {
    setAddressSearchValue(value);
    setPostcodeWarning(null);
    if (mapsLoaded && value.length >= 3) {
      getPlacePredictions(value);
      setShowPredictions(true);
    } else {
      setShowPredictions(false);
    }
  }, [mapsLoaded, getPlacePredictions]);

  const handleSelectPrediction = useCallback(async (placeId: string, description: string) => {
    setShowPredictions(false);
    clearPredictions();

    const details = await getPlaceDetails(placeId);
    if (details) {
      const streetAddress = details.street_number && details.street_name
        ? `${details.street_number} ${details.street_name}`
        : details.formatted_address.split(',')[0];

      const addr: ValidatedAddress = {
        street: streetAddress,
        suburb: details.suburb || '',
        postcode: details.postcode || '',
        state: details.state || 'VIC',
        lat: details.lat || null,
        lng: details.lng || null,
      };

      setValidatedAddress(addr);
      setAddressSearchValue(streetAddress);

      // Postcode validation: should start with 3 for VIC
      if (addr.postcode && !addr.postcode.startsWith('3')) {
        setPostcodeWarning("Postcode doesn't match Victoria — please verify");
      } else {
        setPostcodeWarning(null);
      }
    } else {
      setAddressSearchValue(description.split(',')[0]);
    }
  }, [getPlaceDetails, clearPredictions]);

  const saveValidatedAddress = async (address: ValidatedAddress) => {
    setAddressSaving(true);
    try {
      const zone = calculatePropertyZone(address.suburb);
      const updateData: Record<string, unknown> = {
        property_address_street: address.street,
        property_address_suburb: address.suburb,
        property_address_postcode: address.postcode,
        property_zone: zone,
      };

      if (address.lat != null && address.lng != null) {
        updateData.property_lat = address.lat;
        updateData.property_lng = address.lng;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      setAddressConfirmed(true);
      toast.success('Address confirmed');
    } catch (err) {
      console.error('[AddressValidation] Save error:', err);
      toast.error('Failed to save address. Please try again.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleConfirmNewAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!validatedAddress) {
      toast.error('Please select an address from the search results');
      return;
    }
    await saveValidatedAddress(validatedAddress);
  };

  const handleAddressIsCorrect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use the existing address as-is
    setAddressConfirmed(true);
    toast.success('Address confirmed');
  };

  // ---- Scheduling handlers ----

  const handleViewLead = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/leads/${lead.id}`);
  };

  const handleTechnicianSelect = async (techId: string) => {
    setSelectedTechnician(techId);
    setSelectedDate('');
    setSelectedTime('');
    setRecommendations([]);
    setSelectedRecDate('');
    setTechInfo(null);

    if (!techId || !lead.propertyAddress) return;

    setRecsLoading(true);
    try {
      const result = await getRecommendedDates({
        technicianId: techId,
        destinationAddress: lead.propertyAddress,
        destinationSuburb: lead.suburb,
        daysAhead: 14,
        durationMinutes,
        preferredDate: lead.preferredDate || undefined,
        preferredTime: lead.preferredTime || undefined,
      });

      if (result) {
        setRecommendations(result.recommendations.slice(0, 3));
        setTechInfo({
          name: result.technician_name,
          home: result.technician_home,
          missingAddress: result.has_missing_address_warning || false,
        });
      }
    } catch {
      // Silently fail — user can still pick manually
    } finally {
      setRecsLoading(false);
    }
  };

  const handleRecommendationClick = (rec: DateRecommendation) => {
    setSelectedDate(rec.date);
    setSelectedRecDate(rec.date);
    setSelectedTime(rec.available_slots?.[0] || '');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedRecDate('');
    setSelectedTime('');
  };

  const getTimeSlots = () => {
    if (selectedRecDate) {
      const rec = recommendations.find((r) => r.date === selectedRecDate);
      if (rec?.available_slots?.length) {
        return TIME_SLOTS.filter((slot) => rec.available_slots.includes(slot.time));
      }
    }
    return TIME_SLOTS;
  };

  const handleBookInspection = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!selectedDate || !selectedTime || !selectedTechnician) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await bookInspection(
        {
          leadId: lead.id,
          customerName: lead.fullName,
          propertyAddress: lead.propertyAddress,
          inspectionDate: selectedDate,
          inspectionTime: selectedTime,
          technicianId: selectedTechnician,
          internalNotes: internalNotes || undefined,
          technicianName: technicians.find(t => t.id === selectedTechnician)?.name,
          durationMinutes,
        },
        queryClient
      );

      if (result.success) {
        toast.success('Inspection booked successfully!');
        setDurationMinutes(60);
        setSelectedDate('');
        setSelectedTime('');
        setSelectedTechnician('');
        setInternalNotes('');
        setRecommendations([]);
        setSelectedRecDate('');
        onToggle();
      } else {
        toast.error(result.error || 'Failed to book inspection');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canBook = selectedDate && selectedTime && selectedTechnician && !isSubmitting;
  const availableSlots = getTimeSlots();

  // Build display address from lead data
  const displayAddress = [lead.propertyAddress].filter(Boolean).join(', ');
  const hasAddress = Boolean(lead.propertyAddress && lead.suburb);

  return (
    <div
      className="bg-white rounded-xl shadow-sm overflow-hidden transition-all"
      style={{
        border: isExpanded ? '2px solid #007AFF' : '1px solid #e5e5e5',
        boxShadow: isExpanded ? '0 4px 16px rgba(0, 122, 255, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Collapsed Header */}
      <div
        className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
          isExpanded ? 'bg-[#007AFF]/5' : 'hover:bg-gray-50'
        }`}
        style={{ borderBottom: isExpanded ? '1px solid #e5e5e5' : 'none' }}
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0 pr-2">
          <h4
            className="text-sm font-bold"
            style={{ color: '#1d1d1f' }}
          >
            {lead.fullName}
          </h4>
          <p
            className="text-xs mt-1"
            style={{ color: '#617589' }}
          >
            {lead.suburb}
            {lead.propertyType && ` • ${lead.propertyType}`}
            {lead.timeAgo && (
              <span className="ml-1 opacity-75">• {lead.timeAgo}</span>
            )}
          </p>
          {lead.preferredDate && (
            <p
              className="text-xs mt-1 font-medium"
              style={{ color: '#007AFF' }}
            >
              Prefers {new Date(lead.preferredDate + 'T00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' })}
              {lead.preferredTime && ` at ${formatTimeForDisplay(lead.preferredTime)}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Address status indicator */}
          {isExpanded && (
            <span
              className="material-symbols-outlined text-base"
              style={{ color: addressConfirmed ? '#34C759' : '#FF9500' }}
              title={addressConfirmed ? 'Address confirmed' : 'Address not confirmed'}
            >
              {addressConfirmed ? 'check_circle' : 'warning'}
            </span>
          )}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: isExpanded ? '#007AFF' : '#f0f2f4' }}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: isExpanded ? 'white' : '#617589' }}
            >
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="p-4 space-y-4"
          style={{ backgroundColor: '#fafafa' }}
        >
          {/* STEP 1: Address Validation */}
          <div
            className="p-3 rounded-lg space-y-3"
            style={{
              backgroundColor: addressConfirmed ? 'rgba(52, 199, 89, 0.05)' : 'white',
              border: addressConfirmed ? '1px solid rgba(52, 199, 89, 0.3)' : '2px solid #FF9500',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', color: addressConfirmed ? '#34C759' : '#FF9500' }}
              >
                {addressConfirmed ? 'check_circle' : 'location_on'}
              </span>
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: addressConfirmed ? '#34C759' : '#FF9500' }}
              >
                {addressConfirmed ? 'Address Confirmed' : 'Step 1: Confirm Address'}
              </label>
            </div>

            {/* Current address display */}
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-gray-400 mt-0.5" style={{ fontSize: '16px' }}>
                home
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#1d1d1f' }}>
                  {validatedAddress ? validatedAddress.street : (displayAddress || 'No address on file')}
                </p>
                <p className="text-xs" style={{ color: '#86868b' }}>
                  {validatedAddress
                    ? [validatedAddress.suburb, validatedAddress.state, validatedAddress.postcode].filter(Boolean).join(' ')
                    : lead.suburb}
                </p>
              </div>
            </div>

            {!addressConfirmed && (
              <>
                {/* Action buttons: "Address is correct" + "Search new address" */}
                {!showAddressSearch ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddressIsCorrect}
                      disabled={!hasAddress}
                      className="flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: '#34C759',
                        color: 'white',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                      Address is Correct
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowAddressSearch(true); }}
                      className="flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        color: '#617589',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
                      Update Address
                    </button>
                  </div>
                ) : (
                  /* Google Places autocomplete search */
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        ref={addressInputRef}
                        type="text"
                        value={addressSearchValue}
                        onChange={e => handleAddressSearchChange(e.target.value)}
                        onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                        onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                        placeholder="Search for address..."
                        autoComplete="off"
                        className="w-full rounded-lg h-10 pl-9 pr-4 text-sm border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                        style={{ outline: 'none' }}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '16px' }}>
                        search
                      </span>

                      {/* Predictions dropdown */}
                      {showPredictions && predictions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {predictions.map((prediction) => (
                            <button
                              key={prediction.place_id}
                              type="button"
                              onClick={() => handleSelectPrediction(prediction.place_id, prediction.description)}
                              className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-start gap-2 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <span className="material-symbols-outlined text-gray-400 mt-0.5" style={{ fontSize: '16px' }}>location_on</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: '#1d1d1f' }}>
                                  {prediction.structured_formatting.main_text}
                                </p>
                                <p className="text-xs truncate" style={{ color: '#86868b' }}>
                                  {prediction.structured_formatting.secondary_text}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Postcode warning */}
                    {postcodeWarning && (
                      <div className="flex items-center gap-1.5 px-2">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#FF9500' }}>warning</span>
                        <p className="text-xs" style={{ color: '#FF9500' }}>{postcodeWarning}</p>
                      </div>
                    )}

                    {/* Confirm / Cancel buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmNewAddress}
                        disabled={!validatedAddress || addressSaving}
                        className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#34C759' }}
                      >
                        {addressSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                            Confirm Address
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddressSearch(false);
                          setAddressSearchValue('');
                          setValidatedAddress(null);
                          setPostcodeWarning(null);
                          clearPredictions();
                        }}
                        className="h-10 px-3 rounded-lg text-sm font-medium transition-colors"
                        style={{ color: '#617589', border: '1px solid #e5e5e5', backgroundColor: 'white' }}
                      >
                        Cancel
                      </button>
                    </div>

                    {mapsLoaded && (
                      <p className="text-xs px-1" style={{ color: '#86868b' }}>
                        Powered by Google Places
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Notes from Enquiry (always visible) */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
              style={{ color: '#007AFF' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                notes
              </span>
              Notes from Enquiry
            </label>
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                minHeight: '60px',
              }}
            >
              {lead.issueDescription ? (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#1d1d1f' }}
                >
                  {lead.issueDescription}
                </p>
              ) : (
                <p
                  className="text-sm italic"
                  style={{ color: '#86868b' }}
                >
                  No notes provided
                </p>
              )}
            </div>
          </div>

          {/* Lead Info Quick Edit */}
          <div
            className="p-3 rounded-lg space-y-3"
            style={{ backgroundColor: 'white', border: '1px solid #e5e5e5' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', color: '#007AFF' }}
              >
                edit_note
              </span>
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#007AFF' }}
              >
                Lead Info
              </label>
              {hasLeadChanges && (
                <span
                  className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FF9500', color: 'white' }}
                >
                  Unsaved
                </span>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: '#617589' }}>
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all"
                style={{ backgroundColor: '#fafafa', border: '1px solid #e5e5e5', color: '#1d1d1f' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: '#617589' }}>
                Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all"
                style={{ backgroundColor: '#fafafa', border: '1px solid #e5e5e5', color: '#1d1d1f' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: '#617589' }}>
                Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all"
                style={{ backgroundColor: '#fafafa', border: '1px solid #e5e5e5', color: '#1d1d1f' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Brief Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: '#617589' }}>
                Brief Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#007AFF] outline-none transition-all placeholder:text-gray-400"
                style={{ backgroundColor: '#fafafa', border: '1px solid #e5e5e5', color: '#1d1d1f' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Lead Source */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: '#617589' }}>
                Lead Source
              </label>
              <div className="relative">
                <select
                  value={editLeadSource}
                  onChange={(e) => setEditLeadSource(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all appearance-none cursor-pointer pr-10"
                  style={{ backgroundColor: '#fafafa', border: '1px solid #e5e5e5', color: editLeadSource ? '#1d1d1f' : '#86868b' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Select lead source...</option>
                  {leadSourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: '#617589', fontSize: '20px' }}
                >
                  expand_more
                </span>
              </div>
            </div>

            {/* Save button */}
            {hasLeadChanges && (
              <button
                type="button"
                onClick={handleSaveLeadInfo}
                disabled={isLeadSaving}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#34C759' }}
              >
                {isLeadSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>

          {/* STEP 2: Scheduling (gated by address confirmation) */}
          <div className={`space-y-4 transition-all ${!addressConfirmed ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Lock message when not confirmed */}
            {!addressConfirmed && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 149, 0, 0.08)', border: '1px solid rgba(255, 149, 0, 0.2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#FF9500' }}>lock</span>
                <p className="text-xs font-medium" style={{ color: '#FF9500' }}>
                  Confirm address above to enable scheduling
                </p>
              </div>
            )}

            {/* Est. Duration */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
                style={{ color: '#617589' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  timer
                </span>
                Est. Duration (minutes)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={30}
                max={480}
                step={15}
                value={durationMinutes}
                onChange={(e) => {
                  const newDuration = Number(e.target.value) || 60;
                  setDurationMinutes(newDuration);
                }}
                onBlur={() => {
                  const clamped = Math.max(30, Math.min(480, durationMinutes));
                  if (clamped !== durationMinutes) setDurationMinutes(clamped);
                  if (selectedTechnician && lead.propertyAddress) {
                    setRecommendations([]);
                    setSelectedRecDate('');
                    setSelectedDate('');
                    setSelectedTime('');
                    setRecsLoading(true);
                    getRecommendedDates({
                      technicianId: selectedTechnician,
                      destinationAddress: lead.propertyAddress,
                      destinationSuburb: lead.suburb,
                      daysAhead: 14,
                      durationMinutes: Math.max(30, Math.min(480, durationMinutes)),
                      preferredDate: lead.preferredDate || undefined,
                      preferredTime: lead.preferredTime || undefined,
                    })
                      .then((result) => {
                        if (result) {
                          setRecommendations(result.recommendations.slice(0, 3));
                          setTechInfo({
                            name: result.technician_name,
                            home: result.technician_home,
                            missingAddress: result.has_missing_address_warning || false,
                          });
                        }
                      })
                      .catch(() => {})
                      .finally(() => setRecsLoading(false));
                  }
                }}
                className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  color: '#1d1d1f',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Assign Technician */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#617589' }}
              >
                Assign Technician
              </label>
              <div className="grid grid-cols-2 gap-2">
                {technicians.map((tech) => {
                  const isSelected = selectedTechnician === tech.id;
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTechnicianSelect(tech.id);
                      }}
                      className="h-12 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: isSelected ? tech.color : 'white',
                        border: isSelected ? `2px solid ${tech.color}` : '1px solid #e5e5e5',
                        color: isSelected ? 'white' : '#617589',
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : tech.color,
                          color: 'white',
                        }}
                      >
                        {tech.name[0]}
                      </span>
                      {tech.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recommended Days */}
            {selectedTechnician && (
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
                  style={{ color: '#617589' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    auto_awesome
                  </span>
                  Recommended Days
                </label>

                {/* Technician location info */}
                {techInfo && !recsLoading && (
                  <div
                    className="p-2.5 rounded-lg flex items-start gap-2"
                    style={{
                      backgroundColor: techInfo.missingAddress ? 'rgba(255, 149, 0, 0.08)' : 'rgba(0, 122, 255, 0.06)',
                      border: techInfo.missingAddress ? '1px solid rgba(255, 149, 0, 0.2)' : '1px solid rgba(0, 122, 255, 0.15)',
                    }}
                  >
                    <span
                      className="material-symbols-outlined mt-0.5"
                      style={{ fontSize: '16px', color: techInfo.missingAddress ? '#FF9500' : '#007AFF' }}
                    >
                      {techInfo.missingAddress ? 'warning' : 'home'}
                    </span>
                    <div>
                      <p className="text-xs font-medium" style={{ color: techInfo.missingAddress ? '#FF9500' : '#007AFF' }}>
                        Travelling from: {techInfo.home || 'Address not set'}
                      </p>
                      {recommendations[0]?.travel_from_home_minutes != null && (
                        <p className="text-xs mt-0.5" style={{ color: techInfo.missingAddress ? '#FF9500' : '#617589' }}>
                          ~{recommendations[0].travel_from_home_minutes} min est. travel to property
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {recsLoading ? (
                  <div
                    className="p-4 rounded-lg flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'white', border: '1px solid #e5e5e5' }}
                  >
                    <div className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm" style={{ color: '#617589' }}>
                      Finding best days...
                    </span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {recommendations.map((rec, idx) => {
                      const isSelected = selectedRecDate === rec.date;
                      const medal = MEDAL_ICONS[idx] || '';
                      const travelText = rec.travel_from_home_minutes != null
                        ? `${rec.travel_from_home_minutes} min travel`
                        : '';
                      const slotsText = `${rec.available_slots.length} slot${rec.available_slots.length !== 1 ? 's' : ''}`;
                      const bestTime = rec.available_slots?.[0]
                        ? formatTimeForDisplay(rec.available_slots[0])
                        : null;

                      return (
                        <button
                          key={rec.date}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecommendationClick(rec);
                          }}
                          className="w-full p-3 rounded-lg text-left transition-all"
                          style={{
                            backgroundColor: isSelected ? '#007AFF' : 'white',
                            border: isSelected ? '2px solid #007AFF' : '1px solid #e5e5e5',
                            color: isSelected ? 'white' : '#1d1d1f',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              {medal} {rec.day_name} {rec.display_date}
                              {bestTime && (
                                <span className="font-normal"> at {bestTime}</span>
                              )}
                            </span>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f0f2f4',
                                color: isSelected ? 'white' : '#617589',
                              }}
                            >
                              {RATING_LABELS[rec.rating] || 'Available'}
                            </span>
                          </div>
                          <p
                            className="text-xs mt-1"
                            style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : '#86868b' }}
                          >
                            {[slotsText, travelText].filter(Boolean).join(' · ')}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: '#86868b' }}>
                    No recommendations available — pick any date below.
                  </p>
                )}
              </div>
            )}

            {/* Customer preferred time hint */}
            {lead.preferredDate && (selectedDate === lead.preferredDate) && (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'rgba(0, 122, 255, 0.06)', border: '1px solid rgba(0, 122, 255, 0.15)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#007AFF' }}>person</span>
                <p className="text-xs font-medium" style={{ color: '#007AFF' }}>
                  Customer's preferred time
                </p>
              </div>
            )}

            {/* Inspection Date */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#617589' }}
              >
                Inspection Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={today}
                className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all"
                style={{
                  backgroundColor: 'white',
                  border: selectedDate ? '2px solid #007AFF' : '1px solid #e5e5e5',
                  color: '#1d1d1f',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Time Slot */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#617589' }}
              >
                Time Slot
              </label>
              <div className="relative">
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all appearance-none cursor-pointer pr-10"
                  style={{
                    backgroundColor: 'white',
                    border: selectedTime ? '2px solid #007AFF' : '1px solid #e5e5e5',
                    color: selectedTime ? '#1d1d1f' : '#86868b',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Select time slot...</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.time} value={slot.time}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: '#617589', fontSize: '20px' }}
                >
                  schedule
                </span>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#617589' }}
              >
                Internal Notes (Optional)
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add notes for the technician..."
                rows={2}
                className="w-full p-3 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#007AFF] outline-none transition-all placeholder:text-gray-400"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleViewLead}
                className="flex-1 h-11 flex items-center justify-center rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  color: '#1d1d1f',
                }}
              >
                View Lead
              </button>
              <button
                onClick={handleBookInspection}
                disabled={!canBook}
                className={`flex-1 h-11 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  canBook
                    ? 'hover:brightness-110 shadow-md'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: '#007AFF',
                  color: 'white',
                  boxShadow: canBook ? '0 4px 12px rgba(0, 122, 255, 0.3)' : undefined,
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Booking...
                  </>
                ) : (
                  'Book Inspection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadBookingCard;
