import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLoadGoogleMaps, useAddressAutocomplete } from '@/hooks/useGoogleMaps';
import { sendSlackNotification } from '@/lib/api/notifications';
import { calculatePropertyZone, leadSourceOptions } from '@/lib/leadUtils';

// ============================================================================
// TYPES
// ============================================================================

interface CreateNewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadId: string) => void;
}

interface LeadFormData {
  fullName: string;
  phone: string;
  email: string;
  propertyAddress: string;
  suburb: string;
  postcode: string;
  state: string;
  lat: number | null;
  lng: number | null;
  preferredDate: string;
  preferredTime: string;
  issueDescription: string;
  source: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  propertyAddress?: string;
  suburb?: string;
  preferredDate?: string;
  preferredTime?: string;
  issueDescription?: string;
  source?: string;
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
  state: 'VIC',
  lat: null,
  lng: null,
  preferredDate: '',
  preferredTime: '',
  issueDescription: '',
  source: '',
};

// 30-min slots from 7am to 6pm
const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const h12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const label = `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  return { time, label };
});

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
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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
        setDuplicateWarning(null);
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
    if ((field === 'phone' || field === 'email') && duplicateWarning) {
      setDuplicateWarning(null);
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
      const streetAddress = details.street_number && details.street_name
        ? `${details.street_number} ${details.street_name}`
        : details.formatted_address.split(',')[0];

      setFormData(prev => ({
        ...prev,
        propertyAddress: streetAddress,
        suburb: details.suburb || prev.suburb,
        postcode: details.postcode || prev.postcode,
        state: details.state || prev.state,
        lat: details.lat || null,
        lng: details.lng || null,
      }));

      setErrors(prev => ({
        ...prev,
        propertyAddress: undefined,
        suburb: undefined,
      }));
    } else {
      setFormData(prev => ({ ...prev, propertyAddress: description.split(',')[0] }));
    }
  }, [getPlaceDetails, clearPredictions]);

  const checkForDuplicates = async (): Promise<{ isDuplicate: boolean; message: string | null }> => {
    const phoneDigits = formData.phone.replace(/\D/g, '');
    const emailLower = formData.email.toLowerCase().trim();

    try {
      const { data: existingLeads, error } = await supabase
        .from('leads')
        .select('id, full_name, phone, email')
        .or(`phone.eq.${phoneDigits},email.ilike.${emailLower}`)
        .limit(1);

      if (error) return { isDuplicate: false, message: null };

      if (existingLeads && existingLeads.length > 0) {
        const existing = existingLeads[0];
        const matchType = existing.phone === phoneDigits ? 'phone number' : 'email address';
        return {
          isDuplicate: true,
          message: `A lead with this ${matchType} already exists: ${existing.full_name}`,
        };
      }
      return { isDuplicate: false, message: null };
    } catch {
      return { isDuplicate: false, message: null };
    }
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
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    } else if (formData.fullName.trim().length > 255) {
      newErrors.fullName = 'Name must be less than 255 characters';
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!phoneDigits) {
      newErrors.phone = 'Phone number is required';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Please enter a valid Australian phone number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = 'Street address is required';
    } else if (formData.propertyAddress.trim().length < 5) {
      newErrors.propertyAddress = 'Please enter a complete address';
    }

    if (!formData.suburb.trim()) {
      newErrors.suburb = 'Suburb is required';
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Preferred date is required';
    } else if (formData.preferredDate < minDate) {
      newErrors.preferredDate = 'Date must be in the future';
    }

    if (!formData.preferredTime) {
      newErrors.preferredTime = 'Preferred time is required';
    }

    if (!formData.issueDescription.trim()) {
      newErrors.issueDescription = 'Brief description is required';
    } else if (formData.issueDescription.trim().length < 20) {
      newErrors.issueDescription = 'Please provide more detail (at least 20 characters)';
    } else if (formData.issueDescription.trim().length > 1000) {
      newErrors.issueDescription = 'Description must be less than 1000 characters';
    }

    if (!formData.source) {
      newErrors.source = 'Lead source is required';
    }

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

    setDuplicateWarning(null);
    const duplicateCheck = await checkForDuplicates();
    if (duplicateCheck.isDuplicate) {
      setDuplicateWarning(duplicateCheck.message);
      setModalState('idle');
      return;
    }

    setModalState('submitting');
    recordAttempt();

    try {
      const zone = calculatePropertyZone(formData.suburb);

      const insertData: Record<string, unknown> = {
        full_name: sanitizeInput(formData.fullName),
        phone: formData.phone.replace(/[\s\-()]/g, ''),
        email: formData.email.toLowerCase().trim(),
        property_address_street: sanitizeInput(formData.propertyAddress),
        property_address_suburb: sanitizeInput(formData.suburb),
        property_address_postcode: formData.postcode || undefined,
        property_address_state: formData.state,
        issue_description: sanitizeInput(formData.issueDescription),
        lead_source: formData.source,
        status: 'new_lead',
        created_by: user.id,
        property_zone: zone,
        inspection_scheduled_date: formData.preferredDate,
        scheduled_time: formData.preferredTime,
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
        state: formData.state,
        issue_description: formData.issueDescription,
        lead_source: formData.source,
        created_at: new Date().toISOString(),
      });

      setModalState('success');
      if (onSuccess) onSuccess(data.id);
    } catch (err) {
      console.error('[CreateNewLead] Error:', err);
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
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Success State */}
        {modalState === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
            >
              <span className="material-symbols-outlined text-[48px]" style={{ color: '#34C759' }}>
                check_circle
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1d1d1f' }}>
              Lead Created Successfully!
            </h3>
            <p className="text-sm text-center" style={{ color: '#86868b' }}>
              {formData.fullName} has been added to your pipeline
            </p>
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
                  <span className="material-symbols-outlined" style={{ color: '#FF3B30' }}>error</span>
                  <p className="text-sm" style={{ color: '#FF3B30' }}>{errors.general}</p>
                </div>
              )}

              {/* Duplicate Warning */}
              {duplicateWarning && (
                <div
                  className="p-4 rounded-xl flex items-start gap-3"
                  style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)' }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#FF9500' }}>warning</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#FF9500' }}>Duplicate Lead Detected</p>
                    <p className="text-sm mt-1" style={{ color: '#86868b' }}>{duplicateWarning}</p>
                  </div>
                </div>
              )}

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
                  Preferred Date *
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
                  Preferred Time *
                </label>
                <div className="relative">
                  <select
                    value={formData.preferredTime}
                    onChange={e => handleInputChange('preferredTime', e.target.value)}
                    className={`w-full rounded-xl h-12 px-4 pr-10 text-base transition-all bg-white appearance-none cursor-pointer ${
                      errors.preferredTime
                        ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                        : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                    }`}
                    style={{ outline: 'none', color: formData.preferredTime ? '#1d1d1f' : '#86868b' }}
                  >
                    <option value="">Select time...</option>
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.time} value={slot.time}>{slot.label}</option>
                    ))}
                  </select>
                  <span
                    className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#617589', fontSize: '20px' }}
                  >
                    schedule
                  </span>
                </div>
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
                    <span className="material-symbols-outlined text-lg">search</span>
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
                          <span className="material-symbols-outlined text-gray-400 text-lg mt-0.5">location_on</span>
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

              {/* 7. Email Address */}
              <div className="flex flex-col">
                <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
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

              {/* 8. Brief Description */}
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

              {/* 9. Lead Source */}
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
                  <span
                    className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#617589', fontSize: '20px' }}
                  >
                    expand_more
                  </span>
                </div>
                {errors.source && (
                  <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.source}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <span className="material-symbols-outlined text-lg" style={{ color: '#86868b' }}>bolt</span>
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
