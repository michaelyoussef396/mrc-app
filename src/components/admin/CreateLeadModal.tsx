import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLoadGoogleMaps, useAddressAutocomplete } from '@/hooks/useGoogleMaps';
import { sendSlackNotification } from '@/lib/api/notifications';

// ============================================================================
// TYPES
// ============================================================================

interface CreateLeadModalProps {
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
  issueDescription: string;
  source: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  propertyAddress?: string;
  suburb?: string;
  postcode?: string;
  issueDescription?: string;
  source?: string;
  general?: string;
}

type ModalState = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialFormData: LeadFormData = {
  fullName: '',
  phone: '',
  email: '',
  propertyAddress: '',
  suburb: '',
  postcode: '',
  state: 'VIC',
  issueDescription: '',
  source: '',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Format Australian phone as user types
function formatAustralianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  // Mobile: 04XX XXX XXX
  if (digits.startsWith('04') || digits.startsWith('614')) {
    const clean = digits.startsWith('614') ? '0' + digits.slice(2) : digits;
    if (clean.length <= 4) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 10)}`;
  }

  // Landline: (0X) XXXX XXXX
  if (digits.startsWith('0') && digits.length > 1) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  }

  return value;
}

// Sanitize input to prevent XSS
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, 1000);
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMIT_KEY = 'create_lead_attempts';
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 attempts per minute

interface RateLimitEntry {
  timestamp: number;
}

function checkRateLimit(): { allowed: boolean; remainingAttempts: number; resetInSeconds: number } {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  let attempts: RateLimitEntry[] = stored ? JSON.parse(stored) : [];

  // Remove entries older than the window
  attempts = attempts.filter(entry => now - entry.timestamp < RATE_LIMIT_WINDOW);

  const remainingAttempts = RATE_LIMIT_MAX - attempts.length;
  const oldestAttempt = attempts[0];
  const resetInSeconds = oldestAttempt
    ? Math.ceil((RATE_LIMIT_WINDOW - (now - oldestAttempt.timestamp)) / 1000)
    : 0;

  return {
    allowed: attempts.length < RATE_LIMIT_MAX,
    remainingAttempts: Math.max(0, remainingAttempts),
    resetInSeconds
  };
}

function recordAttempt(): void {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  let attempts: RateLimitEntry[] = stored ? JSON.parse(stored) : [];

  // Clean old entries and add new one
  attempts = attempts.filter(entry => now - entry.timestamp < RATE_LIMIT_WINDOW);
  attempts.push({ timestamp: now });

  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(attempts));
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  // State
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Hooks
  const { user } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Google Maps autocomplete
  const { isLoaded: mapsLoaded } = useLoadGoogleMaps();
  const { predictions, getPlacePredictions, getPlaceDetails, clearPredictions } = useAddressAutocomplete(addressInputRef);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = '';  // Always reset to default (empty string)
      };
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormData(initialFormData);
        setErrors({});
        setModalState('idle');
        setCreatedLeadId(null);
        setShowPredictions(false);
        setDuplicateWarning(null);
        clearPredictions();
      }, 300);
    }
  }, [isOpen, clearPredictions]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle input change
  const handleInputChange = (field: keyof LeadFormData, value: string) => {
    // Apply phone formatting
    if (field === 'phone') {
      value = formatAustralianPhone(value);
    }

    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Clear duplicate warning when user changes phone/email
    if ((field === 'phone' || field === 'email') && duplicateWarning) {
      setDuplicateWarning(null);
    }
  };

  // Handle address input for autocomplete
  const handleAddressChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, propertyAddress: value }));
    if (errors.propertyAddress) {
      setErrors(prev => ({ ...prev, propertyAddress: undefined }));
    }

    // Get predictions if Google Maps is loaded
    if (mapsLoaded && value.length >= 3) {
      getPlacePredictions(value);
      setShowPredictions(true);
    } else {
      setShowPredictions(false);
    }
  }, [mapsLoaded, getPlacePredictions, errors.propertyAddress]);

  // Handle selecting a place prediction
  const handleSelectPrediction = useCallback(async (placeId: string, description: string) => {
    setShowPredictions(false);
    clearPredictions();

    // Get place details
    const details = await getPlaceDetails(placeId);

    if (details) {
      // Build full street address
      const streetAddress = details.street_number && details.street_name
        ? `${details.street_number} ${details.street_name}`
        : details.formatted_address.split(',')[0];

      setFormData(prev => ({
        ...prev,
        propertyAddress: streetAddress,
        suburb: details.suburb || prev.suburb,
        postcode: details.postcode || prev.postcode,
        state: details.state || prev.state,
      }));

      // Clear address errors
      setErrors(prev => ({
        ...prev,
        propertyAddress: undefined,
        suburb: undefined,
        postcode: undefined,
      }));
    } else {
      // Fallback: just use description
      setFormData(prev => ({ ...prev, propertyAddress: description.split(',')[0] }));
    }
  }, [getPlaceDetails, clearPredictions]);

  // Check for duplicate leads
  const checkForDuplicates = async (): Promise<{ isDuplicate: boolean; message: string | null }> => {
    const phoneDigits = formData.phone.replace(/\D/g, '');
    const emailLower = formData.email.toLowerCase().trim();

    try {
      // Check for existing leads with same phone or email
      const { data: existingLeads, error } = await supabase
        .from('leads')
        .select('id, full_name, phone, email')
        .or(`phone.eq.${phoneDigits},email.ilike.${emailLower}`)
        .limit(1);

      if (error) {
        console.error('[CreateLead] Duplicate check error:', error);
        return { isDuplicate: false, message: null };
      }

      if (existingLeads && existingLeads.length > 0) {
        const existing = existingLeads[0];
        const matchType = existing.phone === phoneDigits ? 'phone number' : 'email address';
        return {
          isDuplicate: true,
          message: `A lead with this ${matchType} already exists: ${existing.full_name}`
        };
      }

      return { isDuplicate: false, message: null };
    } catch (err) {
      console.error('[CreateLead] Duplicate check error:', err);
      return { isDuplicate: false, message: null };
    }
  };

  // Log audit entry
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
        }
      });
    } catch (err) {
      console.error('[CreateLead] Audit log error:', err);
      // Don't fail the create operation if audit log fails
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.fullName)) {
      newErrors.fullName = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Phone validation
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!phoneDigits) {
      newErrors.phone = 'Phone number is required';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Please enter a valid Australian phone number';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Property Address validation
    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = 'Property address is required';
    } else if (formData.propertyAddress.trim().length < 5) {
      newErrors.propertyAddress = 'Please enter a complete address';
    }

    // Suburb validation
    if (!formData.suburb.trim()) {
      newErrors.suburb = 'Suburb is required';
    }

    // Postcode validation
    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    } else if (!/^\d{4}$/.test(formData.postcode)) {
      newErrors.postcode = 'Postcode must be 4 digits';
    }

    // Issue Description validation
    if (!formData.issueDescription.trim()) {
      newErrors.issueDescription = 'Issue description is required';
    } else if (formData.issueDescription.trim().length < 10) {
      newErrors.issueDescription = 'Please provide more detail (at least 10 characters)';
    }

    // Source validation
    if (!formData.source) {
      newErrors.source = 'Please select a lead source';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!user) {
      setErrors({ general: 'You must be logged in to create a lead' });
      return;
    }

    // Check rate limit
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      setErrors({
        general: `Too many attempts. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`
      });
      return;
    }

    setModalState('validating');

    if (!validateForm()) {
      setModalState('idle');
      return;
    }

    // Check for duplicates
    setDuplicateWarning(null);
    const duplicateCheck = await checkForDuplicates();
    if (duplicateCheck.isDuplicate) {
      setDuplicateWarning(duplicateCheck.message);
      setModalState('idle');
      return;
    }

    setModalState('submitting');

    // Record the attempt for rate limiting
    recordAttempt();

    try {
      const insertData = {
        full_name: sanitizeInput(formData.fullName),
        phone: formData.phone.replace(/[\s\-\(\)]/g, ''),
        email: formData.email.toLowerCase().trim(),
        property_address_street: sanitizeInput(formData.propertyAddress),
        property_address_suburb: sanitizeInput(formData.suburb),
        property_address_postcode: formData.postcode,
        property_address_state: formData.state,
        issue_description: sanitizeInput(formData.issueDescription),
        lead_source: formData.source,
        status: 'new_lead',
        created_by: user.id,
      };

      // Insert lead into database
      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        console.error('[CreateLead] Database error:', error);
        throw error;
      }

      // Log audit entry (non-blocking)
      logAuditEntry(data.id);

      // Slack notification (fire-and-forget)
      sendSlackNotification({
        event: 'new_lead',
        leadId: data.id,
        leadName: formData.fullName,
        propertyAddress: `${formData.propertyAddress}, ${formData.suburb} ${formData.state} ${formData.postcode}`,
      });

      setCreatedLeadId(data.id);
      setModalState('success');

      // Call success callback
      if (onSuccess) {
        onSuccess(data.id);
      }

    } catch (err) {
      console.error('[CreateLead] Error creating lead:', err);
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to create lead. Please try again.'
      });
      setModalState('error');
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Reset form for adding another lead
  const handleAddAnother = () => {
    setFormData(initialFormData);
    setErrors({});
    setModalState('idle');
    setCreatedLeadId(null);
    setShowPredictions(false);
    setDuplicateWarning(null);
    clearPredictions();
  };

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
            <p className="text-sm text-center mb-8" style={{ color: '#86868b' }}>
              {formData.fullName} has been added to your pipeline
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <button
                onClick={handleAddAnother}
                className="flex-1 px-6 py-3 rounded-xl font-semibold transition-colors"
                style={{ color: '#86868b', border: '1px solid #e5e5e5' }}
              >
                Add Another
              </button>
              <button
                onClick={() => {
                  onClose();
                  // Navigate to lead detail if needed
                  if (createdLeadId) {
                    window.location.href = `/lead/${createdLeadId}`;
                  }
                }}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#007AFF', boxShadow: '0 4px 14px rgba(0, 122, 255, 0.25)' }}
              >
                View Lead
              </button>
            </div>
          </div>
        )}

        {/* Form Content */}
        {modalState !== 'success' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
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

              {/* Contact Info Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-xl" style={{ color: '#007AFF' }}>person</span>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#1d1d1f' }}>
                    Contact Info
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="flex flex-col flex-1">
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

                  {/* Phone Number */}
                  <div className="flex flex-col flex-1">
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

                  {/* Email */}
                  <div className="flex flex-col flex-1 md:col-span-2">
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
                </div>
              </section>

              {/* Property Details Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-xl" style={{ color: '#007AFF' }}>location_on</span>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#1d1d1f' }}>
                    Property Details
                  </h3>
                </div>
                <div className="space-y-4">
                  {/* Property Address with Autocomplete */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                      Street Address *
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

                  {/* Suburb, Postcode, State Row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Suburb */}
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

                    {/* Postcode */}
                    <div className="flex flex-col">
                      <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                        Postcode *
                      </label>
                      <input
                        type="text"
                        value={formData.postcode}
                        onChange={e => handleInputChange('postcode', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="3000"
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

                    {/* State */}
                    <div className="flex flex-col col-span-2 md:col-span-1">
                      <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                        State
                      </label>
                      <select
                        value={formData.state}
                        onChange={e => handleInputChange('state', e.target.value)}
                        className="w-full rounded-xl h-12 px-4 text-base border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all bg-white"
                        style={{ outline: 'none' }}
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
                    </div>
                  </div>
                </div>
              </section>

              {/* Lead Details Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-xl" style={{ color: '#007AFF' }}>info</span>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#1d1d1f' }}>
                    Lead Details
                  </h3>
                </div>
                <div className="space-y-4">
                  {/* Issue Description */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                      Issue Description *
                    </label>
                    <textarea
                      value={formData.issueDescription}
                      onChange={e => handleInputChange('issueDescription', e.target.value)}
                      placeholder="Describe the mould issue..."
                      rows={3}
                      className={`w-full rounded-xl p-4 text-base resize-none transition-all ${
                        errors.issueDescription
                          ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                          : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                      }`}
                      style={{ outline: 'none' }}
                    />
                    {errors.issueDescription && (
                      <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.issueDescription}</p>
                    )}
                  </div>

                  {/* Lead Source */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium pb-1.5 ml-1" style={{ color: '#374151' }}>
                      Lead Source *
                    </label>
                    <select
                      value={formData.source}
                      onChange={e => handleInputChange('source', e.target.value)}
                      className={`w-full rounded-xl h-12 px-4 text-base bg-white transition-all ${
                        errors.source
                          ? 'border-2 border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
                          : 'border border-gray-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                      }`}
                      style={{ outline: 'none' }}
                    >
                      <option value="">Select Source</option>
                      <option value="website">Website</option>
                      <option value="google">Google</option>
                      <option value="referral">Referral</option>
                      <option value="facebook">Facebook</option>
                      <option value="hipages">Hipages</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.source && (
                      <p className="text-xs mt-1 ml-1" style={{ color: '#FF3B30' }}>{errors.source}</p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/50">
              {/* Slack Webhook Notice */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <span className="material-symbols-outlined text-lg" style={{ color: '#86868b' }}>bolt</span>
                <p className="text-xs" style={{ color: '#86868b' }}>
                  New leads are automatically posted to Slack #leads channel
                </p>
              </div>

              {/* Footer Buttons */}
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
                onClick={() => handleSubmit()}
                disabled={modalState === 'submitting'}
                className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#007AFF',
                  boxShadow: '0 4px 14px rgba(0, 122, 255, 0.25)'
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
