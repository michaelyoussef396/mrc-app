import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLoadGoogleMaps, useAddressAutocomplete } from '@/hooks/useGoogleMaps';
import { sendSlackNotification } from '@/lib/api/notifications';
import { findDuplicateLead, type DuplicateLeadMatch } from '@/lib/api/leadDuplicates';
import { calculatePropertyZone, leadSourceOptions } from '@/lib/leadUtils';
import { buildStreetLine, fallbackStreetLine } from '@/lib/utils/addressFormat';
import { leadSourceSchema } from '@/lib/validators/lead-creation.schemas';
import {
  toNullableField,
  validateCreateLeadForm,
  type CreateLeadFormErrors,
  type CreateLeadFormValues,
} from '@/lib/validators/create-lead-form';
import { captureBusinessError } from '@/lib/sentry';
import { TimePicker } from '@/components/ui/TimePicker';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Search,
  X,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface CreateNewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadId: string) => void;
}

interface LeadFormData extends CreateLeadFormValues {
  lat: number | null;
  lng: number | null;
}

interface FormErrors extends CreateLeadFormErrors {
  general?: string;
}

type ModalState = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

// ============================================================================
// CONSTANTS
// ============================================================================

const initialFormData: LeadFormData = {
  fullName: '',
  phone: '',
  email: '',
  propertyAddress: '',
  suburb: '',
  postcode: '',
  lat: null,
  lng: null,
  preferredDate: '',
  preferredTime: '',
  issueDescription: '',
  source: '',
};

const OPENING_TIME = '07:00';
const CLOSING_TIME = '19:00';

// ============================================================================
// HELPERS
// ============================================================================

function formatAustralianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('04') || digits.startsWith('614')) {
    const clean = digits.startsWith('614') ? '0' + digits.slice(2) : digits;
    if (clean.length <= 4) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 10)}`;
  }

  if (digits.startsWith('0') && digits.length > 1) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  }

  return value;
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, 1000);
}

// Rate limiting
const RATE_LIMIT_KEY = 'create_lead_attempts';
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(): { allowed: boolean; resetInSeconds: number } {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  let attempts: { timestamp: number }[] = stored ? JSON.parse(stored) : [];
  attempts = attempts.filter(e => now - e.timestamp < RATE_LIMIT_WINDOW);

  const oldestAttempt = attempts[0];
  return {
    allowed: attempts.length < RATE_LIMIT_MAX,
    resetInSeconds: oldestAttempt
      ? Math.ceil((RATE_LIMIT_WINDOW - (now - oldestAttempt.timestamp)) / 1000)
      : 0,
  };
}

function recordAttempt(): void {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  let attempts: { timestamp: number }[] = stored ? JSON.parse(stored) : [];
  attempts = attempts.filter(e => now - e.timestamp < RATE_LIMIT_WINDOW);
  attempts.push({ timestamp: now });
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(attempts));
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateNewLeadModal({ isOpen, onClose, onSuccess }: CreateNewLeadModalProps) {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [showPredictions, setShowPredictions] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<DuplicateLeadMatch | null>(null);

  const { user } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded: mapsLoaded } = useLoadGoogleMaps();
  const { predictions, getPlacePredictions, getPlaceDetails, clearPredictions } = useAddressAutocomplete(addressInputRef);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormData(initialFormData);
        setErrors({});
        setModalState('idle');
        setShowPredictions(false);
        setDuplicateLead(null);
        clearPredictions();
      }, 300);
    }
  }, [isOpen, clearPredictions]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleInputChange = (field: keyof LeadFormData, value: string) => {
    if (field === 'phone') value = formatAustralianPhone(value);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if ((field === 'phone' || field === 'email') && duplicateLead) {
      setDuplicateLead(null);
    }
  };

  const handleAddressChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, propertyAddress: value }));
    if (errors.propertyAddress) {
      setErrors(prev => ({ ...prev, propertyAddress: undefined }));
    }
    if (mapsLoaded && value.length >= 3) {
      getPlacePredictions(value);
      setShowPredictions(true);
    } else {
      setShowPredictions(false);
    }
  }, [mapsLoaded, getPlacePredictions, errors.propertyAddress]);

  const handleSelectPrediction = useCallback(async (placeId: string, description: string) => {
    setShowPredictions(false);
    clearPredictions();

    const details = await getPlaceDetails(placeId);
    if (details) {
      const streetAddress = buildStreetLine(details) || fallbackStreetLine(description);

      setFormData(prev => ({
        ...prev,
        propertyAddress: streetAddress,
        suburb: details.suburb || prev.suburb,
        postcode: details.postcode || prev.postcode,
        lat: details.lat || null,
        lng: details.lng || null,
      }));

      setErrors(prev => ({
        ...prev,
        propertyAddress: undefined,
        suburb: undefined,
      }));
    } else {
      setFormData(prev => ({ ...prev, propertyAddress: fallbackStreetLine(description) }));
    }
  }, [getPlaceDetails, clearPredictions]);

  const runDuplicateCheck = async (): Promise<DuplicateLeadMatch | null> => {
    const match = await findDuplicateLead({ phone: formData.phone, email: formData.email });
    setDuplicateLead(match);
    return match;
  };

  const logAuditEntry = async (leadId: string) => {
    try {
      await supabase.from('audit_logs').insert({
        action: 'lead_created',
        entity_type: 'lead',
        entity_id: leadId,
        user_id: user?.id,
        metadata: {
          full_name: formData.fullName,
          source: formData.source,
          suburb: formData.suburb,
        },
      });
    } catch {
      // non-blocking
    }
  };

  const validateForm = (): boolean => {
    const newErrors = validateCreateLeadForm(formData, minDate);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!user) {
      setErrors({ general: 'You must be logged in to create a lead' });
      return;
    }

    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      setErrors({ general: `Too many attempts. Please wait ${rateLimit.resetInSeconds} seconds.` });
      return;
    }

    setModalState('validating');

    if (!validateForm()) {
      setModalState('idle');
      return;
    }

    // Advisory only — duplicates are legitimate (repeat customers), so the
    // warning renders alongside the insert instead of gating it.
    await runDuplicateCheck();

    setModalState('submitting');
    recordAttempt();

    try {
      const sourceParseResult = leadSourceSchema.safeParse(formData.source);
      if (!sourceParseResult.success) {
        setErrors({ source: 'Invalid lead source — please select a valid option' });
        setModalState('idle');
        return;
      }

      const zone = calculatePropertyZone(formData.suburb);

      const insertData: Record<string, unknown> = {
        full_name: sanitizeInput(formData.fullName),
        phone: formData.phone.replace(/[\s\-()]/g, ''),
        email: formData.email.toLowerCase().trim(),
        property_address_street: sanitizeInput(formData.propertyAddress),
        property_address_suburb: sanitizeInput(formData.suburb),
        property_address_postcode: formData.postcode,
        property_address_state: 'VIC',
        issue_description: sanitizeInput(formData.issueDescription),
        lead_source: sourceParseResult.data,
        status: 'new_lead',
        created_by: user.id,
        property_zone: zone,
        // Advisory only. inspection_scheduled_date / scheduled_time stay NULL until
        // bookInspection confirms a real booking — a new_lead must not carry a
        // scheduled date. See 20260428174022_add_customer_preferred_columns.sql.
        customer_preferred_date: toNullableField(formData.preferredDate),
        customer_preferred_time: toNullableField(formData.preferredTime),
      };

      if (formData.lat != null && formData.lng != null) {
        insertData.property_lat = formData.lat;
        insertData.property_lng = formData.lng;
      }

      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      // Fire-and-forget: audit log + Slack
      logAuditEntry(data.id);

      sendSlackNotification({
        event: 'new_lead',
        leadId: data.id,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        street_address: formData.propertyAddress,
        suburb: formData.suburb,
        postcode: formData.postcode,
        state: 'VIC',
        issue_description: formData.issueDescription,
        lead_source: formData.source,
        preferred_date: toNullableField(formData.preferredDate) ?? undefined,
        preferred_time: toNullableField(formData.preferredTime) ?? undefined,
        created_at: new Date().toISOString(),
      });

      setModalState('success');
      if (onSuccess) onSuccess(data.id);
    } catch (err) {
      captureBusinessError('Create new lead failed', {
        error: err instanceof Error ? err.message : String(err),
        customerName: formData.fullName,
        source: formData.source,
      });
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to create lead. Please try again.',
      });
      setModalState('error');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Min date for preferred date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!isOpen) return null;

  const duplicateBanner = duplicateLead && (
    <div
      role="status"
      className="p-4 rounded-xl flex items-start gap-3"
      style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)' }}
    >
      <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: '#FF9500' }} />
      <div>
        <p className="text-sm font-medium" style={{ color: '#FF9500' }}>Possible duplicate lead</p>
        <p className="text-sm mt-1" style={{ color: '#86868b' }}>
          A lead with this {duplicateLead.matchType} already exists:{' '}
          <a
            href={`/leads/${duplicateLead.id}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
            style={{ color: '#1d1d1f' }}
          >
            {duplicateLead.fullName}
          </a>
          {modalState === 'success' ? '. This lead was created anyway.' : '. You can still create this lead.'}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex h-5 w-full items-center justify-center pt-2">
          <div className="h-1.5 w-12 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-2">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold leading-tight tracking-tight" style={{ color: '#1d1d1f' }}>
              Create New Lead
            </h2>
            <p className="text-sm font-normal mt-1" style={{ color: '#86868b' }}>
              Add a new customer to your pipeline
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200 transition-colors"
            style={{ color: '#1d1d1f' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success State */}
        {modalState === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
            >
              <CheckCircle2 className="h-12 w-12" style={{ color: '#34C759' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1d1d1f' }}>
              Lead Created Successfully!
            </h3>
            <p className="text-sm text-center" style={{ color: '#86868b' }}>
              {formData.fullName} has been added to your pipeline
            </p>
            {duplicateBanner && <div className="w-full mt-6">{duplicateBanner}</div>}
          </div>
        )}

        {/* Form Content */}
        {modalState !== 'success' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* General Error */}
              {errors.general && (
                <div
                  className="p-4 rounded-xl flex items-start gap-3"
                  style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
                >
                  <AlertCircle className="h-5 w-5" style={{ color: '#FF3B30' }} />
                  <p className="text-sm" style={{ color: '#FF3B30' }}>{errors.general}</p>
                </div>
              )}

              {/* Duplicate Warning — advisory, submit stays enabled */}
              {duplicateBanner}

              {/* 1. Full Name */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => handleInputChange('fullName', e.target.value)}
                  placeholder="e.g. John Smith"
                  className={`w-full rounded-xl h-12 p-4 text-base transition-all ${
                    errors.fullName
                      ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                      : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                  }`}
                  style={{ outline: 'none' }}
                />
                {errors.fullName && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.fullName}</p>
                )}
              </div>

              {/* 2. Preferred Date */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Preferred Date <span className="font-normal" style={{ color: '#86868b' }}>(optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={e => handleInputChange('preferredDate', e.target.value)}
                  min={minDate}
                  className={`w-full rounded-xl h-12 px-4 text-base transition-all ${
                    errors.preferredDate
                      ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                      : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                  }`}
                  style={{ outline: 'none' }}
                />
                {errors.preferredDate && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.preferredDate}</p>
                )}
              </div>

              {/* 3. Phone Number */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  onBlur={runDuplicateCheck}
                  placeholder="04XX XXX XXX"
                  className={`w-full rounded-xl h-12 p-4 text-base transition-all ${
                    errors.phone
                      ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                      : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                  }`}
                  style={{ outline: 'none' }}
                />
                {errors.phone && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.phone}</p>
                )}
              </div>

              {/* 4. Preferred Time */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Preferred Time <span className="font-normal" style={{ color: '#86868b' }}>(optional)</span>
                </label>
                <TimePicker
                  value={formData.preferredTime}
                  onChange={value => handleInputChange('preferredTime', value)}
                  minTime={OPENING_TIME}
                  maxTime={CLOSING_TIME}
                  placeholder="Select time..."
                />
                {errors.preferredTime && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.preferredTime}</p>
                )}
              </div>

              {/* 5. Street Address with Autocomplete */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Street Name & Number *
                </label>
                <div className="relative">
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={formData.propertyAddress}
                    onChange={e => handleAddressChange(e.target.value)}
                    onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                    onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                    placeholder="Start typing address..."
                    autoComplete="off"
                    className={`w-full rounded-xl h-12 pl-11 pr-4 text-base transition-all ${
                      errors.propertyAddress
                        ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                        : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                    }`}
                    style={{ outline: 'none' }}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="h-5 w-5" />
                  </div>

                  {/* Address Predictions Dropdown */}
                  {showPredictions && predictions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                      {predictions.map((prediction) => (
                        <button
                          key={prediction.place_id}
                          type="button"
                          onClick={() => handleSelectPrediction(prediction.place_id, prediction.description)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
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
                {errors.propertyAddress && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.propertyAddress}</p>
                )}
                {mapsLoaded && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#86868b' }}>
                    Powered by Google Places
                  </p>
                )}
              </div>

              {/* 6. Suburb (auto-filled from Places, editable) */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Suburb *
                </label>
                <input
                  type="text"
                  value={formData.suburb}
                  onChange={e => handleInputChange('suburb', e.target.value)}
                  placeholder="e.g. Melbourne"
                  className={`w-full rounded-xl h-12 p-4 text-base transition-all ${
                    errors.suburb
                      ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                      : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                  }`}
                  style={{ outline: 'none' }}
                />
                {errors.suburb && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.suburb}</p>
                )}
              </div>

              {/* 7. Postcode (auto-filled from Places, editable) */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Postcode *
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={e => handleInputChange('postcode', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 3000"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  className={`w-full rounded-xl h-12 p-4 text-base transition-all ${
                    errors.postcode
                      ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                      : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                  }`}
                  style={{ outline: 'none' }}
                />
                {errors.postcode && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.postcode}</p>
                )}
              </div>

              {/* 8. Email Address */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  onBlur={runDuplicateCheck}
                  placeholder="email@example.com"
                  className={`w-full rounded-xl h-12 p-4 text-base transition-all ${
                    errors.email
                      ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                      : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                  }`}
                  style={{ outline: 'none' }}
                />
                {errors.email && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.email}</p>
                )}
              </div>

              {/* 9. Brief Description */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Brief Description *
                </label>
                <textarea
                  value={formData.issueDescription}
                  onChange={e => handleInputChange('issueDescription', e.target.value)}
                  placeholder="Describe the mould issue in detail..."
                  rows={3}
                  className={`w-full rounded-xl p-4 text-base resize-none transition-all ${
                    errors.issueDescription
                      ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                      : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                  }`}
                  style={{ outline: 'none' }}
                />
                <div className="flex items-center justify-between mt-1 ml-1">
                  {errors.issueDescription ? (
                    <p className="text-xs" style={{ color: '#FF3B30' }}>{errors.issueDescription}</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-xs" style={{ color: '#86868b' }}>
                    {formData.issueDescription.length}/1000
                  </p>
                </div>
              </div>

              {/* 10. Lead Source */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Lead Source *
                </label>
                <div className="relative">
                  <select
                    value={formData.source}
                    onChange={e => handleInputChange('source', e.target.value)}
                    className={`w-full rounded-xl h-12 px-4 pr-10 text-base transition-all bg-white appearance-none cursor-pointer ${
                      errors.source
                        ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                        : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                    }`}
                    style={{ outline: 'none', color: formData.source ? '#1d1d1f' : '#86868b' }}
                  >
                    <option value="">Select lead source...</option>
                    {leadSourceOptions.map(opt => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={opt.disabled}
                        style={opt.disabled ? { fontWeight: 700, color: '#86868b' } : undefined}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#617589' }} />
                </div>
                {errors.source && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.source}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <Zap className="h-5 w-5" style={{ color: '#86868b' }} />
                <p className="text-xs" style={{ color: '#86868b' }}>
                  New leads are automatically posted to Slack #leads channel
                </p>
              </div>

              <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={modalState === 'submitting'}
                  className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
                  style={{ color: '#6b7280' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={modalState === 'submitting'}
                  className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#007AFF',
                    boxShadow: '0 4px 14px rgba(0, 122, 255, 0.25)',
                  }}
                >
                  {modalState === 'submitting' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Lead'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
