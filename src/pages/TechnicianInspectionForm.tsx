import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateDewPoint, getEnvironmentReadingWarning } from '@/lib/inspectionUtils';
import {
  calculateCostEstimate,
  calculateWasteDisposalCost,
  round2,
  LABOUR_RATES,
  EQUIPMENT_RATES,
  formatCurrency,
  formatPercent,
  deriveEquipmentDays,
} from '@/lib/calculations/pricing';
import {
  areaFormToLabourInput,
  areaRowToLabourInput,
  deriveQuoteHours,
  deriveSurfaceHours,
  isPricedAsDemolition,
} from '@/lib/calculations/labourHours';
import {
  parseOverrideInput,
  reconcileLoadedOverride,
  resolveOverridableValue,
  reconcileLoadedEquipmentDays,
} from '@/lib/calculations/estimate-override';
import {
  uploadInspectionPhoto,
  deleteInspectionPhoto,
  loadInspectionPhotos,
} from '@/lib/utils/photoUpload';
import { derivePhotoCaption } from '@/lib/utils/photoCaption';
import {
  MAX_ROOM_VIEW_PHOTOS,
  MAX_SUBFLOOR_PHOTOS,
  SINGLE_SLOT_PHOTO_TYPES,
  getRemainingPhotoSlots,
} from '@/lib/utils/photoSlots';
import type {
  InspectionFormData,
  InspectionArea,
  MoistureReading,
  SubfloorReading,
  Photo,
} from '@/types/inspection';
import { validateInspectionCompletion } from '@/lib/schemas/inspectionSchema';
import { addBusinessBreadcrumb, captureBusinessError } from '@/lib/sentry';
import { logFieldEdits, logSectionMilestone, diffPayload, type FieldChange } from '@/lib/api/fieldEditLog';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Droplets,
  Eye,
  Image,
  Info,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Save,
  StickyNote,
  Star,
  Sun,
  Thermometer,
  Trash2,
  WifiOff,
  Wind,
  X,
} from 'lucide-react';

// Save-time offline classifier for user messaging. navigator.onLine can be
// stale on iOS Safari after airplane-mode toggles, so also sniff the
// fetch-level failure text: Chromium throws 'Failed to fetch', WebKit
// 'Load failed', Firefox 'NetworkError'. supabase-js surfaces these as plain
// objects with a message, not Error instances. Deliberately duplicated in
// useJobCompletionForm.ts — two call sites don't justify a shared module.
function isNetworkLevelError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(err ?? '');
  return /failed to fetch|load failed|network ?error|fetch failed/i.test(message);
}

// Amber warning styling for offline toasts — dark text on amber for WCAG
// contrast; inline classes because the shadcn toast only ships default and
// destructive variants and this file must not edit the shared UI kit.
const OFFLINE_TOAST_CLASS = 'border-amber-600 bg-amber-500 text-amber-950';


// Helper: invoke edge functions via direct fetch (bypasses supabase.functions.invoke timeout issues)
async function invokeEdgeFunction(functionName: string, body: object): Promise<{ data: any; error: any }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || supabaseAnonKey;
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
    const responseData = await response.json();
    if (!response.ok) {
      return { data: null, error: { message: responseData.error || `HTTP ${response.status}` } };
    }
    return { data: responseData, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'Network error' } };
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOTAL_SECTIONS = 9;

const SECTION_TITLES = [
  'Basic Information',
  'Property Details',
  'Area Inspection',
  'Subfloor',
  'Outdoor Info',
  'Waste Disposal',
  'Work Procedure',
  'Job Summary',
  'Cost Estimate',
];

const PROPERTY_OCCUPATION_OPTIONS = [
  { value: 'tenanted', label: 'Tenanted' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'owner_occupied', label: 'Owner Occupied' },
  { value: 'tenants_vacating', label: 'Tenants Vacating' },
];

const DWELLING_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'units', label: 'Units' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'construction', label: 'Construction' },
  { value: 'industrial', label: 'Industrial' },
];

const DEHUMIDIFIER_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const PARKING_OPTIONS = [
  { value: 'driveway', label: 'Driveway' },
  { value: 'street', label: 'Street Parking' },
  { value: 'permit', label: 'Permit Required' },
  { value: 'paid', label: 'Paid Parking' },
  { value: 'none', label: 'No Parking Available' },
];

const INFRARED_OBSERVATIONS = [
  'No Active Water Intrusion Detected',
  'Active Water Infiltration',
  'Past Water Ingress (Dried)',
  'Condensation Pattern',
  'Missing/Inadequate Insulation',
];

const MOULD_VISIBILITY_OPTIONS = [
  'Ceiling',
  'Cornice',
  'Windows',
  'Window frames',
  'Furnishings',
  'Walls',
  'Skirting',
  'Flooring',
  'Wardrobe',
  'Cupboard',
  'Contents',
  'Grout/silicone',
  'No mould visible',
];

// ============================================================================
// TYPES
// ============================================================================

interface LeadData {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  property_address_street: string;
  property_address_suburb: string;
  property_address_state: string;
  property_address_postcode: string;
  property_lat: number | null;
  property_lng: number | null;
  issue_description: string | null;
  internal_notes: string | null;
  status: string;
}

interface BookingData {
  id: string;
  start_datetime: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Melbourne',
    }).replace(/\b[ap]m\b/gi, (m) => m.toUpperCase());
  } catch {
    return dateStr;
  }
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

function getGoogleMapsUrl(lead: LeadData): string {
  if (lead.property_lat && lead.property_lng) {
    return `https://maps.google.com/?q=${lead.property_lat},${lead.property_lng}`;
  }
  const address = `${lead.property_address_street} ${lead.property_address_suburb} ${lead.property_address_state}`;
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function getFullAddress(lead: LeadData): string {
  return [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_state,
    lead.property_address_postcode,
  ]
    .filter(Boolean)
    .join(', ');
}

function createEmptyArea(): InspectionArea {
  return {
    id: crypto.randomUUID(),
    areaName: '',
    mouldDescription: '',
    commentsForReport: '',
    temperature: '',
    humidity: '',
    dewPoint: '',
    moistureReadingsEnabled: true,
    moistureReadings: [
      { id: crypto.randomUUID(), title: '', reading: '', photo: null },
      { id: crypto.randomUUID(), title: '', reading: '', photo: null },
    ],
    externalMoisture: '',
    internalNotes: '',
    extraNotes: '',
    primaryPhotoId: null,
    roomViewPhotos: [],
    infraredEnabled: false,
    infraredPhoto: null,
    naturalInfraredPhoto: null,
    infraredObservations: [],
    mouldVisibleLocations: [],
    mouldVisibleCustom: '',
    timeWithoutDemo: 0,
    demolitionRequired: false,
    demolitionTime: 0,
    demolitionDescription: '',
  };
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

interface HeaderProps {
  onBack: () => void;
  onSave: () => void;
  currentSection: number;
  totalSections: number;
  titleOverride?: string;
}

function Header({ onBack, onSave, currentSection, totalSections, titleOverride }: HeaderProps) {
  const progress = (currentSection / totalSections) * 100;
  const sectionTitle = titleOverride ?? SECTION_TITLES[currentSection - 1] ?? 'Inspection Form';

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center p-2 -ml-2 text-[#007AFF] hover:bg-gray-100 rounded-lg transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
        <h1 className="text-lg font-bold leading-tight flex-1 text-center text-[#1d1d1f]">
          {sectionTitle}
        </h1>
        <button
          onClick={onSave}
          className="flex items-center justify-center p-2 -mr-2 text-[#007AFF] hover:bg-gray-100 rounded-lg transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <Save className="h-6 w-6" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wide">
            Section {currentSection} of {totalSections}
          </span>
          <span className="text-xs font-medium text-[#007AFF]">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </header>
  );
}

interface CustomerInfoCardProps {
  lead: LeadData | null;
  booking: BookingData | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function CustomerInfoCard({ lead, booking, isExpanded, onToggle }: CustomerInfoCardProps) {
  if (!lead) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 flex items-center justify-center">
          <p className="text-[#86868b]">Loading customer info...</p>
        </div>
      </section>
    );
  }

  const fullAddress = getFullAddress(lead);
  const mapsUrl = getGoogleMapsUrl(lead);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-gray-50">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-0.5">
            Customer Info
          </span>
          <h2 className="text-lg font-bold text-[#1d1d1f]">{lead.full_name}</h2>
        </div>
        <button
          onClick={onToggle}
          className="p-2 bg-white rounded-full shadow-sm text-[#86868b] hover:text-[#007AFF] transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="divide-y divide-gray-100">
          <a
            href={`tel:${lead.phone.replace(/\s/g, '')}`}
            className="flex items-center p-4 active:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#86868b] mb-0.5">Phone</p>
              <p className="font-medium text-[#1d1d1f] text-base">{formatPhone(lead.phone)}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </a>

          <a
            href={`mailto:${lead.email}`}
            className="flex items-center p-4 active:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#86868b] mb-0.5">Email</p>
              <p className="font-medium text-[#1d1d1f] text-base">{lead.email}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </a>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 active:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#86868b] mb-0.5">Address</p>
              <p className="font-medium text-[#1d1d1f] text-base">{fullAddress}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </a>

          {booking && (
            <div className="flex items-center p-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#86868b] mb-0.5">Scheduled</p>
                <p className="font-medium text-[#1d1d1f] text-base">
                  {formatDisplayDate(booking.start_datetime)}
                </p>
              </div>
            </div>
          )}

          {lead.internal_notes && (
            <div className="flex items-start p-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mr-4 shrink-0">
                <StickyNote className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#86868b] mb-0.5">Internal Notes</p>
                <p className="font-medium text-[#1d1d1f] text-sm whitespace-pre-line">{lead.internal_notes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#86868b] uppercase tracking-wider ml-1">
        {label}
        {required && ' *'}
      </label>
      {children}
    </div>
  );
}

interface ReadOnlyInputProps {
  value: string;
}

function ReadOnlyInput({ value }: ReadOnlyInputProps) {
  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value}
        readOnly
        className="w-full h-12 bg-[#f5f7f8] text-[#86868b] font-medium rounded-lg border border-gray-200 px-4 cursor-not-allowed"
      />
      <Lock className="absolute right-4 text-gray-400 h-5 w-5" />
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 ${
        checked ? 'bg-[#007AFF]' : 'bg-gray-300'
      }`}
      style={{ minWidth: '56px', minHeight: '32px' }}
    >
      {label && <span className="sr-only">{label}</span>}
      <span
        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

function SelectInput({ value, onChange, options, placeholder }: SelectInputProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent appearance-none"
      style={{ minHeight: '48px' }}
    >
      <option value="">{placeholder || 'Select...'}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
}

function NumberInput({ value, onChange, min = 0, max, step = 1, placeholder, unit }: NumberInputProps) {
  return (
    <div className="relative flex items-center">
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
        style={{ minHeight: '48px' }}
      />
      {unit && (
        <span className="absolute right-4 text-[#86868b] text-sm">{unit}</span>
      )}
    </div>
  );
}

interface PhotoUploadButtonProps {
  onClick: () => void;
  label: string;
  count?: number;
  maxCount?: number;
}

function PhotoUploadButton({ onClick, label, count = 0, maxCount }: PhotoUploadButtonProps) {
  const countText = maxCount ? `${count}/${maxCount}` : count > 0 ? `(${count})` : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full h-14 bg-white border-2 border-dashed border-gray-300 rounded-xl text-[#007AFF] font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
      style={{ minHeight: '56px' }}
    >
      <Camera className="h-5 w-5" />
      {label} {countText}
    </button>
  );
}

interface PhotoGridProps {
  photos: Photo[];
  onRemove: (photoId: string) => void;
  primaryPhotoId?: string | null;
  onPrimaryToggle?: (photoId: string) => void;
}

function PhotoGrid({ photos, onRemove, primaryPhotoId, onPrimaryToggle }: PhotoGridProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {photos.map((photo) => {
        const isPrimary = primaryPhotoId === photo.id;
        return (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img
              src={photo.url}
              alt={photo.name}
              className="w-full h-full object-cover"
            />
            {/* Delete button — top-right corner */}
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Primary photo star — bottom-right corner, only shown when onPrimaryToggle is provided */}
            {onPrimaryToggle && (
              <button
                type="button"
                onClick={() => onPrimaryToggle(photo.id)}
                aria-label={isPrimary ? 'Primary cover photo' : 'Set as primary cover photo'}
                className="absolute bottom-2 right-2 flex items-center justify-center p-2"
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <Star
                  className={`h-6 w-6 drop-shadow ${
                    isPrimary
                      ? 'fill-yellow-400 stroke-yellow-500'
                      : 'fill-transparent stroke-gray-200'
                  }`}
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SinglePhotoProps {
  photo: Photo | null;
  onCapture: () => void;
  onRemove: () => void;
  label: string;
}

function SinglePhoto({ photo, onCapture, onRemove, label }: SinglePhotoProps) {
  if (photo) {
    return (
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
        <img src={photo.url} alt={label} className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <PhotoUploadButton onClick={onCapture} label={label} />
  );
}

interface FooterProps {
  onSave: () => void;
  onPrevious?: () => void;
  onNext: () => void;
  isSaving: boolean;
  showPrevious: boolean;
  isLastSection: boolean;
}

function Footer({ onSave, onPrevious, onNext, isSaving, showPrevious, isLastSection }: FooterProps) {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="w-full h-14 bg-[#007AFF] text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save
            </>
          )}
        </button>

        <div className="flex gap-3">
          {showPrevious && (
            <button
              onClick={onPrevious}
              className="flex-1 text-center text-[#007AFF] font-semibold text-base py-2 flex items-center justify-center gap-1 active:opacity-70 bg-gray-100 rounded-lg"
              style={{ minHeight: '48px' }}
            >
              <ArrowLeft className="h-5 w-5" />
              Previous
            </button>
          )}
          <button
            onClick={onNext}
            className={`${showPrevious ? 'flex-1' : 'w-full'} text-center text-[#007AFF] font-semibold text-base py-2 flex items-center justify-center gap-1 active:opacity-70`}
            style={{ minHeight: '48px' }}
          >
            {isLastSection ? 'Complete' : 'Next Section'}
            {isLastSection ? <CheckCircle2 className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

interface SectionProps {
  formData: InspectionFormData;
  onChange: (field: keyof InspectionFormData, value: any) => void;
  onAreaChange?: (areaId: string, field: keyof InspectionArea, value: any) => void;
  onAddArea?: () => void;
  onRemoveArea?: (areaId: string) => void;
  onPhotoCapture?: (type: string, areaId?: string, readingId?: string) => void;
  onPhotoRemove?: (type: string, photoId: string, areaId?: string, readingId?: string) => void;
  onMoistureReadingAdd?: (areaId: string) => void;
  onMoistureReadingRemove?: (areaId: string, readingId: string) => void;
  onMoistureReadingChange?: (areaId: string, readingId: string, field: keyof MoistureReading, value: any) => void;
  onSubfloorReadingAdd?: () => void;
  onSubfloorReadingRemove?: (readingId: string) => void;
  onSubfloorReadingChange?: (readingId: string, field: keyof SubfloorReading, value: string) => void;
  onCalculateDewPoint?: (areaId?: string) => void;
}

// Section 1: Basic Information
function Section1BasicInfo({ formData, onChange }: SectionProps) {
  return (
    <section className="space-y-5">
      <FormField label="Job Number">
        <ReadOnlyInput value={formData.jobNumber || 'Assigned on first save'} />
      </FormField>

      <FormField label="Triage (Job Description)">
        <textarea
          rows={3}
          value={formData.triage}
          onChange={(e) => onChange('triage', e.target.value)}
          placeholder="Describe the issue..."
          className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none"
        />
      </FormField>

      <FormField label="Address">
        <input
          type="text"
          value={formData.address}
          onChange={(e) => onChange('address', e.target.value)}
          className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
        />
      </FormField>

      <FormField label="Inspector" required>
        <ReadOnlyInput value={formData.inspector} />
      </FormField>

      <FormField label="Requested By">
        <input
          type="text"
          value={formData.requestedBy}
          onChange={(e) => onChange('requestedBy', e.target.value)}
          className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
        />
      </FormField>

      <FormField label="Attention To">
        <input
          type="text"
          value={formData.attentionTo}
          onChange={(e) => onChange('attentionTo', e.target.value)}
          placeholder="Company or person name"
          className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
        />
      </FormField>

      <FormField label="Inspection Date" required>
        <input
          type="date"
          value={formData.inspectionDate}
          onChange={(e) => onChange('inspectionDate', e.target.value)}
          className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
        />
      </FormField>
    </section>
  );
}

// Section 2: Property Details
function Section2PropertyDetails({ formData, onChange }: SectionProps) {
  return (
    <section className="space-y-5">
      <FormField label="Property Occupation" required>
        <SelectInput
          value={formData.propertyOccupation}
          onChange={(value) => onChange('propertyOccupation', value)}
          options={PROPERTY_OCCUPATION_OPTIONS}
          placeholder="Select occupation status..."
        />
      </FormField>

      <FormField label="Dwelling Type" required>
        <SelectInput
          value={formData.dwellingType}
          onChange={(value) => onChange('dwellingType', value)}
          options={DWELLING_TYPE_OPTIONS}
          placeholder="Select dwelling type..."
        />
      </FormField>
    </section>
  );
}

// Section 3: Area Inspection (Repeatable)
function Section3AreaInspection({
  formData,
  onAreaChange,
  onAddArea,
  onRemoveArea,
  onPhotoCapture,
  onPhotoRemove,
  onMoistureReadingAdd,
  onMoistureReadingRemove,
  onMoistureReadingChange,
  onCalculateDewPoint,
}: SectionProps) {
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    formData.areas.forEach((area, index) => {
      initial[area.id] = index === 0; // First area expanded by default
    });
    return initial;
  });

  const toggleAreaExpansion = (areaId: string) => {
    setExpandedAreas((prev) => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const handleInfraredObservationToggle = (areaId: string, observation: string) => {
    const area = formData.areas.find((a) => a.id === areaId);
    if (!area || !onAreaChange) return;

    const observations = area.infraredObservations || [];
    const updated = observations.includes(observation)
      ? observations.filter((o) => o !== observation)
      : [...observations, observation];

    onAreaChange(areaId, 'infraredObservations', updated);
  };

  const handleMouldVisibilityToggle = (areaId: string, option: string) => {
    const area = formData.areas.find((a) => a.id === areaId);
    if (!area || !onAreaChange) return;

    const current = area.mouldVisibleLocations || [];
    const isSelected = current.includes(option);

    if (option === 'No mould visible') {
      // Toggling "No mould visible" clears everything else
      onAreaChange(areaId, 'mouldVisibleLocations', isSelected ? [] : ['No mould visible']);
    } else {
      // Toggling any other option removes "No mould visible"
      const withoutNone = current.filter((o) => o !== 'No mould visible');
      const updated = isSelected
        ? withoutNone.filter((o) => o !== option)
        : [...withoutNone, option];
      onAreaChange(areaId, 'mouldVisibleLocations', updated);
    }
  };

  return (
    <section className="space-y-4">
      {formData.areas.map((area, index) => (
        <div
          key={area.id}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Area Header */}
          <div
            className="p-4 flex items-center justify-between bg-gray-50 cursor-pointer"
            onClick={() => toggleAreaExpansion(area.id)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <span className="font-semibold text-[#1d1d1f]">
                {area.areaName || `Area ${index + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {formData.areas.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveArea?.(area.id);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              {expandedAreas[area.id] ? <ChevronUp className="h-5 w-5 text-[#86868b]" /> : <ChevronDown className="h-5 w-5 text-[#86868b]" />}
            </div>
          </div>

          {/* Area Content */}
          {expandedAreas[area.id] && (
            <div className="p-4 space-y-5 border-t border-gray-100">
              {/* Area Name */}
              <FormField label="Area Name" required>
                <input
                  type="text"
                  value={area.areaName}
                  onChange={(e) => onAreaChange?.(area.id, 'areaName', e.target.value)}
                  placeholder="e.g., Master Bedroom, Kitchen..."
                  className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                />
              </FormField>

              {/* Visible Mould Checkboxes */}
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">Visible Mould</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MOULD_VISIBILITY_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                        area.mouldVisibleLocations?.includes(option)
                          ? 'bg-amber-100 border-amber-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      style={{ minHeight: '48px' }}
                    >
                      <input
                        type="checkbox"
                        checked={area.mouldVisibleLocations?.includes(option) || false}
                        onChange={() => handleMouldVisibilityToggle(area.id, option)}
                        className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-[#1d1d1f] text-sm">{option}</span>
                    </label>
                  ))}
                </div>
                {/* Custom mould location */}
                <div className="pt-2">
                  <label className="text-xs text-amber-700 font-medium mb-1 block">Custom location (if not listed)</label>
                  <textarea
                    rows={2}
                    value={area.mouldVisibleCustom || ''}
                    onChange={(e) => onAreaChange?.(area.id, 'mouldVisibleCustom', e.target.value)}
                    placeholder="e.g., Behind fridge, Grout between shower tiles..."
                    className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* Comments for Report */}
              <FormField label="Comments for Report">
                <textarea
                  rows={2}
                  value={area.commentsForReport}
                  onChange={(e) => onAreaChange?.(area.id, 'commentsForReport', e.target.value)}
                  placeholder="Additional comments..."
                  className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none"
                />
              </FormField>

              {/* Temperature & Humidity Row */}
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Temp °C">
                  <input
                    type="number"
                    value={area.temperature}
                    onChange={(e) => {
                      onAreaChange?.(area.id, 'temperature', e.target.value);
                    }}
                    onBlur={() => onCalculateDewPoint?.(area.id)}
                    placeholder="--"
                    className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-3 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  />
                  {(() => {
                    const warning = getEnvironmentReadingWarning('indoorTemperature', area.temperature);
                    return warning ? (
                      <p role="alert" className="text-xs text-amber-600 mt-1">{warning}</p>
                    ) : null;
                  })()}
                </FormField>
                <FormField label="Humidity %">
                  <input
                    type="number"
                    value={area.humidity}
                    onChange={(e) => onAreaChange?.(area.id, 'humidity', e.target.value)}
                    onBlur={() => onCalculateDewPoint?.(area.id)}
                    placeholder="--"
                    className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-3 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  />
                  {(() => {
                    const warning = getEnvironmentReadingWarning('indoorHumidity', area.humidity);
                    return warning ? (
                      <p role="alert" className="text-xs text-amber-600 mt-1">{warning}</p>
                    ) : null;
                  })()}
                </FormField>
                <FormField label="Dew Point">
                  <input
                    type="text"
                    value={area.dewPoint ? `${area.dewPoint}°C` : '--'}
                    readOnly
                    className="w-full h-12 bg-[#f5f7f8] text-[#86868b] text-base rounded-lg border border-gray-200 px-3"
                  />
                </FormField>
              </div>

              {/* Internal Moisture % */}
              {area.moistureReadings[0] && (() => {
                const reading = area.moistureReadings[0];
                const warning = getEnvironmentReadingWarning('moisture', reading.reading);
                return (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Internal Moisture %
                    </span>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={reading.reading}
                        onChange={(e) => onMoistureReadingChange?.(area.id, reading.id, 'reading', e.target.value)}
                        placeholder="0-100"
                        min="0"
                        max="100"
                        className="flex-1 h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                      />
                      {reading.photo ? (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <img src={reading.photo.url} alt="" className="w-full h-full rounded-lg object-cover" />
                          <button
                            onClick={() => onPhotoRemove?.('moisture', reading.photo!.id, area.id, reading.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onPhotoCapture?.('single', area.id, reading.id)}
                          className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-[#007AFF] flex-shrink-0"
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    {warning && (
                      <p role="alert" className="text-xs text-amber-600 mt-1">{warning}</p>
                    )}
                    <input
                      type="text"
                      value={reading.title}
                      onChange={(e) => onMoistureReadingChange?.(area.id, reading.id, 'title', e.target.value)}
                      placeholder="Location (e.g., Wall near window)"
                      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                    />
                  </div>
                );
              })()}

              {/* External Moisture % */}
              {area.moistureReadings[1] && (() => {
                const reading = area.moistureReadings[1];
                const warning = getEnvironmentReadingWarning('moisture', reading.reading);
                return (
                  <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      External Moisture %
                    </span>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={reading.reading}
                        onChange={(e) => onMoistureReadingChange?.(area.id, reading.id, 'reading', e.target.value)}
                        placeholder="0-100"
                        min="0"
                        max="100"
                        className="flex-1 h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                      />
                      {reading.photo ? (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <img src={reading.photo.url} alt="" className="w-full h-full rounded-lg object-cover" />
                          <button
                            onClick={() => onPhotoRemove?.('moisture', reading.photo!.id, area.id, reading.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onPhotoCapture?.('single', area.id, reading.id)}
                          className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-[#007AFF] flex-shrink-0"
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    {warning && (
                      <p role="alert" className="text-xs text-amber-800 font-medium mt-1">{warning}</p>
                    )}
                    <input
                      type="text"
                      value={reading.title}
                      onChange={(e) => onMoistureReadingChange?.(area.id, reading.id, 'title', e.target.value)}
                      placeholder="Location (e.g., External wall cavity)"
                      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                    />
                  </div>
                );
              })()}

              {/* Internal Notes */}
              <FormField label="Internal Notes (Not in Report)">
                <textarea
                  rows={2}
                  value={area.internalNotes}
                  onChange={(e) => onAreaChange?.(area.id, 'internalNotes', e.target.value)}
                  placeholder="Private notes for office..."
                  className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none"
                />
              </FormField>

              {/* Extra Notes */}
              <FormField label="Extra Notes">
                <textarea
                  id={`extra-notes-${area.id}`}
                  rows={3}
                  value={area.extraNotes}
                  onChange={(e) => onAreaChange?.(area.id, 'extraNotes', e.target.value)}
                  placeholder="Anything specific about this area worth noting?"
                  className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none min-h-[120px]"
                />
              </FormField>

              {/* ── PHOTO GALLERY ── */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] ml-1">
                  Photo Gallery
                </span>

                {/* Room View Photos */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-slate-600" />
                    <span className="text-sm font-semibold text-[#1d1d1f]">Room View Photos</span>
                    <span className="text-xs text-[#86868b] ml-auto">{area.roomViewPhotos.length}/{MAX_ROOM_VIEW_PHOTOS}</span>
                  </div>
                  {area.roomViewPhotos.length > 0 && (
                    <p className="text-xs text-[#86868b] flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 stroke-yellow-500" />
                      Tap a star to set the primary cover photo for this area.
                    </p>
                  )}
                  {area.roomViewPhotos.length < MAX_ROOM_VIEW_PHOTOS && (
                    <PhotoUploadButton
                      onClick={() => onPhotoCapture?.('roomView', area.id)}
                      label="Add Room Photos"
                      count={area.roomViewPhotos.length}
                      maxCount={4}
                    />
                  )}
                  <PhotoGrid
                    photos={area.roomViewPhotos}
                    onRemove={(photoId) => onPhotoRemove?.('roomView', photoId, area.id)}
                    primaryPhotoId={area.primaryPhotoId}
                    onPrimaryToggle={(photoId) =>
                      onAreaChange?.(area.id, 'primaryPhotoId', photoId === area.primaryPhotoId ? null : photoId)
                    }
                  />
                </div>

                {/* Infrared Inspection Photo */}
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900">Infrared Inspection</span>
                    </div>
                    <ToggleSwitch
                      checked={area.infraredEnabled}
                      onChange={(checked) => onAreaChange?.(area.id, 'infraredEnabled', checked)}
                    />
                  </div>
                  {area.infraredEnabled && (
                    <div className="space-y-3">
                      <SinglePhoto
                        photo={area.infraredPhoto}
                        onCapture={() => onPhotoCapture?.('infrared', area.id)}
                        onRemove={() => onPhotoRemove?.('infrared', area.infraredPhoto?.id || '', area.id)}
                        label="Capture Infrared"
                      />
                    </div>
                  )}
                </div>

                {/* Natural Light Comparison Photo */}
                {area.infraredEnabled && (
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sun className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-900">Natural Light Comparison</span>
                    </div>
                    <SinglePhoto
                      photo={area.naturalInfraredPhoto}
                      onCapture={() => onPhotoCapture?.('naturalInfrared', area.id)}
                      onRemove={() => onPhotoRemove?.('naturalInfrared', area.naturalInfraredPhoto?.id || '', area.id)}
                      label="Capture Natural Light"
                    />
                  </div>
                )}

                {/* Infrared Observations */}
                {area.infraredEnabled && (
                  <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900">Infrared Observations</span>
                    </div>
                    <div className="space-y-2">
                      {INFRARED_OBSERVATIONS.map((obs) => (
                        <label
                          key={obs}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                          style={{ minHeight: '48px' }}
                        >
                          <input
                            type="checkbox"
                            checked={area.infraredObservations.includes(obs)}
                            onChange={() => handleInfraredObservationToggle(area.id, obs)}
                            className="w-5 h-5 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]"
                          />
                          <span className="text-[#1d1d1f] text-sm">{obs}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Time Without Demo */}
              <FormField label="Time Without Demolition (Hours)" required>
                <NumberInput
                  value={area.timeWithoutDemo}
                  onChange={(value) => onAreaChange?.(area.id, 'timeWithoutDemo', value)}
                  step={0.5}
                  placeholder="Enter hours"
                  unit="hrs"
                />
              </FormField>

              {/* Demolition Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-[#1d1d1f]">Demolition Required</span>
                <ToggleSwitch
                  checked={area.demolitionRequired}
                  onChange={(checked) => onAreaChange?.(area.id, 'demolitionRequired', checked)}
                />
              </div>

              {/* Demolition Section */}
              {area.demolitionRequired && (
                <div className="space-y-4 pl-4 border-l-2 border-orange-400">
                  <FormField label="Demolition Time (Hours)" required>
                    <NumberInput
                      value={area.demolitionTime}
                      onChange={(value) => onAreaChange?.(area.id, 'demolitionTime', value)}
                      step={0.5}
                      placeholder="Enter hours"
                      unit="hrs"
                    />
                  </FormField>

                  <FormField label="Demolition Description">
                    <textarea
                      rows={2}
                      value={area.demolitionDescription}
                      onChange={(e) => onAreaChange?.(area.id, 'demolitionDescription', e.target.value)}
                      placeholder="Describe demolition work..."
                      className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
                    />
                  </FormField>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Area Button */}
      <button
        onClick={onAddArea}
        className="w-full h-14 bg-[#007AFF] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Plus className="h-5 w-5" />
        Add Another Area
      </button>
    </section>
  );
}

// Section 4: Subfloor
function Section4Subfloor({
  formData,
  onChange,
  onPhotoCapture,
  onPhotoRemove,
  onSubfloorReadingAdd,
  onSubfloorReadingRemove,
  onSubfloorReadingChange,
}: SectionProps) {
  // B3: subfloorRequired is a 2-button selector (Yes / No) with null as the
  // un-selected default. "Not yet determined" is the absence of a selection,
  // surfaced via the inline amber warning + submit-time validation — NOT a
  // third button. Internal value is tristate (null | true | false) so the
  // save path can distinguish "tech hasn't decided yet" from explicit false.
  const subfloorRequired = formData.subfloorRequired;

  return (
    <section className="space-y-5">
      {/* Section Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1d1d1f]">Subfloor Assessment</h3>
            <p className="text-sm text-[#86868b]">Document subfloor condition and findings</p>
          </div>
        </div>
      </div>

      {/* B3: 2-button subfloor presence selector (Yes / No). Null default surfaces
          as the un-selected state + amber warning; submit validation enforces a choice. */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div>
          <span className="text-sm font-medium text-[#1d1d1f]">Does the property have a subfloor?</span>
          {subfloorRequired === null && (
            <p className="text-xs text-amber-600 mt-1">Please confirm before submitting the inspection.</p>
          )}
        </div>
        <div className="flex gap-3">
          {([
            [true, 'Yes'] as const,
            [false, 'No'] as const,
          ]).map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => onChange('subfloorRequired', value)}
              className={`flex-1 h-12 rounded-lg font-medium transition-colors ${
                subfloorRequired === value
                  ? value
                    ? 'bg-orange-500 text-white'
                    : 'bg-[#86868b] text-white'
                  : 'bg-white border border-gray-200 text-[#1d1d1f]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {subfloorRequired === false && (
          <p className="text-sm text-[#86868b] italic">No subfloor — section skipped.</p>
        )}
      </div>

      {/* Remainder of section only shows when subfloor is present or undetermined */}
      {subfloorRequired !== false && (
      <div className={`space-y-5 ${subfloorRequired === null ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* Observations */}
      <FormField label="Subfloor Observation">
        <textarea
          rows={3}
          value={formData.subfloorObservations}
          onChange={(e) => onChange('subfloorObservations', e.target.value)}
          placeholder="Describe subfloor condition..."
          className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
        />
      </FormField>

      {/* Landscape */}
      <FormField label="Subfloor Landscape">
        <div className="flex gap-3">
          {([['flat_block', 'Flat Block'], ['sloping_block', 'Sloping Block']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange('subfloorLandscape', value)}
              className={`flex-1 h-12 rounded-lg font-medium transition-colors ${
                formData.subfloorLandscape === value
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-white border border-gray-200 text-[#1d1d1f]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </FormField>

      {/* Comments */}
      <FormField label="Subfloor Comments">
        <textarea
          rows={3}
          value={formData.subfloorComments}
          onChange={(e) => onChange('subfloorComments', e.target.value)}
          placeholder="Additional notes..."
          className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
        />
      </FormField>

      {/* ── SUBFLOOR MOISTURE READINGS ── */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] ml-1">
          Subfloor Moisture Readings
        </span>

        {formData.subfloorReadings.map((reading, index) => {
          const warning = getEnvironmentReadingWarning('moisture', reading.reading);
          return (
          <div key={reading.id} className="bg-orange-50 rounded-xl border border-orange-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
                Reading {index + 1}
              </span>
              <button
                onClick={() => onSubfloorReadingRemove?.(reading.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <input
              type="text"
              value={reading.location}
              onChange={(e) => onSubfloorReadingChange?.(reading.id, 'location', e.target.value)}
              placeholder="Location (e.g., Under shower area)"
              className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
            />

            <input
              type="number"
              value={reading.reading}
              onChange={(e) => onSubfloorReadingChange?.(reading.id, 'reading', e.target.value)}
              placeholder="Moisture % (0-100)"
              min="0"
              max="100"
              className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
            />
            {warning && (
              <p role="alert" className="text-xs text-amber-600 mt-1">{warning}</p>
            )}
          </div>
          );
        })}

        <button
          onClick={onSubfloorReadingAdd}
          className="w-full h-14 bg-white border-2 border-dashed border-orange-300 rounded-xl text-orange-600 font-medium flex items-center justify-center gap-2 hover:bg-orange-50 active:bg-orange-100 transition-colors"
          style={{ minHeight: '56px' }}
        >
          <Plus className="h-5 w-5" />
          Add Another Reading
        </button>
      </div>

      {/* ── SUBFLOOR PHOTOS ── */}
      <div className="space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] ml-1">
          Subfloor Documentation Photos
        </span>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-slate-600" />
            <span className="text-sm font-semibold text-[#1d1d1f]">Subfloor Photos</span>
            <span className="text-xs text-[#86868b] ml-auto">{formData.subfloorPhotos.length}/{MAX_SUBFLOOR_PHOTOS}</span>
          </div>
          {formData.subfloorPhotos.length < MAX_SUBFLOOR_PHOTOS && (
            <PhotoUploadButton
              onClick={() => onPhotoCapture?.('subfloor')}
              label="Add Subfloor Photos"
              count={formData.subfloorPhotos.length}
              maxCount={20}
            />
          )}
          <PhotoGrid
            photos={formData.subfloorPhotos}
            onRemove={(photoId) => onPhotoRemove?.('subfloor', photoId)}
          />
        </div>
      </div>

      {/* ── SANITATION & TREATMENT ── */}
      <div className="space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] ml-1">
          Treatment Details
        </span>

        {/* Sanitation Toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-teal-600" />
            <span className="font-medium text-[#1d1d1f]">Subfloor Sanitation</span>
          </div>
          <ToggleSwitch
            checked={formData.subfloorSanitation}
            onChange={(checked) => onChange('subfloorSanitation', checked)}
          />
        </div>

        {/* Treatment Time */}
        <FormField label="Treatment Time (Hours)">
          <NumberInput
            value={formData.subfloorTreatmentTime}
            onChange={(value) => onChange('subfloorTreatmentTime', value)}
            step={0.5}
            placeholder="Enter hours"
            unit="hrs"
          />
        </FormField>
      </div>

      </div>
      )}
    </section>
  );
}

// Section 5: Outdoor Info
function Section5OutdoorInfo({
  formData,
  onChange,
  onPhotoCapture,
  onPhotoRemove,
  onCalculateDewPoint,
}: SectionProps) {
  const outdoorTemperatureWarning = getEnvironmentReadingWarning('outdoorTemperature', formData.outdoorTemperature);
  const outdoorHumidityWarning = getEnvironmentReadingWarning('outdoorHumidity', formData.outdoorHumidity);

  return (
    <section className="space-y-5">
      {/* Temperature & Humidity Row */}
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Temp °C">
          <input
            type="number"
            value={formData.outdoorTemperature}
            onChange={(e) => onChange('outdoorTemperature', e.target.value)}
            onBlur={() => onCalculateDewPoint?.()}
            placeholder="--"
            className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-3"
          />
          {outdoorTemperatureWarning && (
            <p role="alert" className="text-xs text-amber-600 mt-1">{outdoorTemperatureWarning}</p>
          )}
        </FormField>
        <FormField label="Humidity %">
          <input
            type="number"
            value={formData.outdoorHumidity}
            onChange={(e) => onChange('outdoorHumidity', e.target.value)}
            onBlur={() => onCalculateDewPoint?.()}
            placeholder="--"
            className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-3"
          />
          {outdoorHumidityWarning && (
            <p role="alert" className="text-xs text-amber-600 mt-1">{outdoorHumidityWarning}</p>
          )}
        </FormField>
        <FormField label="Dew Point">
          <input
            type="text"
            value={formData.outdoorDewPoint ? `${formData.outdoorDewPoint}°C` : '--'}
            readOnly
            className="w-full h-12 bg-[#f5f7f8] text-[#86868b] text-base rounded-lg border border-gray-200 px-3"
          />
        </FormField>
      </div>

      {/* Comments */}
      <FormField label="Outdoor Comments">
        <textarea
          rows={2}
          value={formData.outdoorComments}
          onChange={(e) => onChange('outdoorComments', e.target.value)}
          placeholder="Outdoor observations..."
          className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
        />
      </FormField>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Front Door">
          <SinglePhoto
            photo={formData.frontDoorPhoto}
            onCapture={() => onPhotoCapture?.('frontDoor')}
            onRemove={() => onPhotoRemove?.('frontDoor', formData.frontDoorPhoto?.id || '')}
            label="Front Door"
          />
        </FormField>

        <FormField label="Front House">
          <SinglePhoto
            photo={formData.frontHousePhoto}
            onCapture={() => onPhotoCapture?.('frontHouse')}
            onRemove={() => onPhotoRemove?.('frontHouse', formData.frontHousePhoto?.id || '')}
            label="Front House"
          />
        </FormField>

        <FormField label="Mailbox">
          <SinglePhoto
            photo={formData.mailboxPhoto}
            onCapture={() => onPhotoCapture?.('mailbox')}
            onRemove={() => onPhotoRemove?.('mailbox', formData.mailboxPhoto?.id || '')}
            label="Mailbox"
          />
        </FormField>

        <FormField label="Street View">
          <SinglePhoto
            photo={formData.streetPhoto}
            onCapture={() => onPhotoCapture?.('street')}
            onRemove={() => onPhotoRemove?.('street', formData.streetPhoto?.id || '')}
            label="Street View"
          />
        </FormField>
      </div>

      {/* Direction Photos Toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div>
          <span className="font-semibold text-[#1d1d1f]">Direction Photos</span>
          <p className="text-sm text-[#86868b]">For technician reference</p>
        </div>
        <ToggleSwitch
          checked={formData.directionPhotosEnabled}
          onChange={(checked) => onChange('directionPhotosEnabled', checked)}
        />
      </div>

      {formData.directionPhotosEnabled && (
        <FormField label="Direction Photo">
          <SinglePhoto
            photo={formData.directionPhoto}
            onCapture={() => onPhotoCapture?.('direction')}
            onRemove={() => onPhotoRemove?.('direction', formData.directionPhoto?.id || '')}
            label="Direction"
          />
        </FormField>
      )}
    </section>
  );
}

// Section 6: Waste Disposal — cubic-metre pricing with explicit confirm/override.
function Section6WasteDisposal({ formData, onChange }: SectionProps) {
  const waste = formData.wasteDisposal ?? {
    enabled: formData.wasteDisposalEnabled,
    cubicMeters: null,
    calculatedCost: null,
    confirmedCost: null,
    isOverridden: false,
  };

  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState<number>(waste.confirmedCost ?? 0);

  const setWaste = (patch: Partial<NonNullable<InspectionFormData['wasteDisposal']>>) => {
    onChange('wasteDisposal', { ...waste, ...patch });
  };

  const handleToggle = (enabled: boolean) => {
    onChange('wasteDisposalEnabled', enabled); // keep legacy field in sync
    setWaste({ enabled });
  };

  // Any m³ change re-derives the calculated price and resets confirmation —
  // the tech must explicitly re-confirm so a stale price never reaches the total.
  const applyM3 = (m3: number) => {
    const rounded = m3 > 0 ? round2(m3) : 0;
    setWaste({
      cubicMeters: rounded > 0 ? rounded : null,
      calculatedCost: rounded > 0 ? calculateWasteDisposalCost(rounded) : null,
      confirmedCost: null,
      isOverridden: false,
    });
    setIsEditingOverride(false);
  };

  const stepM3 = (delta: number) => {
    const next = Math.min(50, Math.max(0, round2((waste.cubicMeters ?? 0) + delta)));
    applyM3(next);
  };

  const m3 = waste.cubicMeters ?? 0;
  const calculated = waste.calculatedCost ?? 0;
  const confirmed = waste.confirmedCost;

  return (
    <section className="space-y-5">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div>
          <span className="font-semibold text-[#1d1d1f]">Waste Disposal Required</span>
          <p className="text-sm text-[#86868b]">Enter the bin size and confirm the price</p>
        </div>
        <ToggleSwitch checked={waste.enabled} onChange={handleToggle} />
      </div>

      {waste.enabled && (
        <div className="space-y-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Bin size (m³) with steppers */}
          <FormField label="Bin size (m³)">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepM3(-0.5)}
                className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold text-xl shrink-0"
                style={{ minWidth: '48px', minHeight: '48px' }}
                aria-label="Decrease bin size"
              >
                −
              </button>
              <input
                type="number"
                inputMode="decimal"
                value={m3 || ''}
                onChange={(e) => applyM3(parseFloat(e.target.value) || 0)}
                min={0.5}
                max={50}
                step={0.5}
                placeholder="0.0"
                className="w-full h-12 bg-white text-[#1d1d1f] text-base text-center rounded-lg border border-gray-200 px-2 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                style={{ minHeight: '48px' }}
              />
              <button
                type="button"
                onClick={() => stepM3(0.5)}
                className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold text-xl shrink-0"
                style={{ minWidth: '48px', minHeight: '48px' }}
                aria-label="Increase bin size"
              >
                +
              </button>
            </div>
          </FormField>

          {m3 > 0 && (
            <p className="text-sm text-[#86868b]">
              Calculated:{' '}
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(calculated)}</span> ex GST
            </p>
          )}

          {/* Legacy back-compat: surface the old dropdown value if no m³ recorded yet. */}
          {waste.cubicMeters == null && formData.wasteDisposalAmount && (
            <p className="text-sm text-[#86868b] italic">
              Previously recorded as: {formData.wasteDisposalAmount}
            </p>
          )}

          {/* Unconfirmed → require explicit confirmation */}
          {m3 > 0 && confirmed == null && (
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                Price unconfirmed
              </span>
              <button
                type="button"
                onClick={() => setWaste({ confirmedCost: calculated, isOverridden: false })}
                className="w-full h-12 bg-[#007AFF] text-white font-semibold rounded-lg flex items-center justify-center"
                style={{ minHeight: '48px' }}
              >
                Confirm Price — {formatCurrency(calculated)}
              </button>
            </div>
          )}

          {/* Confirmed / overridden state */}
          {confirmed != null && !isEditingOverride && (
            <div className="space-y-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  waste.isOverridden ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                }`}
              >
                {waste.isOverridden
                  ? `✓ Overridden — ${formatCurrency(confirmed)}`
                  : `✓ Confirmed — ${formatCurrency(confirmed)}`}
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setOverrideDraft(confirmed);
                    setIsEditingOverride(true);
                  }}
                  className="text-sm text-[#007AFF] font-medium py-2"
                >
                  Edit price
                </button>
                {waste.isOverridden && (
                  <button
                    type="button"
                    onClick={() => setWaste({ confirmedCost: calculated, isOverridden: false })}
                    className="text-sm text-[#86868b] py-2"
                  >
                    Reset to calculated
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Inline override editor */}
          {confirmed != null && isEditingOverride && (
            <div className="space-y-2">
              <FormField label="Override price (ex GST)">
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#86868b]">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={overrideDraft || ''}
                    onChange={(e) => setOverrideDraft(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 pl-8 pr-4 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                    style={{ minHeight: '48px' }}
                  />
                </div>
              </FormField>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWaste({ confirmedCost: round2(overrideDraft), isOverridden: true });
                    setIsEditingOverride(false);
                  }}
                  className="flex-1 h-12 bg-[#007AFF] text-white font-semibold rounded-lg"
                  style={{ minHeight: '48px' }}
                >
                  Save Override
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingOverride(false)}
                  className="h-12 px-4 bg-gray-100 text-[#1d1d1f] rounded-lg"
                  style={{ minHeight: '48px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Section 7: Work Procedure — Treatment method constants
const SHARED_TREATMENT_METHODS = [
  'HEPA Vacuuming',
  'Surface Remediation Treatment',
  'ULV Fogging - Property',
  'ULV Fogging - Subfloor',
  'Subfloor Remediation',
  'HEPA Air Scrubber Installation',
  'Drying Equipment',
  'Containment and Prep',
];
const OPTION_2_ONLY_METHODS = ['Material Demolition', 'Cavity Treatment', 'Debris Removal'];

// HEPA qty only counts while the method toggle is on — toggling it off keeps the
// entered numbers in state but stops them feeding calcs and saves.
// Same contract for drying equipment: the method toggle is the single source of
// truth for whether it is quoted. Without this the toggle only hid the UI while
// the quantities kept feeding pricing and kept being saved, so a tech who turned
// it off still billed the customer for equipment they could no longer see.
const getEffectiveDryingQty = (
  formData: InspectionFormData,
  field: 'commercialDehumidifierQty' | 'airMoversQty' | 'rcdBoxQty',
) =>
  formData.selectedTreatmentMethods?.includes('Drying Equipment')
    ? (formData[field] || 0)
    : 0;

const getEffectiveHepaQty = (formData: InspectionFormData) =>
  formData.selectedTreatmentMethods?.includes('HEPA Air Scrubber Installation')
    ? (formData.hepaAirScrubberQty || 0)
    : 0;

// Hours for the quote being priced: per area, demolition replaces surface treatment, except
// on a single Option 1 quote where every area is surface-treated (labourHours.ts).
const getQuoteHours = (formData: InspectionFormData) =>
  deriveQuoteHours(
    formData.areas.map(areaFormToLabourInput),
    formData.subfloorTreatmentTime || 0,
    formData.optionSelected
  );

// Both-mode Option 1 basis: every area's surface time, demolished areas included.
const getSurfaceHours = (formData: InspectionFormData) =>
  deriveSurfaceHours(formData.areas.map(areaFormToLabourInput));

// Labour work days, derived exactly the way the pricing engine derives equipment days.
const getLabourWorkDays = (formData: InspectionFormData) =>
  deriveEquipmentDays(getQuoteHours(formData).total);

// Explicit shared hire period. Counts only while Drying Equipment is quoted (the stepper
// lives in that card) and only when it extends past the labour days: equipment_days
// persists the EFFECTIVE value, so reconcileLoadedEquipmentDays can only recover a period
// that exceeds what the hours derive — applying the same floor here keeps the session and
// a reload pricing identical. `|| 0` guards a restored pre-equipmentDays localStorage backup.
const getExplicitEquipmentDays = (formData: InspectionFormData) => {
  if (!formData.selectedTreatmentMethods?.includes('Drying Equipment')) return 0;
  const explicit = formData.equipmentDays || 0;
  return explicit > getLabourWorkDays(formData) ? explicit : 0;
};

// Effective shared equipment days — the same resolution the pricing engine applies. Used
// for the HEPA "Auto (N)" display and the AI payload (project duration + resolved HEPA days).
const getSharedEquipmentDays = (formData: InspectionFormData) =>
  getExplicitEquipmentDays(formData) || getLabourWorkDays(formData);

function Section7WorkProcedure({ formData, onChange }: SectionProps) {
  const selected = formData.selectedTreatmentMethods;
  const optionSelected = formData.optionSelected;

  const toggleMethod = (method: string) => {
    const next = selected.includes(method)
      ? selected.filter((m) => m !== method)
      : [...selected, method];
    onChange('selectedTreatmentMethods', next);
  };

  const handleOptionChange = (option: number) => {
    onChange('optionSelected', option);
    // When switching TO Option 1, remove Option 2-only methods
    if (option === 1) {
      const filtered = selected.filter((m) => !OPTION_2_ONLY_METHODS.includes(m));
      if (filtered.length !== selected.length) {
        onChange('selectedTreatmentMethods', filtered);
      }
    }
    // Option 2 and Both (3) show all methods — no filtering needed
  };

  const availableMethods = (optionSelected === 2 || optionSelected === 3)
    ? [...SHARED_TREATMENT_METHODS, ...OPTION_2_ONLY_METHODS]
    : SHARED_TREATMENT_METHODS;

  const dryingEquipmentEnabled = selected.includes('Drying Equipment');
  const hepaAirScrubberEnabled = selected.includes('HEPA Air Scrubber Installation');

  const sharedEquipmentDays = getSharedEquipmentDays(formData);
  const labourWorkDays = getLabourWorkDays(formData);
  const explicitEquipmentDays = getExplicitEquipmentDays(formData);

  return (
    <section className="space-y-5">
      {/* Option Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f]">Treatment Option</h3>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => handleOptionChange(1)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              optionSelected === 1
                ? 'border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
            style={{ minHeight: '48px' }}
          >
            <div className="font-semibold text-sm">Option 1</div>
            <div className="text-xs mt-1">Surface Treatment</div>
          </button>
          <button
            onClick={() => handleOptionChange(3)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              optionSelected === 3
                ? 'border-purple-500 bg-purple-50 text-purple-600'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
            style={{ minHeight: '48px' }}
          >
            <div className="font-semibold text-sm">Both</div>
            <div className="text-xs mt-1">Show Both Prices</div>
          </button>
          <button
            onClick={() => handleOptionChange(2)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              optionSelected === 2
                ? 'border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
            style={{ minHeight: '48px' }}
          >
            <div className="font-semibold text-sm">Option 2</div>
            <div className="text-xs mt-1">Comprehensive</div>
          </button>
        </div>
      </div>

      {/* Treatment Method Toggles — shown when an option is selected */}
      {optionSelected != null && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-[#1d1d1f]">Treatment Methods</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {availableMethods.map((method) => (
              <div key={method} className="flex items-center justify-between p-4">
                <span className="text-[#1d1d1f]">{method}</span>
                <ToggleSwitch
                  checked={selected.includes(method)}
                  onChange={() => toggleMethod(method)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drying Equipment Details — shown when "Drying Equipment" is selected */}
      {dryingEquipmentEnabled && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-[#1d1d1f]">Drying Equipment Details</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Commercial Dehumidifier */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={formData.commercialDehumidifierEnabled}
                  onChange={(checked) => onChange('commercialDehumidifierEnabled', checked)}
                />
                <span className="text-[#1d1d1f]">Commercial Dehumidifier</span>
              </div>
              {formData.commercialDehumidifierEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChange('commercialDehumidifierQty', Math.max(0, formData.commercialDehumidifierQty - 1))}
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{formData.commercialDehumidifierQty}</span>
                  <button
                    onClick={() => onChange('commercialDehumidifierQty', formData.commercialDehumidifierQty + 1)}
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Air Movers */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={formData.airMoversEnabled}
                  onChange={(checked) => onChange('airMoversEnabled', checked)}
                />
                <span className="text-[#1d1d1f]">Air Movers</span>
              </div>
              {formData.airMoversEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChange('airMoversQty', Math.max(0, formData.airMoversQty - 1))}
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{formData.airMoversQty}</span>
                  <button
                    onClick={() => onChange('airMoversQty', formData.airMoversQty + 1)}
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* RCD Box */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={formData.rcdBoxEnabled}
                  onChange={(checked) => onChange('rcdBoxEnabled', checked)}
                />
                <span className="text-[#1d1d1f]">RCD Box</span>
              </div>
              {formData.rcdBoxEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChange('rcdBoxQty', Math.max(0, formData.rcdBoxQty - 1))}
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{formData.rcdBoxQty}</span>
                  <button
                    onClick={() => onChange('rcdBoxQty', formData.rcdBoxQty + 1)}
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Days — steps the EFFECTIVE hire period. Auto = the labour days; stepping below
                them snaps back to Auto because a shorter period cannot be persisted (see
                getExplicitEquipmentDays). Multiplies every item above. */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-[#1d1d1f]">Days</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = sharedEquipmentDays - 1;
                    onChange('equipmentDays', next > labourWorkDays ? next : 0);
                  }}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                >
                  -
                </button>
                <span className="min-w-[2rem] text-center font-medium whitespace-nowrap">
                  {explicitEquipmentDays > 0 ? explicitEquipmentDays : `Auto (${labourWorkDays})`}
                </span>
                <button
                  onClick={() => onChange('equipmentDays', sharedEquipmentDays + 1)}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-xs text-[#86868b]">Multiplies every item above. Auto follows the job&apos;s labour days — extend it when the equipment stays on after the crew leaves.</p>
          </div>
        </div>
      )}

      {/* HEPA Air Scrubber Details — shown when "HEPA Air Scrubber Installation" is selected */}
      {hepaAirScrubberEnabled && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-[#1d1d1f]">HEPA Air Scrubber Details</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Units — `|| 0` guards a restored pre-HEPA localStorage backup (fields absent) */}
            <div className="flex items-center justify-between">
              <span className="text-[#1d1d1f]">Units</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange('hepaAirScrubberQty', Math.max(0, (formData.hepaAirScrubberQty || 0) - 1))}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium">{formData.hepaAirScrubberQty || 0}</span>
                <button
                  onClick={() => onChange('hepaAirScrubberQty', (formData.hepaAirScrubberQty || 0) + 1)}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Days — 0 means "auto": follow the job's shared equipment days */}
            <div className="flex items-center justify-between">
              <span className="text-[#1d1d1f]">Days</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange('hepaAirScrubberDays', Math.max(0, (formData.hepaAirScrubberDays || 0) - 1))}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                >
                  -
                </button>
                <span className="min-w-[2rem] text-center font-medium whitespace-nowrap">
                  {(formData.hepaAirScrubberDays || 0) > 0 ? formData.hepaAirScrubberDays : `Auto (${sharedEquipmentDays})`}
                </span>
                <button
                  onClick={() => onChange('hepaAirScrubberDays', (formData.hepaAirScrubberDays || 0) + 1)}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[#007AFF] font-bold"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-xs text-[#86868b]">Days defaults to the job&apos;s equipment days</p>
          </div>
        </div>
      )}
    </section>
  );
}

// Section 8: Job Summary
function Section8JobSummary({ formData, onChange }: SectionProps) {
  return (
    <section className="space-y-5">
      {/* Recommend Dehumidifier */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <span className="font-semibold text-[#1d1d1f]">Recommend Dehumidifier Hire</span>
        <ToggleSwitch
          checked={formData.recommendDehumidifier}
          onChange={(checked) => onChange('recommendDehumidifier', checked)}
        />
      </div>

      {formData.recommendDehumidifier && (
        <FormField label="Dehumidifier Size">
          <SelectInput
            value={formData.dehumidifierSize}
            onChange={(value) => onChange('dehumidifierSize', value)}
            options={DEHUMIDIFIER_SIZE_OPTIONS}
            placeholder="Select size..."
          />
        </FormField>
      )}

      {/* Cause of Mould */}
      <FormField label="Cause of Mould">
        <textarea
          rows={3}
          value={formData.causeOfMould}
          onChange={(e) => onChange('causeOfMould', e.target.value)}
          placeholder="Describe the identified cause..."
          className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
        />
      </FormField>

      {/* Additional Info for Tech */}
      <FormField label="Additional Info for Technician (Internal)">
        <textarea
          rows={2}
          value={formData.additionalInfoForTech}
          onChange={(e) => onChange('additionalInfoForTech', e.target.value)}
          placeholder="Notes for treating technician..."
          className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
        />
      </FormField>

      {/* Additional Equipment Comments */}
      <FormField label="Additional Equipment Comments">
        <textarea
          rows={2}
          value={formData.additionalEquipmentComments}
          onChange={(e) => onChange('additionalEquipmentComments', e.target.value)}
          placeholder="Equipment notes..."
          className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
        />
      </FormField>

      {/* Parking Options */}
      <FormField label="Parking Options">
        <SelectInput
          value={formData.parkingOptions}
          onChange={(value) => onChange('parkingOptions', value)}
          options={PARKING_OPTIONS}
          placeholder="Select parking..."
        />
      </FormField>
    </section>
  );
}

// Section 9: Cost Estimate
function Section9CostEstimate({ formData, onChange }: SectionProps) {
  // Auto-calculate labour hours from Section 3 (areas) and Section 4 (subfloor)
  const labourHours = getQuoteHours(formData);
  const calculatedNonDemoHours = labourHours.nonDemo;
  const calculatedDemoHours = labourHours.demolition;
  const calculatedSubfloorHours = labourHours.subfloor;
  const option1SurfaceHours = getSurfaceHours(formData);
  const isSurfaceOnlyQuote = formData.optionSelected === 1;
  const isBothMode = formData.optionSelected === 3;

  // Gated by the Drying Equipment toggle, so the breakdown below and the totals
  // agree with what the toggle says is quoted.
  const dehumidifierQty = getEffectiveDryingQty(formData, 'commercialDehumidifierQty');
  const airMoverQty = getEffectiveDryingQty(formData, 'airMoversQty');
  const rcdQty = getEffectiveDryingQty(formData, 'rcdBoxQty');

  // Calculate cost estimate (full calculation with all hours — used as auto-calc reference)
  const costResult = calculateCostEstimate({
    nonDemoHours: calculatedNonDemoHours,
    demolitionHours: calculatedDemoHours,
    subfloorHours: calculatedSubfloorHours,
    dehumidifierQty,
    airMoverQty,
    rcdQty,
    equipmentDays: getExplicitEquipmentDays(formData) || undefined,
    hepaAirScrubberQty: getEffectiveHepaQty(formData),
    hepaAirScrubberDays: formData.hepaAirScrubberDays || undefined,
  });

  // For "Both" mode: also compute Option 1 (every area's surface time, no demo/subfloor)
  const option1Result = formData.optionSelected === 3
    ? calculateCostEstimate({
        nonDemoHours: option1SurfaceHours,
        demolitionHours: 0,
        subfloorHours: 0,
        dehumidifierQty,
        airMoverQty,
        rcdQty,
        equipmentDays: getExplicitEquipmentDays(formData) || undefined,
        hepaAirScrubberQty: getEffectiveHepaQty(formData),
        hepaAirScrubberDays: formData.hepaAirScrubberDays || undefined,
      })
    : null;

  const totalLabourHours = labourHours.total;

  // Editable Estimate overrides: write the parsed override (null = revert to
  // auto-calc) and keep manualPriceOverride equal to "any override present"
  // so the save path and completion validator see the canonical flag.
  const setOverride = (
    field: 'labourOverride' | 'equipmentOverride' | 'option1LabourOverride' | 'option1EquipmentOverride',
    raw: string
  ) => {
    const next = parseOverrideInput(raw);
    onChange(field, next);
    const overrides = {
      labourOverride: formData.labourOverride ?? null,
      equipmentOverride: formData.equipmentOverride ?? null,
      option1LabourOverride: formData.option1LabourOverride ?? null,
      option1EquipmentOverride: formData.option1EquipmentOverride ?? null,
      [field]: next,
    };
    onChange('manualPriceOverride', Object.values(overrides).some((v) => v != null));
  };

  return (
    <section className="space-y-5">
      {/* Labour Hours — Auto-calculated from Sections 3 & 4 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#007AFF]" />
          Labour Hours
        </h3>
        <p className="text-xs text-[#86868b] -mt-2">Auto-calculated from Area Inspection &amp; Subfloor sections</p>

        {/* Per-area breakdown */}
        {formData.areas.map((area, idx) => (
          <div key={area.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#86868b]">
              {area.areaName || `Area ${idx + 1}`}
            </span>
            {(() => {
              // A flagged area is priced on demolition once a time is entered, unless the
              // quote is Option 1 only; until then it keeps pricing as surface.
              const demolitionPriced =
                isPricedAsDemolition(areaFormToLabourInput(area)) && !isSurfaceOnlyQuote;
              const surfaceQuoted = !demolitionPriced;
              const surfaceNote = demolitionPriced
                ? (isBothMode ? ' (Option 1 only)' : ' (not quoted)')
                : (area.demolitionRequired && !isSurfaceOnlyQuote ? ' (until demolition time is entered)' : '');
              const demolitionNote = isSurfaceOnlyQuote
                ? ' (not in Option 1)'
                : demolitionPriced ? ' (replaces surface)' : ' (enter time)';
              const quoted = 'text-[#1d1d1f]';
              const muted = 'text-[#86868b]';
              return (
                <>
                  <div className="flex justify-between text-sm">
                    <span className={surfaceQuoted ? quoted : muted}>Surface Treatment{surfaceNote}</span>
                    <span className={`font-medium ${surfaceQuoted ? quoted : muted}`}>{area.timeWithoutDemo || 0}h</span>
                  </div>
                  {area.demolitionRequired && (
                    <div className="flex justify-between text-sm">
                      <span className={demolitionPriced ? quoted : muted}>Demolition{demolitionNote}</span>
                      <span className={`font-medium ${demolitionPriced ? quoted : muted}`}>{area.demolitionTime || 0}h</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ))}

        {/* Subfloor hours */}
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-orange-600" />
              <span className="text-[#1d1d1f]">Subfloor Treatment</span>
            </div>
            <span className="font-medium text-[#1d1d1f]">{calculatedSubfloorHours}h</span>
          </div>
        </div>

        {/* Total Hours */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-blue-900">Total Labour Hours</span>
            <span className="font-bold text-blue-600 text-lg">{totalLabourHours}h</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {calculatedNonDemoHours}h surface + {calculatedDemoHours}h demolition + {calculatedSubfloorHours}h subfloor
          </p>
          {isBothMode && (
            <p className="text-xs text-blue-600 mt-1">
              Option 1 (surface only): {option1SurfaceHours}h
            </p>
          )}
        </div>
      </div>

      {/* Tier Pricing Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
            <Info className="h-5 w-5 text-[#007AFF]" />
            Labour Rate Reference
          </h3>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#86868b]">
                <th className="pb-2">Type</th>
                <th className="pb-2 text-right">2h Rate</th>
                <th className="pb-2 text-right">8h Rate</th>
                <th className="pb-2 text-right">16h Rate</th>
              </tr>
            </thead>
            <tbody className="text-[#1d1d1f]">
              <tr>
                <td className="py-1">Surface Treatment</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.nonDemo.tier2h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.nonDemo.tier8h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.nonDemo.dayRates[0] + LABOUR_RATES.nonDemo.dayRates[1])}</td>
              </tr>
              <tr>
                <td className="py-1">Demolition</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.demolition.tier2h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.demolition.tier8h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.demolition.dayRates[0] + LABOUR_RATES.demolition.dayRates[1])}</td>
              </tr>
              <tr>
                <td className="py-1">Subfloor</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.subfloor.tier2h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.subfloor.tier8h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.subfloor.dayRates[0] + LABOUR_RATES.subfloor.dayRates[1])}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-[#86868b] mt-3 italic">
            2h minimum charge • Linear interpolation 2-8h • Day blocks for 8h+
          </p>
        </div>
      </div>

      {/* Labour Calculation Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[#007AFF]" />
          Labour Breakdown
        </h3>
        <div className="space-y-2 text-sm">
          {/* Non-Demo */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <span className="text-[#1d1d1f]">No Demolition</span>
              <span className="text-[#86868b] ml-2">({calculatedNonDemoHours}h)</span>
            </div>
            <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.nonDemoCost)}</span>
          </div>
          {costResult.nonDemoBreakdown.length > 0 && (
            <div className="pl-4 text-xs text-[#86868b] space-y-1 mb-2">
              {costResult.nonDemoBreakdown.map((item, i) => (
                <p key={i}>{item.description}</p>
              ))}
            </div>
          )}

          {/* Demolition */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <span className="text-[#1d1d1f]">Demolition</span>
              <span className="text-[#86868b] ml-2">({calculatedDemoHours}h)</span>
            </div>
            <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.demolitionCost)}</span>
          </div>
          {costResult.demolitionBreakdown.length > 0 && (
            <div className="pl-4 text-xs text-[#86868b] space-y-1 mb-2">
              {costResult.demolitionBreakdown.map((item, i) => (
                <p key={i}>{item.description}</p>
              ))}
            </div>
          )}

          {/* Subfloor */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <span className="text-[#1d1d1f]">Subfloor</span>
              <span className="text-[#86868b] ml-2">({calculatedSubfloorHours}h)</span>
            </div>
            <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.subfloorCost)}</span>
          </div>
          {costResult.subfloorBreakdown.length > 0 && (
            <div className="pl-4 text-xs text-[#86868b] space-y-1 mb-2">
              {costResult.subfloorBreakdown.map((item, i) => (
                <p key={i}>{item.description}</p>
              ))}
            </div>
          )}

          {/* Labour Subtotal */}
          <div className="flex justify-between items-center pt-2 font-medium">
            <span className="text-[#1d1d1f]">Labour Subtotal</span>
            <span className="text-[#1d1d1f]">{formatCurrency(costResult.labourSubtotal)}</span>
          </div>
        </div>
      </div>

      {/* Equipment Calculation Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
          <Wind className="h-5 w-5 text-[#007AFF]" />
          Equipment Breakdown ({costResult.equipment.days} day{costResult.equipment.days !== 1 ? 's' : ''})
        </h3>
        <div className="space-y-2 text-sm">
          {dehumidifierQty > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-[#1d1d1f]">Dehumidifier</span>
                <span className="text-[#86868b] ml-2">
                  ({dehumidifierQty} × ${EQUIPMENT_RATES.dehumidifier} × {costResult.equipment.days} days)
                </span>
              </div>
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.equipment.dehumidifier.cost)}</span>
            </div>
          )}
          {airMoverQty > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-[#1d1d1f]">Air Movers</span>
                <span className="text-[#86868b] ml-2">
                  ({airMoverQty} × ${EQUIPMENT_RATES.airMover} × {costResult.equipment.days} days)
                </span>
              </div>
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.equipment.airMover.cost)}</span>
            </div>
          )}
          {costResult.equipment.hepaAirScrubber.qty > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-[#1d1d1f]">HEPA Air Scrubber</span>
                <span className="text-[#86868b] ml-2">
                  ({costResult.equipment.hepaAirScrubber.qty} × ${EQUIPMENT_RATES.hepaAirScrubber} × {costResult.equipment.hepaAirScrubber.days} days)
                </span>
              </div>
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.equipment.hepaAirScrubber.cost)}</span>
            </div>
          )}
          {rcdQty > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-[#1d1d1f]">RCD Box</span>
                <span className="text-[#86868b] ml-2">
                  ({rcdQty} × ${EQUIPMENT_RATES.rcd} × {costResult.equipment.days} days)
                </span>
              </div>
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.equipment.rcd.cost)}</span>
            </div>
          )}
          {!dehumidifierQty && !airMoverQty && !rcdQty && !costResult.equipment.hepaAirScrubber.qty && (
            <p className="text-[#86868b] italic py-2">No equipment selected (set in Section 7)</p>
          )}
          {/* Equipment Total */}
          <div className="flex justify-between items-center pt-2 font-medium">
            <span className="text-[#1d1d1f]">Equipment Total</span>
            <span className="text-[#1d1d1f]">{formatCurrency(costResult.equipmentCost)}</span>
          </div>
        </div>
      </div>

      {/* Editable Estimate */}
      {formData.optionSelected === 3 && option1Result ? (
        /* Dual editable pricing for "Both" mode */
        (() => {
          // Per-field override precedence: an override present wins, null falls
          // back to live auto-calc. Replaces the all-or-nothing
          // manualPriceOverride gate, which no UI could ever switch on — typed
          // overrides were silently ignored (BUG-047's successor).
          const o1Labour = resolveOverridableValue(formData.option1LabourOverride, option1Result.labourAfterDiscount);
          const o1Equipment = resolveOverridableValue(formData.option1EquipmentOverride, option1Result.equipmentCost);
          const o1Subtotal = o1Labour + o1Equipment;
          const o1Gst = o1Subtotal * 0.1;
          const o1Total = o1Subtotal + o1Gst;

          const o2Labour = resolveOverridableValue(formData.labourOverride, costResult.labourAfterDiscount);
          const o2Equipment = resolveOverridableValue(formData.equipmentOverride, costResult.equipmentCost);
          const o2Subtotal = o2Labour + o2Equipment;
          const o2Gst = o2Subtotal * 0.1;
          const o2Total = o2Subtotal + o2Gst;

          return (
            <div className="space-y-3">
              <h3 className="font-bold text-[#1d1d1f] text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-purple-600" />
                Both Options — Editable Estimate
              </h3>
              <p className="text-xs text-[#86868b] -mt-1">Pre-filled from auto-calc. Edit Labour or Equipment to override.</p>

              <div className="grid grid-cols-2 gap-3">
                {/* Option 1 Editable Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 space-y-2">
                  <div className="text-center pb-2 border-b border-blue-200">
                    <div className="font-bold text-blue-800 text-sm">OPTION 1</div>
                    <div className="text-xs text-blue-600">Surface Treatment</div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-[#86868b] block mb-1">Labour (ex GST)</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#86868b] text-sm">$</span>
                        <input
                          type="number"
                          value={o1Labour ? Number(o1Labour).toFixed(2) : ''}
                          onChange={(e) => setOverride('option1LabourOverride', e.target.value)}
                          step={0.01}
                          className="w-full h-10 bg-white text-[#1d1d1f] text-sm rounded-lg border border-blue-200 pl-6 pr-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#86868b] block mb-1">Equipment (ex GST)</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#86868b] text-sm">$</span>
                        <input
                          type="number"
                          value={o1Equipment ? Number(o1Equipment).toFixed(2) : ''}
                          onChange={(e) => setOverride('option1EquipmentOverride', e.target.value)}
                          step={0.01}
                          className="w-full h-10 bg-white text-[#1d1d1f] text-sm rounded-lg border border-blue-200 pl-6 pr-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs pt-1">
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Subtotal</span>
                      <span className="font-medium">{formatCurrency(o1Subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">GST (10%)</span>
                      <span className="font-medium">{formatCurrency(o1Gst)}</span>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 pt-2 text-center">
                    <div className="text-xs text-blue-600">Total (inc GST)</div>
                    <div className="font-bold text-blue-800 text-xl">{formatCurrency(o1Total)}</div>
                  </div>
                </div>

                {/* Option 2 Editable Card */}
                <div className="bg-gradient-to-br from-[#007AFF]/5 to-[#007AFF]/10 rounded-xl p-3 space-y-2">
                  <div className="text-center pb-2 border-b border-[#007AFF]/20">
                    <div className="font-bold text-[#007AFF] text-sm">OPTION 2</div>
                    <div className="text-xs text-[#007AFF]/70">Comprehensive</div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-[#86868b] block mb-1">Labour (ex GST)</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#86868b] text-sm">$</span>
                        <input
                          type="number"
                          value={o2Labour ? Number(o2Labour).toFixed(2) : ''}
                          onChange={(e) => setOverride('labourOverride', e.target.value)}
                          step={0.01}
                          className="w-full h-10 bg-white text-[#1d1d1f] text-sm rounded-lg border border-[#007AFF]/20 pl-6 pr-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#86868b] block mb-1">Equipment (ex GST)</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#86868b] text-sm">$</span>
                        <input
                          type="number"
                          value={o2Equipment ? Number(o2Equipment).toFixed(2) : ''}
                          onChange={(e) => setOverride('equipmentOverride', e.target.value)}
                          step={0.01}
                          className="w-full h-10 bg-white text-[#1d1d1f] text-sm rounded-lg border border-[#007AFF]/20 pl-6 pr-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs pt-1">
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Subtotal</span>
                      <span className="font-medium">{formatCurrency(o2Subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">GST (10%)</span>
                      <span className="font-medium">{formatCurrency(o2Gst)}</span>
                    </div>
                  </div>
                  <div className="border-t border-[#007AFF]/20 pt-2 text-center">
                    <div className="text-xs text-[#007AFF]/70">Total (inc GST)</div>
                    <div className="font-bold text-[#007AFF] text-xl">{formatCurrency(o2Total)}</div>
                  </div>
                </div>
              </div>

              {/* Hours / Work Days */}
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <p className="text-xs text-[#86868b]">
                  Total Hours: {costResult.totalLabourHours}h • Work Days: {costResult.totalDays}
                </p>
              </div>
            </div>
          );
        })()
      ) : (
        /* Single option — editable estimate */
        (() => {
          // Per-field override precedence — override present wins, null falls
          // back to live auto-calc (see estimate-override.ts).
          const labour = resolveOverridableValue(formData.labourOverride, costResult.labourAfterDiscount);
          const equipment = resolveOverridableValue(formData.equipmentOverride, costResult.equipmentCost);
          // Waste disposal: confirmed, job-level pass-through — never discounted.
          const waste = formData.wasteDisposal?.confirmedCost ?? 0;
          const subtotal = labour + equipment + waste;
          const gst = subtotal * 0.1;
          const total = subtotal + gst;

          return (
            <div className="bg-gradient-to-br from-[#007AFF]/5 to-[#007AFF]/10 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-[#1d1d1f] text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#007AFF]" />
                Editable Estimate
              </h3>
              <p className="text-xs text-[#86868b] -mt-1">Pre-filled from auto-calc. Edit to override.</p>

              <div className="space-y-3">
                {/* Labour input */}
                <div>
                  <label className="text-sm text-[#86868b] block mb-1">Labour (ex GST)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]">$</span>
                    <input
                      type="number"
                      value={labour ? Number(labour).toFixed(2) : ''}
                      onChange={(e) => setOverride('labourOverride', e.target.value)}
                      step={0.01}
                      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 pl-8 pr-4"
                    />
                  </div>
                </div>

                {/* Equipment input */}
                <div>
                  <label className="text-sm text-[#86868b] block mb-1">Equipment (ex GST)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]">$</span>
                    <input
                      type="number"
                      value={equipment ? Number(equipment).toFixed(2) : ''}
                      onChange={(e) => setOverride('equipmentOverride', e.target.value)}
                      step={0.01}
                      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 pl-8 pr-4"
                    />
                  </div>
                </div>

                {/* Auto-calculated summary */}
                <div className="border-t border-[#007AFF]/20 pt-3 space-y-2 text-sm">
                  {waste > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Waste Disposal</span>
                      <span className="font-medium">{formatCurrency(waste)}</span>
                    </div>
                  )}
                  {formData.wasteDisposal?.enabled && formData.wasteDisposal?.confirmedCost == null && (
                    <div className="flex justify-between text-amber-600">
                      <span>Waste Disposal</span>
                      <span className="font-medium">⚠ unconfirmed</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#1d1d1f] font-medium">Subtotal (ex GST)</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">GST (10%)</span>
                    <span className="font-medium">{formatCurrency(gst)}</span>
                  </div>
                </div>

                <div className="border-t-2 border-[#007AFF]/30 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#1d1d1f] text-xl">Total (inc GST)</span>
                    <span className="font-bold text-[#007AFF] text-3xl">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Hours / Work Days */}
              <div className="mt-3 p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-[#86868b]">
                  Total Hours: {costResult.totalLabourHours}h • Work Days: {costResult.totalDays}
                </p>
              </div>
            </div>
          );
        })()
      )}
    </section>
  );
}

// buildPayload: construct the payload for the AI edge function
function buildAIPayload(formData: InspectionFormData, lead?: LeadData | null) {
  // Resolved HEPA values so AI summaries match the quote (qty 0 when the method
  // toggle is off; days resolve to the shared equipment days when left on auto).
  const hepaQty = getEffectiveHepaQty(formData);
  const hepaDays = hepaQty > 0
    ? ((formData.hepaAirScrubberDays || 0) > 0 ? formData.hepaAirScrubberDays : getSharedEquipmentDays(formData))
    : null;
  return {
    propertyAddress: formData.address,
    clientName: lead?.full_name,
    issueDescription: lead?.issue_description || undefined,
    internalNotes: lead?.internal_notes || undefined,
    inspectionDate: formData.inspectionDate,
    inspector: formData.inspector,
    triage: formData.triage,
    requestedBy: formData.requestedBy,
    attentionTo: formData.attentionTo,
    propertyOccupation: formData.propertyOccupation,
    dwellingType: formData.dwellingType,
    areas: formData.areas.map((a) => ({
      areaName: a.areaName,
      mouldDescription: (() => {
        const parts: string[] = [];
        if (a.mouldVisibleLocations?.length) parts.push(a.mouldVisibleLocations.join(', '));
        if (a.mouldVisibleCustom) parts.push(a.mouldVisibleCustom);
        return parts.length ? parts.join('. ') : a.mouldDescription;
      })(),
      mouldVisibility: a.mouldVisibleLocations || [],
      commentsForReport: a.commentsForReport,
      temperature: a.temperature,
      humidity: a.humidity,
      dewPoint: a.dewPoint,
      timeWithoutDemo: a.timeWithoutDemo,
      demolitionRequired: a.demolitionRequired,
      demolitionTime: a.demolitionTime,
      demolitionDescription: a.demolitionDescription,
      moistureReadings: a.moistureReadings.map((r) => ({ title: r.title, reading: r.reading })),
      externalMoisture: a.externalMoisture,
      extraNotes: a.extraNotes,
      infraredEnabled: a.infraredEnabled,
      infraredObservations: a.infraredObservations,
    })),
    subfloorObservations: formData.subfloorObservations,
    subfloorComments: formData.subfloorComments,
    subfloorLandscape: formData.subfloorLandscape,
    subfloorSanitation: formData.subfloorSanitation,
    subfloorTreatmentTime: formData.subfloorTreatmentTime,
    subfloorReadings: formData.subfloorReadings.map((r) => ({ reading: r.reading, location: r.location })),
    outdoorTemperature: formData.outdoorTemperature,
    outdoorHumidity: formData.outdoorHumidity,
    outdoorDewPoint: formData.outdoorDewPoint,
    outdoorComments: formData.outdoorComments,
    wasteDisposalEnabled: formData.wasteDisposal?.enabled ?? formData.wasteDisposalEnabled,
    wasteDisposalAmount: formData.wasteDisposalAmount,
    wasteDisposalM3: formData.wasteDisposal?.cubicMeters ?? null,
    wasteDisposalConfirmedCost: formData.wasteDisposal?.confirmedCost ?? null,
    optionSelected: formData.optionSelected,
    treatmentMethods: formData.selectedTreatmentMethods,
    commercialDehumidifierEnabled: formData.commercialDehumidifierEnabled,
    commercialDehumidifierQty: getEffectiveDryingQty(formData, 'commercialDehumidifierQty'),
    airMoversEnabled: formData.airMoversEnabled,
    airMoversQty: getEffectiveDryingQty(formData, 'airMoversQty'),
    rcdBoxEnabled: formData.rcdBoxEnabled,
    rcdBoxQty: getEffectiveDryingQty(formData, 'rcdBoxQty'),
    hepaAirScrubberQty: hepaQty,
    hepaAirScrubberDays: hepaDays,
    hepaAirScrubberCost: hepaQty > 0 && hepaDays ? hepaQty * EQUIPMENT_RATES.hepaAirScrubber * hepaDays : 0,
    recommendDehumidifier: formData.recommendDehumidifier,
    dehumidifierSize: formData.dehumidifierSize,
    causeOfMould: formData.causeOfMould,
    additionalInfoForTech: formData.additionalInfoForTech,
    additionalEquipmentComments: formData.additionalEquipmentComments,
    parkingOptions: formData.parkingOptions,
    // Project duration: the labour days, or the longer explicit equipment hire — the model
    // is told drying runs within this figure, so it must not be shorter than the hire.
    totalWorkDays: getSharedEquipmentDays(formData),
    laborCost: formData.laborCost,
    equipmentCost: formData.equipmentCost,
    subtotalExGst: formData.subtotalExGst,
    gstAmount: formData.gstAmount,
    totalIncGst: formData.totalIncGst,
  };
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

interface TechnicianInspectionFormProps {
  adminMode?: boolean;
}

export default function TechnicianInspectionForm({ adminMode = false }: TechnicianInspectionFormProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ leadId?: string }>();
  const leadId = adminMode ? routeParams.leadId ?? null : searchParams.get('leadId');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Capture the initial inspection row when adminMode loads so we can diff on unmount
  const initialInspectionRef = useRef<Record<string, unknown> | null>(null);

  // Navigation State
  const [currentSection, setCurrentSection] = useState(1);

  // Data State
  const [lead, setLead] = useState<LeadData | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customerInfoExpanded, setCustomerInfoExpanded] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<InspectionFormData>({
    // Assigned by the set_inspection_job_number trigger on first INSERT and read back
    // from the returned row — never generated client-side.
    jobNumber: '',
    triage: '',
    address: '',
    inspector: '',
    requestedBy: '',
    attentionTo: '',
    inspectionDate: formatDate(new Date()),
    propertyOccupation: '',
    dwellingType: '',
    areas: [createEmptyArea()],
    subfloorEnabled: true,
    // B3: null = undetermined (must confirm before submit), true = has subfloor, false = no subfloor
    subfloorRequired: null as boolean | null,
    subfloorObservations: '',
    subfloorLandscape: '',
    subfloorComments: '',
    subfloorReadings: [],
    subfloorPhotos: [],
    subfloorSanitation: false,
    subfloorTreatmentTime: 0,
    outdoorTemperature: '',
    outdoorHumidity: '',
    outdoorDewPoint: '',
    outdoorComments: '',
    frontDoorPhoto: null,
    frontHousePhoto: null,
    mailboxPhoto: null,
    streetPhoto: null,
    directionPhotosEnabled: false,
    directionPhoto: null,
    wasteDisposalEnabled: false,
    wasteDisposalAmount: '',
    wasteDisposal: {
      enabled: false,
      cubicMeters: null,
      calculatedCost: null,
      confirmedCost: null,
      isOverridden: false,
    },
    optionSelected: null,
    selectedTreatmentMethods: [],
    hepaVac: false,
    antimicrobial: false,
    stainRemovingAntimicrobial: false,
    homeSanitationFogging: false,
    dryingEquipmentEnabled: false,
    commercialDehumidifierEnabled: false,
    commercialDehumidifierQty: 0,
    airMoversEnabled: false,
    airMoversQty: 0,
    rcdBoxEnabled: false,
    rcdBoxQty: 0,
    hepaAirScrubberQty: 0,
    hepaAirScrubberDays: 0,
    equipmentDays: 0,
    recommendDehumidifier: false,
    dehumidifierSize: '',
    causeOfMould: '',
    additionalInfoForTech: '',
    additionalEquipmentComments: '',
    parkingOptions: '',
    noDemolitionHours: 0,
    demolitionHours: 0,
    subfloorHours: 0,
    equipmentCost: 0,
    manualPriceOverride: false,
    manualTotal: 0,
    labourOverride: null,
    equipmentOverride: null,
    option1LabourOverride: null,
    option1EquipmentOverride: null,
    laborCost: 0,
    discountPercent: 0,
    subtotalExGst: 0,
    gstAmount: 0,
    totalIncGst: 0,
    option1LabourCost: 0,
    option1EquipmentCost: 0,
    option1TotalIncGst: 0,
    option2TotalIncGst: 0,
    jobSummaryFinal: '',
    whatWeFoundText: '',
    whatWeWillDoText: '',
    whatYouGetText: '',
    problemAnalysisContent: '',
    demolitionContent: '',
  });

  // Fetch lead, booking, and existing inspection data
  useEffect(() => {
    async function fetchData() {
      if (!leadId) {
        toast({
          title: 'Error',
          description: 'No lead ID provided',
          variant: 'destructive',
        });
        navigate('/technician/jobs');
        return;
      }

      try {
        // Fetch lead data
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select(
            `
            id,
            full_name,
            phone,
            email,
            property_address_street,
            property_address_suburb,
            property_address_state,
            property_address_postcode,
            property_lat,
            property_lng,
            issue_description,
            internal_notes,
            status
          `
          )
          .eq('id', leadId)
          .is('archived_at', null)
          .single();

        if (leadError) throw leadError;
        setLead(leadData);

        // Fetch booking data
        const { data: bookingData } = await supabase
          .from('calendar_bookings')
          .select('id, start_datetime')
          .eq('lead_id', leadId)
          .order('start_datetime', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bookingData) {
          setBooking(bookingData);
        }

        // Check for existing inspection for this lead
        const { data: existingInspection } = await supabase
          .from('inspections')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingInspection) {
          // Load existing inspection data
          setCurrentInspectionId(existingInspection.id);
          if (adminMode) {
            initialInspectionRef.current = existingInspection as Record<string, unknown>;
          }

          // Load inspection areas with their moisture readings
          const { data: areasData } = await supabase
            .from('inspection_areas')
            .select('*')
            .eq('inspection_id', existingInspection.id)
            .order('area_order', { ascending: true });

          // Load moisture readings for all areas
          const areaIds = (areasData || []).map((a: any) => a.id);
          let moistureReadingsData: any[] = [];
          if (areaIds.length > 0) {
            const { data: mrData } = await supabase
              .from('moisture_readings')
              .select('*')
              .in('area_id', areaIds)
              .order('reading_order', { ascending: true });
            moistureReadingsData = mrData || [];
          }

          // Load subfloor data
          const { data: subfloorData } = await supabase
            .from('subfloor_data')
            .select('*')
            .eq('inspection_id', existingInspection.id)
            .maybeSingle();

          // Load subfloor readings
          let subfloorReadingsData: any[] = [];
          if (subfloorData) {
            const { data: srData } = await supabase
              .from('subfloor_readings')
              .select('*')
              .eq('subfloor_id', subfloorData.id)
              .order('reading_order', { ascending: true });
            subfloorReadingsData = srData || [];
          }

          // Load photos
          let photosData: any[] = [];
          try {
            photosData = await loadInspectionPhotos(existingInspection.id);
          } catch (err) {
            console.warn('[InspectionForm] Failed to load photos:', err);
          }

          // Map DB inspection data -> formData
          const ins = existingInspection;

          // Reconstruct infrared observations from boolean columns
          const reconstructInfraredObservations = (area: any): string[] => {
            const obs: string[] = [];
            if (area.infrared_observation_no_active) obs.push('No Active Water Intrusion Detected');
            if (area.infrared_observation_water_infiltration) obs.push('Active Water Infiltration');
            if (area.infrared_observation_past_ingress) obs.push('Past Water Ingress (Dried)');
            if (area.infrared_observation_condensation) obs.push('Condensation Pattern');
            if (area.infrared_observation_missing_insulation) obs.push('Missing/Inadequate Insulation');
            return obs;
          };

          // Map areas from DB
          const mappedAreas: InspectionArea[] = (areasData || []).map((area: any) => {
            const areaReadings = moistureReadingsData.filter((r: any) => r.area_id === area.id);
            const areaPhotos = photosData.filter((p: any) => p.area_id === area.id);
            const roomViewPhotos = areaPhotos
              .filter(
                (p: any) =>
                  p.photo_type === 'area' &&
                  p.caption !== 'infrared' &&
                  p.caption !== 'natural_infrared' &&
                  p.caption !== 'moisture' &&
                  !p.moisture_reading_id,
              )
              .map((p: any) => ({ id: p.id, name: p.file_name || '', url: p.signed_url, timestamp: p.created_at }));
            const infraredPhoto = areaPhotos.find((p: any) => p.photo_type === 'area' && p.caption === 'infrared');
            const naturalInfraredPhoto = areaPhotos.find((p: any) => p.photo_type === 'area' && p.caption === 'natural_infrared');

            return {
              id: area.id,
              areaName: area.area_name || '',
              mouldDescription: area.mould_description || '',
              mouldVisibleLocations: area.mould_visible_locations || [],
              mouldVisibleCustom: area.mould_visible_custom || '',
              commentsForReport: area.comments || '',
              temperature: area.temperature != null ? String(area.temperature) : '',
              humidity: area.humidity != null ? String(area.humidity) : '',
              dewPoint: area.dew_point != null ? String(area.dew_point) : '',
              moistureReadingsEnabled: true,
              moistureReadings: (() => {
                // Map DB readings by reading_order (0=internal, 1=external)
                const mapped: MoistureReading[] = areaReadings.map((r: any) => {
                  const moisturePhoto = areaPhotos.find((p: any) => p.moisture_reading_id === r.id);
                  return {
                    id: r.id,
                    title: r.title || '',
                    reading: r.moisture_percentage != null ? String(r.moisture_percentage) : '',
                    photo: moisturePhoto
                      ? { id: moisturePhoto.id, name: moisturePhoto.file_name || '', url: moisturePhoto.signed_url, timestamp: moisturePhoto.created_at }
                      : null,
                  };
                });
                // Ensure exactly 2 entries: [internal, external]
                while (mapped.length < 2) {
                  mapped.push({ id: crypto.randomUUID(), title: '', reading: '', photo: null });
                }
                return mapped.slice(0, 2);
              })(),
              internalMoisture: area.internal_moisture != null ? String(area.internal_moisture) : '',
              externalMoisture: area.external_moisture != null ? String(area.external_moisture) : '',
              internalNotes: area.internal_office_notes || '',
              extraNotes: area.extra_notes ?? '',
              primaryPhotoId: area.primary_photo_id ?? null,
              roomViewPhotos,
              infraredEnabled: area.infrared_enabled || false,
              infraredPhoto: infraredPhoto ? { id: infraredPhoto.id, name: infraredPhoto.file_name || '', url: infraredPhoto.signed_url, timestamp: infraredPhoto.created_at } : null,
              naturalInfraredPhoto: naturalInfraredPhoto ? { id: naturalInfraredPhoto.id, name: naturalInfraredPhoto.file_name || '', url: naturalInfraredPhoto.signed_url, timestamp: naturalInfraredPhoto.created_at } : null,
              infraredObservations: reconstructInfraredObservations(area),
              timeWithoutDemo: area.job_time_minutes ? area.job_time_minutes / 60 : 0,
              demolitionRequired: area.demolition_required || false,
              demolitionTime: area.demolition_time_minutes ? area.demolition_time_minutes / 60 : 0,
              demolitionDescription: area.demolition_description || '',
            };
          });

          // Map subfloor readings
          const mappedSubfloorReadings: SubfloorReading[] = subfloorReadingsData.map((r: any) => ({
            id: r.id,
            reading: r.moisture_percentage != null ? String(r.moisture_percentage) : '',
            location: r.location || '',
          }));

          // Map photos to outdoor/subfloor categories
          const generalPhotos = photosData.filter((p: any) => p.photo_type === 'general' || p.photo_type === 'outdoor');
          const subfloorPhotos = photosData.filter((p: any) => p.photo_type === 'subfloor');
          const mapPhoto = (p: any): Photo => ({ id: p.id, name: p.file_name || '', url: p.signed_url, timestamp: p.created_at });

          const frontDoorPhoto = generalPhotos.find((p: any) => p.caption === 'front_door');
          const frontHousePhoto = generalPhotos.find((p: any) => p.caption === 'front_house');
          const mailboxPhoto = generalPhotos.find((p: any) => p.caption === 'mailbox');
          const streetPhoto = generalPhotos.find((p: any) => p.caption === 'street');
          const directionPhoto = generalPhotos.find((p: any) => p.caption === 'direction');

          // Treatment methods, with drying equipment reconciled against the
          // saved quantities. Before the toggle gated its quantities, a tech
          // could turn "Drying Equipment" off and still leave qty > 0 on the
          // record — and those quantities were billed. Stored quantities are
          // therefore evidence the equipment was on, so the method is restored
          // rather than letting the gate silently drop equipment from an
          // existing quote. Toggling off now zeroes the quantities on save, so
          // this can only ever describe a pre-gate record.
          const storedMethods = (ins.treatment_methods && ins.treatment_methods.length > 0)
            ? ins.treatment_methods
            : [
                // Backward compat: derive treatment methods from surviving boolean columns
                // for old inspections that predate the treatment_methods array column.
                // NOTE: drying_equipment_enabled removed in Phase 5c (column being dropped).
                ...(ins.hepa_vac ? ['HEPA Vacuuming'] : []),
                ...(ins.antimicrobial ? ['Surface Remediation Treatment'] : []),
                ...(ins.home_sanitation_fogging ? ['ULV Fogging - Property'] : []),
              ];
          const hasStoredDryingQty =
            (ins.commercial_dehumidifier_qty ?? 0) > 0
            || (ins.air_movers_qty ?? 0) > 0
            || (ins.rcd_box_qty ?? 0) > 0;
          const reconciledMethods =
            hasStoredDryingQty && !storedMethods.includes('Drying Equipment')
              ? [...storedMethods, 'Drying Equipment']
              : storedMethods;

          // Rehydrate Editable Estimate overrides. The DB stores EFFECTIVE
          // values plus one manual_labour_override flag, so recompute the auto
          // values from the same saved inputs (hours/quantities are saved
          // atomically with them) and treat only differing values as overrides.
          const loadedOverrideFlag = ins.manual_labour_override || false;
          const loadHours = {
            nonDemoHours: ins.no_demolition_hours ? Number(ins.no_demolition_hours) : 0,
            demolitionHours: ins.demolition_hours ? Number(ins.demolition_hours) : 0,
            subfloorHours: ins.subfloor_hours ? Number(ins.subfloor_hours) : 0,
          };
          // equipment_days stores the full quote's EFFECTIVE days (and legacy rows carry the
          // column default 1), so a loaded value is an explicit hire period only when it
          // exceeds what the saved hours derive. Only an explicit period feeds the Option 1
          // reconcile below — on auto, Option 1 derives its own days, as the save did.
          const loadedEquipmentDays = reconcileLoadedEquipmentDays(
            ins.equipment_days,
            deriveEquipmentDays(loadHours.nonDemoHours + loadHours.demolitionHours + loadHours.subfloorHours)
          );
          const loadAutoInput = {
            ...loadHours,
            dehumidifierQty: ins.commercial_dehumidifier_qty || 0,
            airMoverQty: ins.air_movers_qty || 0,
            rcdQty: ins.rcd_box_qty || 0,
            hepaAirScrubberQty: ins.hepa_air_scrubber_qty || 0,
            equipmentDays: loadedEquipmentDays || undefined,
            hepaAirScrubberDays: ins.hepa_air_scrubber_days || undefined,
          };
          const loadAuto = calculateCostEstimate(loadAutoInput);
          // Option 1 is priced on every area's surface time, which only the area rows carry
          // (the stored no_demolition_hours excludes demolished areas).
          const loadOpt1Auto = ins.option_selected === 3
            ? calculateCostEstimate({
                ...loadAutoInput,
                nonDemoHours: deriveSurfaceHours((areasData || []).map(areaRowToLabourInput)),
                demolitionHours: 0,
                subfloorHours: 0,
              })
            : null;
          const loadedLabourOverride = reconcileLoadedOverride(
            loadedOverrideFlag,
            ins.labour_cost_ex_gst != null ? Number(ins.labour_cost_ex_gst) : null,
            loadAuto.labourAfterDiscount
          );
          const loadedEquipmentOverride = reconcileLoadedOverride(
            loadedOverrideFlag,
            ins.equipment_cost_ex_gst != null ? Number(ins.equipment_cost_ex_gst) : null,
            loadAuto.equipmentCost
          );
          const loadedOption1LabourOverride = loadOpt1Auto
            ? reconcileLoadedOverride(
                loadedOverrideFlag,
                ins.option_1_labour_ex_gst != null ? Number(ins.option_1_labour_ex_gst) : null,
                loadOpt1Auto.labourAfterDiscount
              )
            : null;
          const loadedOption1EquipmentOverride = loadOpt1Auto
            ? reconcileLoadedOverride(
                loadedOverrideFlag,
                ins.option_1_equipment_ex_gst != null ? Number(ins.option_1_equipment_ex_gst) : null,
                loadOpt1Auto.equipmentCost
              )
            : null;

          setFormData((prev) => ({
            ...prev,
            jobNumber: ins.job_number || prev.jobNumber,
            triage: ins.triage_description || leadData.issue_description || '',
            address: getFullAddress(leadData),
            inspector: ins.inspector_name || prev.inspector,
            requestedBy: ins.requested_by || leadData.full_name || '',
            attentionTo: ins.attention_to || '',
            inspectionDate: ins.inspection_date || prev.inspectionDate,
            propertyOccupation: ins.property_occupation || '',
            dwellingType: ins.dwelling_type || '',
            areas: mappedAreas.length > 0 ? mappedAreas : [createEmptyArea()],
            subfloorEnabled: true,
            // B3: hydrate from DB; null if column not yet set (legacy rows).
            subfloorRequired: ins.subfloor_required ?? null,
            subfloorObservations: subfloorData?.observations || '',
            subfloorLandscape: subfloorData?.landscape || '',
            subfloorComments: subfloorData?.comments || '',
            subfloorReadings: mappedSubfloorReadings,
            subfloorPhotos: subfloorPhotos.map(mapPhoto),
            subfloorSanitation: subfloorData?.sanitation_required || false,
            subfloorTreatmentTime: subfloorData?.treatment_time_minutes ? subfloorData.treatment_time_minutes / 60 : 0,
            outdoorTemperature: ins.outdoor_temperature != null ? String(ins.outdoor_temperature) : '',
            outdoorHumidity: ins.outdoor_humidity != null ? String(ins.outdoor_humidity) : '',
            outdoorDewPoint: ins.outdoor_dew_point != null ? String(ins.outdoor_dew_point) : '',
            outdoorComments: ins.outdoor_comments || '',
            frontDoorPhoto: frontDoorPhoto ? mapPhoto(frontDoorPhoto) : null,
            frontHousePhoto: frontHousePhoto ? mapPhoto(frontHousePhoto) : null,
            mailboxPhoto: mailboxPhoto ? mapPhoto(mailboxPhoto) : null,
            streetPhoto: streetPhoto ? mapPhoto(streetPhoto) : null,
            directionPhotosEnabled: ins.direction_photos_enabled || false,
            directionPhoto: directionPhoto ? mapPhoto(directionPhoto) : null,
            wasteDisposalEnabled: ins.waste_disposal_required || false,
            wasteDisposalAmount: ins.waste_disposal_amount || '',
            wasteDisposal: {
              enabled: ins.waste_disposal_required || false,
              cubicMeters: ins.waste_disposal_m3 != null ? Number(ins.waste_disposal_m3) : null,
              calculatedCost: ins.waste_disposal_calculated_cost != null ? Number(ins.waste_disposal_calculated_cost) : null,
              confirmedCost: ins.waste_disposal_confirmed_cost != null ? Number(ins.waste_disposal_confirmed_cost) : null,
              isOverridden: ins.waste_disposal_is_overridden || false,
            },
            optionSelected: ins.option_selected || null,
            selectedTreatmentMethods: reconciledMethods,
            hepaVac: ins.hepa_vac || false,
            antimicrobial: ins.antimicrobial || false,
            stainRemovingAntimicrobial: ins.stain_removing_antimicrobial || false,
            homeSanitationFogging: ins.home_sanitation_fogging || false,
            dryingEquipmentEnabled: reconciledMethods.includes('Drying Equipment'),
            commercialDehumidifierEnabled: (ins.commercial_dehumidifier_qty ?? 0) > 0,
            commercialDehumidifierQty: ins.commercial_dehumidifier_qty || 0,
            airMoversEnabled: (ins.air_movers_qty ?? 0) > 0,
            airMoversQty: ins.air_movers_qty || 0,
            rcdBoxEnabled: (ins.rcd_box_qty ?? 0) > 0,
            rcdBoxQty: ins.rcd_box_qty || 0,
            hepaAirScrubberQty: ins.hepa_air_scrubber_qty || 0,
            hepaAirScrubberDays: ins.hepa_air_scrubber_days || 0,
            equipmentDays: loadedEquipmentDays,
            recommendDehumidifier: ins.recommended_dehumidifier != null,
            dehumidifierSize: ins.recommended_dehumidifier || '',
            causeOfMould: ins.cause_of_mould || '',
            additionalInfoForTech: ins.additional_info_technician || '',
            additionalEquipmentComments: ins.additional_equipment_comments || '',
            parkingOptions: ins.parking_option || '',
            noDemolitionHours: ins.no_demolition_hours ? Number(ins.no_demolition_hours) : 0,
            demolitionHours: ins.demolition_hours ? Number(ins.demolition_hours) : 0,
            subfloorHours: ins.subfloor_hours ? Number(ins.subfloor_hours) : 0,
            equipmentCost: ins.equipment_cost_ex_gst ? Number(ins.equipment_cost_ex_gst) : 0,
            labourOverride: loadedLabourOverride,
            equipmentOverride: loadedEquipmentOverride,
            option1LabourOverride: loadedOption1LabourOverride,
            option1EquipmentOverride: loadedOption1EquipmentOverride,
            manualPriceOverride:
              loadedLabourOverride != null ||
              loadedEquipmentOverride != null ||
              loadedOption1LabourOverride != null ||
              loadedOption1EquipmentOverride != null,
            manualTotal: ins.manual_total_inc_gst ? Number(ins.manual_total_inc_gst) : 0,
            laborCost: ins.labour_cost_ex_gst ? Number(ins.labour_cost_ex_gst) : 0,
            // NOTE: DB stores percent scale (0–13); form state uses decimal (0–0.13).
            // Divide here to keep in-form calculations on decimal scale.
            discountPercent: ins.discount_percent ? Number(ins.discount_percent) / 100 : 0,
            subtotalExGst: ins.subtotal_ex_gst ? Number(ins.subtotal_ex_gst) : 0,
            gstAmount: ins.gst_amount ? Number(ins.gst_amount) : 0,
            totalIncGst: ins.total_inc_gst ? Number(ins.total_inc_gst) : 0,
            option1LabourCost: ins.option_1_labour_ex_gst ? Number(ins.option_1_labour_ex_gst) : 0,
            option1EquipmentCost: ins.option_1_equipment_ex_gst ? Number(ins.option_1_equipment_ex_gst) : 0,
            option1TotalIncGst: ins.option_1_total_inc_gst ? Number(ins.option_1_total_inc_gst) : 0,
            option2TotalIncGst: ins.option_2_total_inc_gst ? Number(ins.option_2_total_inc_gst) : 0,
            // Stage 3.5: AI summary text fields no longer live on inspections.
            // The technician form has no UI inputs for these fields (confirmed
            // in audit doc); they were pure load-then-save pass-through and
            // the writes were already dropped in Stage 3.4.5. Initialise empty —
            // the canonical store is ai_summary_versions, read by the admin
            // review screen via the latest_ai_summary view.
            jobSummaryFinal: '',
            whatWeFoundText: '',
            whatWeWillDoText: '',
            whatYouGetText: '',
            problemAnalysisContent: '',
            demolitionContent: '',
          }));
        } else {
          // No existing inspection - pre-fill from lead data
          setFormData((prev) => ({
            ...prev,
            triage: leadData.issue_description || '',
            address: getFullAddress(leadData),
            requestedBy: leadData.full_name || '',
          }));
        }
      } catch (err) {
        console.error('[InspectionForm] Error fetching data:', err);
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [leadId, navigate, toast]);

  // Set inspector name from logged-in user
  useEffect(() => {
    if (user?.user_metadata) {
      const firstName = user.user_metadata.first_name || '';
      const lastName = user.user_metadata.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || user.email || '';
      setFormData((prev) => ({
        ...prev,
        inspector: fullName,
      }));
    }
  }, [user]);

  // Auto-sync the quote's labour hours from areas/subfloor into formData — the completion
  // validator reads these, so they must follow the same per-area rule as the price.
  useEffect(() => {
    const { nonDemo, demolition, subfloor } = getQuoteHours(formData);

    if (formData.noDemolitionHours !== nonDemo || formData.demolitionHours !== demolition || formData.subfloorHours !== subfloor) {
      setFormData((prev) => ({
        ...prev,
        noDemolitionHours: nonDemo,
        demolitionHours: demolition,
        subfloorHours: subfloor,
      }));
    }
  }, [formData.areas, formData.subfloorTreatmentTime, formData.optionSelected]);

  // Form field handlers
  const handleChange = (field: keyof InspectionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleAreaChange = (areaId: string, field: keyof InspectionArea, value: any) => {
    setFormData((prev) => ({
      ...prev,
      areas: prev.areas.map((area) =>
        area.id === areaId ? { ...area, [field]: value } : area
      ),
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddArea = () => {
    setFormData((prev) => ({
      ...prev,
      areas: [...prev.areas, createEmptyArea()],
    }));
    toast({ title: 'Area added', description: 'New inspection area created' });
  };

  const handleRemoveArea = (areaId: string) => {
    if (formData.areas.length === 1) {
      toast({
        title: 'Cannot remove',
        description: 'At least one area is required',
        variant: 'destructive',
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      areas: prev.areas.filter((a) => a.id !== areaId),
    }));
    toast({ title: 'Area removed' });
  };

  // Moisture reading handlers
  const handleMoistureReadingAdd = (areaId: string) => {
    const newReading: MoistureReading = {
      id: crypto.randomUUID(),
      title: '',
      reading: '',
      photo: null,
    };
    setFormData((prev) => ({
      ...prev,
      areas: prev.areas.map((area) =>
        area.id === areaId
          ? { ...area, moistureReadings: [...area.moistureReadings, newReading] }
          : area
      ),
    }));
  };

  const handleMoistureReadingRemove = (areaId: string, readingId: string) => {
    setFormData((prev) => ({
      ...prev,
      areas: prev.areas.map((area) =>
        area.id === areaId
          ? { ...area, moistureReadings: area.moistureReadings.filter((r) => r.id !== readingId) }
          : area
      ),
    }));
  };

  const handleMoistureReadingChange = (
    areaId: string,
    readingId: string,
    field: keyof MoistureReading,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      areas: prev.areas.map((area) =>
        area.id === areaId
          ? {
              ...area,
              moistureReadings: area.moistureReadings.map((r) =>
                r.id === readingId ? { ...r, [field]: value } : r
              ),
            }
          : area
      ),
    }));
  };

  // Subfloor reading handlers
  const handleSubfloorReadingAdd = () => {
    const newReading: SubfloorReading = {
      id: crypto.randomUUID(),
      reading: '',
      location: '',
    };
    setFormData((prev) => ({
      ...prev,
      subfloorReadings: [...prev.subfloorReadings, newReading],
    }));
  };

  const handleSubfloorReadingRemove = (readingId: string) => {
    setFormData((prev) => ({
      ...prev,
      subfloorReadings: prev.subfloorReadings.filter((r) => r.id !== readingId),
    }));
  };

  const handleSubfloorReadingChange = (
    readingId: string,
    field: keyof SubfloorReading,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      subfloorReadings: prev.subfloorReadings.map((r) =>
        r.id === readingId ? { ...r, [field]: value } : r
      ),
    }));
  };

  // Dew point calculation
  const handleCalculateDewPoint = (areaId?: string) => {
    if (areaId) {
      // Calculate for specific area
      const area = formData.areas.find((a) => a.id === areaId);
      if (area && area.temperature && area.humidity) {
        const temp = parseFloat(area.temperature);
        const hum = parseFloat(area.humidity);
        const dewPoint = calculateDewPoint(temp, hum);
        handleAreaChange(areaId, 'dewPoint', dewPoint.toString());
      }
    } else {
      // Calculate outdoor dew point
      if (formData.outdoorTemperature && formData.outdoorHumidity) {
        const temp = parseFloat(formData.outdoorTemperature);
        const hum = parseFloat(formData.outdoorHumidity);
        const dewPoint = calculateDewPoint(temp, hum);
        handleChange('outdoorDewPoint', dewPoint.toString());
      }
    }
  };

  // Photo handlers - upload to Supabase Storage
  // Persistent refs for file input (mobile browsers block .click() on detached inputs)
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoContextRef = useRef<{ type: string; areaId?: string; readingId?: string }>({ type: '' });

  // Every caption is now derived — room and subfloor photos used to open
  // PhotoCaptionPromptDialog first, which cost a modal per slot and is the
  // reason technicians stopped captioning at all. Sentinel role tags
  // ('infrared', 'front_house', 'moisture') are unchanged: they carry slot
  // identity, not description. See src/lib/utils/photoCaption.ts.

  const openFilePicker = (multiple: boolean) => {
    const input = photoInputRef.current;
    if (!input) return;
    input.multiple = multiple;
    input.value = '';
    input.click();
  };

  const handlePhotoCapture = (type: string, areaId?: string, readingId?: string) => {
    const input = photoInputRef.current;
    if (!input) return;

    photoContextRef.current = { type, areaId, readingId };

    openFilePicker(!SINGLE_SLOT_PHOTO_TYPES.has(type) && !readingId);
  };

  /**
   * Honest wording: photo uploads go straight to the server and are NOT kept on
   * the device — unlike form fields. The count matters now that a technician can
   * select a whole batch at once.
   */
  const showPhotoOfflineToast = (photoCount: number) => {
    toast({
      title: (
        <span className="flex items-center gap-2">
          <WifiOff className="h-5 w-5 shrink-0" />
          {photoCount === 1
            ? "You're offline — photo not uploaded"
            : `You're offline — ${photoCount} photos not uploaded`}
        </span>
      ),
      description:
        "Photos can't be uploaded without a connection and are not kept on this device. Add them again once you're back online.",
      className: OFFLINE_TOAST_CLASS,
      duration: 8000,
    });
  };

  const handlePhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const { type, areaId, readingId } = photoContextRef.current;

    // Require saved inspection before uploading photos
    if (!currentInspectionId) {
      toast({
        title: 'Save First',
        description: 'Save the inspection before uploading photos',
        variant: 'destructive',
      });
      return;
    }

    // Refuse before uploading rather than after: photo uploads go straight to
    // the server and are not kept on the device, so a bulk selection attempted
    // with no signal loses every file.
    if (!navigator.onLine) {
      showPhotoOfflineToast(files.length);
      return;
    }

    const remainingSlots = getRemainingPhotoSlots(
      type,
      {
        roomView: formData.areas.find((a) => a.id === areaId)?.roomViewPhotos?.length ?? 0,
        subfloor: formData.subfloorPhotos.length,
      },
      !!readingId
    );
    if (remainingSlots <= 0) {
      toast({
        title: 'Limit reached',
        description: `No room for more photos here (maximum ${
          type === 'subfloor' ? MAX_SUBFLOOR_PHOTOS : MAX_ROOM_VIEW_PHOTOS
        })`,
        variant: 'destructive',
      });
      return;
    }

    // One toast, not two: use-toast is capped at TOAST_LIMIT = 1, so a separate
    // "photos skipped" toast is evicted in the same tick and the technician
    // never learns the batch was trimmed.
    const filesToUpload = files.slice(0, remainingSlots);
    const skippedCount = files.length - filesToUpload.length;
    toast({
      title: 'Uploading...',
      description:
        skippedCount > 0
          ? `Uploading ${filesToUpload.length} of ${files.length} — ${skippedCount} did not fit and were skipped.`
          : `Uploading ${filesToUpload.length} photo(s)`,
    });

    try {
      // Determine photo_type and caption for metadata
      let photoType: 'area' | 'subfloor' | 'general' | 'outdoor' = 'general';
      let caption: string | undefined;
      if (areaId) {
        photoType = 'area';
        if (type === 'infrared') caption = 'infrared';
        else if (type === 'naturalInfrared') caption = 'natural_infrared';
        else if (type === 'roomView') {
          caption = derivePhotoCaption('roomView', {
            areaName: formData.areas.find((a) => a.id === areaId)?.areaName,
          });
        }
      } else if (type === 'subfloor') {
        photoType = 'subfloor';
        caption = derivePhotoCaption('subfloor');
      } else if (['frontDoor', 'frontHouse', 'mailbox', 'street', 'direction'].includes(type)) {
        photoType = 'outdoor';
        const captionMap: Record<string, string> = {
          frontDoor: 'front_door', frontHouse: 'front_house',
          mailbox: 'mailbox', street: 'street', direction: 'direction',
        };
        caption = captionMap[type];
      }

      const finalCaption = readingId ? 'moisture' : caption;
      if (!finalCaption || !finalCaption.trim()) {
        toast({
          title: 'Caption required',
          description: 'Photo caption was missing — please try again',
          variant: 'destructive',
        });
        return;
      }

      // Upload each file. A mid-batch failure keeps the photos that already
      // succeeded — dropping them here would leave rows in the database with
      // nothing in the form referencing them.
      // NOTE: Do NOT pass moisture_reading_id here — the reading may not be saved to DB yet.
      // Photos are linked to moisture readings during handleSave() after readings are persisted.
      const newPhotos: Photo[] = [];
      let firstUploadError: unknown;
      for (const file of filesToUpload) {
        try {
          const result = await uploadInspectionPhoto(file, {
            inspection_id: currentInspectionId,
            area_id: areaId,
            photo_type: photoType,
            caption: finalCaption,
          });
          newPhotos.push({
            id: result.photo_id,
            name: file.name,
            url: result.signed_url,
            timestamp: new Date().toISOString(),
          });
        } catch (uploadErr) {
          console.error('[PhotoCapture] Upload failed for', file.name, uploadErr);
          firstUploadError = firstUploadError ?? uploadErr;
        }
      }

      if (newPhotos.length === 0) throw firstUploadError;

      // Update state based on photo type
      if (areaId && readingId) {
        handleMoistureReadingChange(areaId, readingId, 'photo', newPhotos[0]);
      } else if (areaId && type === 'roomView') {
        const area = formData.areas.find((a) => a.id === areaId);
        const currentPhotos = area?.roomViewPhotos || [];
        handleAreaChange(areaId, 'roomViewPhotos', [...currentPhotos, ...newPhotos]);
      } else if (areaId && type === 'infrared') {
        handleAreaChange(areaId, 'infraredPhoto', newPhotos[0]);
      } else if (areaId && type === 'naturalInfrared') {
        handleAreaChange(areaId, 'naturalInfraredPhoto', newPhotos[0]);
      } else if (type === 'subfloor') {
        handleChange('subfloorPhotos', [...formData.subfloorPhotos, ...newPhotos]);
      } else if (type === 'frontDoor') {
        handleChange('frontDoorPhoto', newPhotos[0]);
      } else if (type === 'frontHouse') {
        handleChange('frontHousePhoto', newPhotos[0]);
      } else if (type === 'mailbox') {
        handleChange('mailboxPhoto', newPhotos[0]);
      } else if (type === 'street') {
        handleChange('streetPhoto', newPhotos[0]);
      } else if (type === 'direction') {
        handleChange('directionPhoto', newPhotos[0]);
      }

      toast({
        title: 'Photos added',
        description:
          newPhotos.length < filesToUpload.length
            ? `${newPhotos.length} of ${filesToUpload.length} photos uploaded — the rest failed and were not kept on this device.`
            : `${newPhotos.length} photo(s) uploaded`,
        variant: newPhotos.length < filesToUpload.length ? 'destructive' : undefined,
      });
    } catch (err: any) {
      console.error('[PhotoCapture] Upload error:', err);
      if (isNetworkLevelError(err)) {
        showPhotoOfflineToast(filesToUpload.length);
      } else {
        toast({
          title: 'Upload Failed',
          description: err?.message || 'Failed to upload photo(s)',
          variant: 'destructive',
        });
      }
    }
  };

  const handlePhotoRemove = async (type: string, photoId: string, areaId?: string, readingId?: string) => {
    // Try to delete from Supabase if it's a real DB photo (not a blob URL)
    const isDbPhoto = photoId && !photoId.startsWith('blob:') && photoId.length === 36;
    if (isDbPhoto) {
      try {
        await deleteInspectionPhoto(photoId);
      } catch (err) {
        console.warn('[PhotoRemove] Delete error (continuing anyway):', err);
      }
    }

    // Remove from local state
    if (areaId && readingId) {
      handleMoistureReadingChange(areaId, readingId, 'photo', null);
    } else if (areaId && type === 'roomView') {
      const area = formData.areas.find((a) => a.id === areaId);
      if (area) {
        handleAreaChange(areaId, 'roomViewPhotos', area.roomViewPhotos.filter((p) => p.id !== photoId));
      }
    } else if (areaId && type === 'infrared') {
      handleAreaChange(areaId, 'infraredPhoto', null);
    } else if (areaId && type === 'naturalInfrared') {
      handleAreaChange(areaId, 'naturalInfraredPhoto', null);
    } else if (type === 'subfloor') {
      handleChange('subfloorPhotos', formData.subfloorPhotos.filter((p) => p.id !== photoId));
    } else if (type === 'frontDoor') {
      handleChange('frontDoorPhoto', null);
    } else if (type === 'frontHouse') {
      handleChange('frontHousePhoto', null);
    } else if (type === 'mailbox') {
      handleChange('mailboxPhoto', null);
    } else if (type === 'street') {
      handleChange('streetPhoto', null);
    } else if (type === 'direction') {
      handleChange('directionPhoto', null);
    }
  };

  // Back navigation
  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
    }
    if (adminMode && leadId) {
      navigate(`/leads/${leadId}`);
      return;
    }
    navigate(-1);
  };

  // Admin-mode one-shot diff log on unmount — captures admin field edits as a single activity row.
  // Uses refs so the cleanup closure reads the latest form state, not the mount-time snapshot.
  const adminDiffStateRef = useRef({ formData, currentInspectionId, leadId });
  adminDiffStateRef.current = { formData, currentInspectionId, leadId };
  useEffect(() => {
    if (!adminMode) return;
    return () => {
      const { formData: fd, currentInspectionId: insId, leadId: lid } = adminDiffStateRef.current;
      const initial = initialInspectionRef.current;
      if (!insId || !lid || !initial) return;

      const changes: FieldChange[] = [];
      const initialDate = (initial.inspection_date as string | null) ?? null;
      const newDate = fd.inspectionDate || null;
      if (initialDate !== newDate) {
        changes.push({ field: 'Inspection Date', old: initialDate, new: newDate });
      }

      const initialTotal = initial.total_inc_gst == null ? null : Number(initial.total_inc_gst);
      const newTotal = fd.totalIncGst || null;
      if (initialTotal !== newTotal) {
        changes.push({ field: 'Total (inc GST)', old: initialTotal, new: newTotal });
      }

      // Stage 3.5: AI summary diff tracking removed — the canonical store is
      // ai_summary_versions, audited via audit_log_trigger on that table. The
      // technician form's adminDiff was reading the dropped inspections.ai_summary_text.

      const initialOpt1 = initial.option_1_total_inc_gst == null ? null : Number(initial.option_1_total_inc_gst);
      const newOpt1 = fd.option1TotalIncGst || null;
      if (initialOpt1 !== newOpt1) {
        changes.push({ field: 'Option 1 Total', old: initialOpt1, new: newOpt1 });
      }

      const initialOpt2 = initial.option_2_total_inc_gst == null ? null : Number(initial.option_2_total_inc_gst);
      const newOpt2 = fd.option2TotalIncGst || null;
      if (initialOpt2 !== newOpt2) {
        changes.push({ field: 'Option 2 Total', old: initialOpt2, new: newOpt2 });
      }

      if (changes.length > 0) {
        void logFieldEdits({
          leadId: lid,
          entityType: 'inspection',
          entityId: insId,
          changes,
          actorLabel: user?.email ?? 'Admin',
        });
      }
    };
    // Only (re)install the cleanup when adminMode flips — the ref handles latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminMode]);

  // Save handler - multi-table upsert to Supabase
  // True when the most recent save attempt failed at the network level.
  // Read by the Complete flow so it never reports "Inspection Complete" on
  // top of a save that only exists on this device.
  const lastSaveFailedOfflineRef = useRef(false);
  // Cost figures the most recent save persisted. formData's own cost fields are the
  // snapshot loaded from the DB, so the completion flow's AI payload reads these instead.
  const lastSavedTotalsRef = useRef<Partial<InspectionFormData>>({});

  const handleSave = async (options?: { silent?: boolean }): Promise<string | null> => {
    if (!leadId || !user) return null;
    setIsSaving(true);

    try {
      // Compute auto-calc pricing as defaults (used when form values are 0 / not yet edited)
      // Quote scope: per area, demolition replaces surface treatment (labourHours.ts).
      const saveLabourHours = getQuoteHours(formData);
      const saveNonDemoHours = saveLabourHours.nonDemo;
      const saveDemoHours = saveLabourHours.demolition;
      const saveSubfloorHours = saveLabourHours.subfloor;
      const saveSurfaceHours = getSurfaceHours(formData);

      // Waste disposal: confirmed, non-discounted pass-through. Excluded in "Both"
      // mode (optionSelected === 3) so the per-option totals stay labour+equipment
      // only; the invoice still reads waste_disposal_confirmed_cost directly.
      const saveWaste = formData.optionSelected === 3
        ? 0
        : (formData.wasteDisposal?.confirmedCost ?? 0);

      const saveFullResult = calculateCostEstimate({
        nonDemoHours: saveNonDemoHours,
        demolitionHours: saveDemoHours,
        subfloorHours: saveSubfloorHours,
        dehumidifierQty: getEffectiveDryingQty(formData, 'commercialDehumidifierQty'),
        airMoverQty: getEffectiveDryingQty(formData, 'airMoversQty'),
        rcdQty: getEffectiveDryingQty(formData, 'rcdBoxQty'),
        equipmentDays: getExplicitEquipmentDays(formData) || undefined,
        hepaAirScrubberQty: getEffectiveHepaQty(formData),
        hepaAirScrubberDays: formData.hepaAirScrubberDays || undefined,
        wasteDisposalCost: saveWaste,
      });

      // Per-field override precedence (estimate-override.ts): an override
      // present wins, null falls back to auto-calc. The DB stores the
      // EFFECTIVE values; manual_labour_override records that at least one
      // override is active (reconcileLoadedOverride splits them back apart on
      // load). GST is always recomputed from the effective values — an
      // override can never bypass it. With no overrides these equal
      // saveFullResult.subtotalExGst/gstAmount/totalIncGst exactly.
      const anyOverride =
        formData.labourOverride != null ||
        formData.equipmentOverride != null ||
        (formData.optionSelected === 3 &&
          (formData.option1LabourOverride != null || formData.option1EquipmentOverride != null));
      const saveLabour = round2(resolveOverridableValue(formData.labourOverride, saveFullResult.labourAfterDiscount));
      const saveEquipment = round2(resolveOverridableValue(formData.equipmentOverride, saveFullResult.equipmentCost));
      const saveSubtotal = round2(saveLabour + saveEquipment + saveWaste);
      const saveGst = round2(saveSubtotal * 0.1);
      const saveTotal = round2(saveSubtotal + saveGst);
      lastSavedTotalsRef.current = {
        laborCost: saveLabour,
        equipmentCost: saveEquipment,
        subtotalExGst: saveSubtotal,
        gstAmount: saveGst,
        totalIncGst: saveTotal,
      };

      // Per-option totals
      let saveOption1Total: number | null = null;
      let saveOption2Total: number | null = null;
      let saveOption1Labour: number | null = null;
      let saveOption1Equipment: number | null = null;

      if (formData.optionSelected === 3) {
        // "Both" mode: Option 1 has its own labour/equipment (every area's surface time —
        // no demo/subfloor)
        const opt1AutoResult = calculateCostEstimate({
          nonDemoHours: saveSurfaceHours,
          demolitionHours: 0,
          subfloorHours: 0,
          dehumidifierQty: getEffectiveDryingQty(formData, 'commercialDehumidifierQty'),
          airMoverQty: getEffectiveDryingQty(formData, 'airMoversQty'),
          rcdQty: getEffectiveDryingQty(formData, 'rcdBoxQty'),
          equipmentDays: getExplicitEquipmentDays(formData) || undefined,
          hepaAirScrubberQty: getEffectiveHepaQty(formData),
          hepaAirScrubberDays: formData.hepaAirScrubberDays || undefined,
        });
        // Save path mirror of the render-side per-field override precedence.
        const o1Labour = round2(resolveOverridableValue(formData.option1LabourOverride, opt1AutoResult.labourAfterDiscount));
        const o1Equipment = round2(resolveOverridableValue(formData.option1EquipmentOverride, opt1AutoResult.equipmentCost));
        const o1Subtotal = round2(o1Labour + o1Equipment);
        saveOption1Total = round2(o1Subtotal + round2(o1Subtotal * 0.1));
        saveOption1Labour = o1Labour;
        saveOption1Equipment = o1Equipment;
        saveOption2Total = saveTotal;

        // Dual-write guard: both totals must be non-zero and finite before persisting.
        // A zero or NaN total here means the form has no hours entered yet — saving
        // would write a blank price to the customer PDF for one option.
        if (!saveOption1Total || !isFinite(saveOption1Total) || saveOption1Total <= 0) {
          throw new Error('Option 1 total could not be computed — ensure surface treatment hours are entered before saving in Both-options mode.');
        }
        if (!saveOption2Total || !isFinite(saveOption2Total) || saveOption2Total <= 0) {
          throw new Error('Option 2 total could not be computed — ensure all labour hours are entered before saving in Both-options mode.');
        }
      } else if (formData.optionSelected === 1) {
        saveOption1Total = saveTotal;
        // Null-clear option 2 so stale DB values do not survive a mode switch
        saveOption2Total = null;
      } else if (formData.optionSelected === 2) {
        saveOption2Total = saveTotal;
        // Null-clear option 1 so stale DB values do not survive a mode switch
        saveOption1Total = null;
      }

      // Snapshot existing DB state for milestone diff — fetch before any write.
      // If the inspection doesn't exist yet (first save) these return null/empty,
      // and diffPayload treats null oldRow as no changes (new-row inserts do not
      // produce a milestone — the initial save has no "old" to diff against).
      const existingInspectionSnap = currentInspectionId
        ? await supabase
            .from('inspections')
            .select('*')
            .eq('id', currentInspectionId)
            .maybeSingle()
            .then((r) => r.data ?? null)
        : null;

      const existingAreasSnap = currentInspectionId
        ? await supabase
            .from('inspection_areas')
            .select('*')
            .eq('inspection_id', currentInspectionId)
            .then((r) => r.data ?? [])
        : [];

      const existingSubfloorSnap = currentInspectionId
        ? await supabase
            .from('subfloor_data')
            .select('*')
            .eq('inspection_id', currentInspectionId)
            .maybeSingle()
            .then((r) => r.data ?? null)
        : null;

      // 1. Upsert inspections row
      const inspectionRow: Record<string, any> = {
        lead_id: leadId,
        inspector_id: user.id,
        inspector_name: formData.inspector,
        triage_description: formData.triage,
        requested_by: formData.requestedBy,
        attention_to: formData.attentionTo,
        inspection_date: formData.inspectionDate || new Date().toISOString().split('T')[0],
        property_occupation: formData.propertyOccupation || null,
        dwelling_type: formData.dwellingType || null,
        outdoor_temperature: formData.outdoorTemperature ? parseFloat(formData.outdoorTemperature) : null,
        outdoor_humidity: formData.outdoorHumidity ? parseFloat(formData.outdoorHumidity) : null,
        outdoor_dew_point: formData.outdoorDewPoint ? parseFloat(formData.outdoorDewPoint) : null,
        outdoor_comments: formData.outdoorComments || null,
        direction_photos_enabled: formData.directionPhotosEnabled,
        waste_disposal_required: formData.wasteDisposal?.enabled ?? formData.wasteDisposalEnabled,
        waste_disposal_amount: formData.wasteDisposalAmount || null,
        waste_disposal_m3: formData.wasteDisposal?.cubicMeters ?? null,
        waste_disposal_calculated_cost: formData.wasteDisposal?.calculatedCost ?? null,
        waste_disposal_confirmed_cost: formData.wasteDisposal?.confirmedCost ?? null,
        waste_disposal_is_overridden: formData.wasteDisposal?.isOverridden ?? false,
        option_selected: formData.optionSelected,
        treatment_methods: formData.optionSelected === 1
          ? formData.selectedTreatmentMethods.filter((m) => !OPTION_2_ONLY_METHODS.includes(m))
          : formData.selectedTreatmentMethods,
        // Backward compat: keep old boolean columns in sync
        hepa_vac: formData.selectedTreatmentMethods.includes('HEPA Vacuuming'),
        antimicrobial: formData.selectedTreatmentMethods.includes('Surface Remediation Treatment'),
        stain_removing_antimicrobial: formData.stainRemovingAntimicrobial,
        home_sanitation_fogging: formData.selectedTreatmentMethods.includes('ULV Fogging - Property'),
        commercial_dehumidifier_qty: getEffectiveDryingQty(formData, 'commercialDehumidifierQty'),
        air_movers_qty: getEffectiveDryingQty(formData, 'airMoversQty'),
        rcd_box_qty: getEffectiveDryingQty(formData, 'rcdBoxQty'),
        hepa_air_scrubber_qty: getEffectiveHepaQty(formData) || 0,
        // NULL = auto (HEPA follows the shared equipment days); >0 = explicit hire period
        hepa_air_scrubber_days: formData.hepaAirScrubberDays > 0 ? formData.hepaAirScrubberDays : null,
        equipment_days: saveFullResult.equipment.days,
        recommended_dehumidifier: formData.recommendDehumidifier ? (formData.dehumidifierSize || null) : null,
        cause_of_mould: formData.causeOfMould || null,
        additional_info_technician: formData.additionalInfoForTech || null,
        additional_equipment_comments: formData.additionalEquipmentComments || null,
        parking_option: formData.parkingOptions || null,
        no_demolition_hours: saveNonDemoHours,
        demolition_hours: saveDemoHours,
        subfloor_hours: saveSubfloorHours,
        equipment_cost_ex_gst: saveEquipment || 0,
        labour_cost_ex_gst: saveLabour || 0,
        // NOTE: pricing.ts keeps discountPercent on decimal scale (0–0.13 max).
        // DB column discount_percent uses percent scale (0–13). Convert at the
        // persistence boundary so the CHECK constraint (0–13) is satisfied and
        // InspectionDataDisplay renders the correct human-readable value.
        discount_percent: (saveFullResult.discountPercent || 0) * 100,
        subtotal_ex_gst: saveSubtotal || 0,
        gst_amount: saveGst || 0,
        total_inc_gst: saveTotal || 0,
        // BUG-021: persist override state so reload restores it. The flag now
        // means "at least one Editable Estimate field override is active";
        // reconcileLoadedOverride tells the overridden field(s) apart from
        // auto snapshots on load. manual_total_inc_gst only carries the legacy
        // whole-total override (no technician UI writes it) — null otherwise
        // so stale totals never mislead invoice generation.
        manual_labour_override: anyOverride,
        manual_total_inc_gst: formData.manualTotal > 0 ? parseFloat(String(formData.manualTotal)) : null,
        option_1_labour_ex_gst: saveOption1Labour,
        option_1_equipment_ex_gst: saveOption1Equipment,
        option_1_total_inc_gst: saveOption1Total,
        option_2_total_inc_gst: saveOption2Total,
        // Stage 3.4.5: AI summary fields (ai_summary_text, what_we_*_text,
        // problem_analysis_content, demolition_content) are no longer written
        // through the technician form. The canonical store is
        // ai_summary_versions, populated by generate-inspection-summary EF
        // (initial / regeneration) and InspectionAIReview.handleSave (manual_edit).
        // Dropped per audit gate sign-off 2026-05-01.
        // B4: write subfloor_required toggle state. Agent C adds the column via migration.
        subfloor_required: formData.subfloorRequired ?? null,
        updated_at: new Date().toISOString(),
      };

      let inspectionId = currentInspectionId;

      if (inspectionId) {
        // UPDATE existing inspection
        const { error: updateError } = await supabase
          .from('inspections')
          .update(inspectionRow)
          .eq('id', inspectionId);
        if (updateError) throw updateError;
      } else {
        // INSERT new inspection
        const { data: insertData, error: insertError } = await supabase
          .from('inspections')
          .insert(inspectionRow)
          .select('id, job_number')
          .single();
        if (insertError) throw insertError;
        inspectionId = insertData.id;
        setCurrentInspectionId(inspectionId);
        if (insertData.job_number) {
          setFormData((prev) => ({ ...prev, jobNumber: insertData.job_number }));
        }
      }

      // 2. Upsert inspection_areas
      // Map infrared observation strings to boolean columns
      const mapInfraredToBooleans = (observations: string[]) => ({
        infrared_observation_no_active: observations.includes('No Active Water Intrusion Detected'),
        infrared_observation_water_infiltration: observations.includes('Active Water Infiltration'),
        infrared_observation_past_ingress: observations.includes('Past Water Ingress (Dried)'),
        infrared_observation_condensation: observations.includes('Condensation Pattern'),
        infrared_observation_missing_insulation: observations.includes('Missing/Inadequate Insulation'),
      });

      // Get existing area IDs from DB to detect deletions
      const { data: existingAreasDb } = await supabase
        .from('inspection_areas')
        .select('id')
        .eq('inspection_id', inspectionId);
      const existingAreaIds = new Set((existingAreasDb || []).map((a: any) => a.id));
      const currentAreaIds = new Set(formData.areas.map((a) => a.id));

      // Delete removed areas
      const areasToDelete = [...existingAreaIds].filter((id) => !currentAreaIds.has(id));
      if (areasToDelete.length > 0) {
        await supabase.from('inspection_areas').delete().in('id', areasToDelete);
      }

      // Upsert each area
      for (let i = 0; i < formData.areas.length; i++) {
        const area = formData.areas[i];
        const areaRow: Record<string, any> = {
          inspection_id: inspectionId,
          area_order: i,
          area_name: area.areaName || `Area ${i + 1}`,
          mould_visible_locations: area.mouldVisibleLocations || [],
          mould_visible_custom: area.mouldVisibleCustom || null,
          mould_description: area.mouldVisibleLocations?.length
            ? area.mouldVisibleLocations.join(', ') + (area.mouldVisibleCustom ? '. ' + area.mouldVisibleCustom : '')
            : area.mouldDescription || null,
          comments: area.commentsForReport || null,
          temperature: area.temperature ? parseFloat(area.temperature) : null,
          humidity: area.humidity ? parseFloat(area.humidity) : null,
          dew_point: area.dewPoint ? parseFloat(area.dewPoint) : null,
          // moistureReadings array convention: index 0 = internal, index 1 = external.
          // Both columns must be written so PDF placeholder {{internal_moisture}}
          // and {{external_moisture}} render correctly per area.
          internal_moisture: area.moistureReadings[0]?.reading ? parseFloat(area.moistureReadings[0].reading) : null,
          external_moisture: area.moistureReadings[1]?.reading ? parseFloat(area.moistureReadings[1].reading) : null,
          internal_office_notes: area.internalNotes || null,
          extra_notes: area.extraNotes || null,
          primary_photo_id: area.primaryPhotoId || null,
          infrared_enabled: area.infraredEnabled,
          ...mapInfraredToBooleans(area.infraredObservations || []),
          job_time_minutes: Math.round((area.timeWithoutDemo || 0) * 60),
          demolition_required: area.demolitionRequired,
          demolition_time_minutes: Math.round((area.demolitionTime || 0) * 60),
          demolition_description: area.demolitionDescription || null,
          updated_at: new Date().toISOString(),
        };

        if (existingAreaIds.has(area.id)) {
          // UPDATE existing area
          const { error: areaUpdateErr } = await supabase
            .from('inspection_areas')
            .update(areaRow)
            .eq('id', area.id);
          if (areaUpdateErr) console.error('[Save] Area update error:', areaUpdateErr);
        } else {
          // INSERT new area with the client-generated UUID
          const { error: areaInsertErr } = await supabase
            .from('inspection_areas')
            .insert({ id: area.id, ...areaRow });
          if (areaInsertErr) console.error('[Save] Area insert error:', areaInsertErr);
        }

        // 3. Upsert moisture_readings for this area (always 2: internal + external)
        if (area.moistureReadings.length > 0) {
          // Get existing reading IDs
          const { data: existingReadingsDb } = await supabase
            .from('moisture_readings')
            .select('id')
            .eq('area_id', area.id);
          const existingReadingIds = new Set((existingReadingsDb || []).map((r: any) => r.id));
          const currentReadingIds = new Set(area.moistureReadings.map((r) => r.id));

          // Delete removed readings
          const readingsToDelete = [...existingReadingIds].filter((id) => !currentReadingIds.has(id));
          if (readingsToDelete.length > 0) {
            await supabase.from('moisture_readings').delete().in('id', readingsToDelete);
          }

          // Upsert each reading, then link its photo
          for (let j = 0; j < area.moistureReadings.length; j++) {
            const reading = area.moistureReadings[j];
            const readingRow = {
              area_id: area.id,
              reading_order: j,
              title: reading.title || null,
              moisture_percentage: reading.reading ? parseFloat(reading.reading) : 0,
            };

            if (existingReadingIds.has(reading.id)) {
              await supabase.from('moisture_readings').update(readingRow).eq('id', reading.id);
            } else {
              await supabase.from('moisture_readings').insert({ id: reading.id, ...readingRow });
            }

            // Link photo to this moisture reading (photo was uploaded without moisture_reading_id).
            // Stage 4.3: guard against resurrecting soft-deleted rows.
            // BUG-026: breadcrumbs track success/failure so Sentry can surface orphaned photos.
            if (reading.photo) {
              const { error: linkError } = await supabase
                .from('photos')
                .update({ moisture_reading_id: reading.id })
                .eq('id', reading.photo.id)
                .is('deleted_at', null);

              if (linkError) {
                addBusinessBreadcrumb('photo_moisture_link_failed', {
                  photo_id: reading.photo.id,
                  moisture_reading_id: reading.id,
                  error_message: linkError.message,
                });
              } else {
                addBusinessBreadcrumb('photo_moisture_link', {
                  photo_id: reading.photo.id,
                  moisture_reading_id: reading.id,
                });
              }
            }
          }
        }
      }

      // 4. Upsert subfloor_data — skip when subfloor is explicitly absent.
      // B4: `!== false` preserves writes for legacy null rows (undetermined state).
      if (formData.subfloorRequired !== false) {
        const subfloorRow = {
          inspection_id: inspectionId,
          observations: formData.subfloorObservations || null,
          comments: formData.subfloorComments || null,
          landscape: formData.subfloorLandscape || null,
          sanitation_required: formData.subfloorSanitation,
          treatment_time_minutes: Math.round((formData.subfloorTreatmentTime || 0) * 60),
          updated_at: new Date().toISOString(),
        };

        // Check if subfloor_data exists
        const { data: existingSubfloor } = await supabase
          .from('subfloor_data')
          .select('id')
          .eq('inspection_id', inspectionId)
          .maybeSingle();

        let subfloorId: string;
        if (existingSubfloor) {
          subfloorId = existingSubfloor.id;
          const { error: sfUpdateErr } = await supabase.from('subfloor_data').update(subfloorRow).eq('id', subfloorId);
          if (sfUpdateErr) console.error('[Save] Subfloor update error:', sfUpdateErr);
        } else {
          const { data: newSubfloor, error: sfInsertErr } = await supabase
            .from('subfloor_data')
            .insert(subfloorRow)
            .select('id')
            .single();
          if (sfInsertErr) throw sfInsertErr;
          subfloorId = newSubfloor.id;
        }

        // 5. Upsert subfloor_readings
        if (formData.subfloorReadings.length > 0) {
          const { data: existingSrDb } = await supabase
            .from('subfloor_readings')
            .select('id')
            .eq('subfloor_id', subfloorId);
          const existingSrIds = new Set((existingSrDb || []).map((r: any) => r.id));
          const currentSrIds = new Set(formData.subfloorReadings.map((r) => r.id));

          const srToDelete = [...existingSrIds].filter((id) => !currentSrIds.has(id));
          if (srToDelete.length > 0) {
            await supabase.from('subfloor_readings').delete().in('id', srToDelete);
          }

          for (let k = 0; k < formData.subfloorReadings.length; k++) {
            const sr = formData.subfloorReadings[k];
            const srRow = {
              subfloor_id: subfloorId,
              reading_order: k,
              moisture_percentage: sr.reading ? parseFloat(sr.reading) : 0,
              location: sr.location || 'Unknown',
            };

            if (existingSrIds.has(sr.id)) {
              await supabase.from('subfloor_readings').update(srRow).eq('id', sr.id);
            } else {
              await supabase.from('subfloor_readings').insert({ id: sr.id, ...srRow });
            }
          }
        }
      }

      // Compute union diff across all 5 tables and emit one milestone row.
      // Each call to diffPayload returns raw DB column names as FieldChange.field
      // so the timeline resolves human labels via getFieldLabel().
      if (inspectionId) {
        const allChanges: FieldChange[] = [];

        // inspections diff — compare the payload we just wrote against the snapshot
        if (existingInspectionSnap) {
          allChanges.push(
            ...diffPayload(existingInspectionSnap as Record<string, unknown>, inspectionRow as Record<string, unknown>)
          );
        }

        // inspection_areas diff — per-area against the pre-save snapshots
        const areaSnapMap = new Map(
          (existingAreasSnap as Array<Record<string, unknown>>).map((a) => [a.id as string, a])
        );
        for (let i = 0; i < formData.areas.length; i++) {
          const area = formData.areas[i];
          const oldArea = areaSnapMap.get(area.id) ?? null;
          if (oldArea) {
            const areaPayload: Record<string, unknown> = {
              area_name: area.areaName || `Area ${i + 1}`,
              comments: area.commentsForReport || null,
              temperature: area.temperature ? parseFloat(area.temperature) : null,
              humidity: area.humidity ? parseFloat(area.humidity) : null,
              dew_point: area.dewPoint ? parseFloat(area.dewPoint) : null,
              internal_moisture: area.moistureReadings[0]?.reading ? parseFloat(area.moistureReadings[0].reading) : null,
              external_moisture: area.moistureReadings[1]?.reading ? parseFloat(area.moistureReadings[1].reading) : null,
              internal_office_notes: area.internalNotes || null,
              extra_notes: area.extraNotes || null,
              infrared_enabled: area.infraredEnabled,
              job_time_minutes: Math.round((area.timeWithoutDemo || 0) * 60),
              demolition_required: area.demolitionRequired,
              demolition_time_minutes: Math.round((area.demolitionTime || 0) * 60),
              demolition_description: area.demolitionDescription || null,
              mould_visible_custom: area.mouldVisibleCustom || null,
            };
            allChanges.push(...diffPayload(oldArea, areaPayload));
          }
        }

        // subfloor_data diff
        if (existingSubfloorSnap) {
          const subfloorPayload: Record<string, unknown> = {
            observations: formData.subfloorObservations || null,
            comments: formData.subfloorComments || null,
            landscape: formData.subfloorLandscape || null,
            sanitation_required: formData.subfloorSanitation,
            treatment_time_minutes: Math.round((formData.subfloorTreatmentTime || 0) * 60),
          };
          allChanges.push(
            ...diffPayload(existingSubfloorSnap as Record<string, unknown>, subfloorPayload)
          );
        }

        void logSectionMilestone({
          leadId,
          inspectionId,
          sectionNumber: currentSection,
          sectionName: SECTION_TITLES[currentSection - 1] ?? `Section ${currentSection}`,
          changes: allChanges,
        });
      }

      setHasUnsavedChanges(false);
      lastSaveFailedOfflineRef.current = false;
      if (options?.silent) {
        toast({
          title: 'Auto-saved',
          description: 'Progress saved to the server',
          duration: 2000,
        });
      } else {
        toast({
          title: 'Saved',
          description: `Section ${currentSection} saved to the server`,
        });
      }
      // Return the resolved inspection id so the Complete handler can pass a
      // guaranteed-valid UUID to the AI Edge Function (currentInspectionId state
      // is set async and is stale within the same render).
      return inspectionId;
    } catch (err: any) {
      captureBusinessError('Inspection form save failed', {
        leadId,
        inspectionId: currentInspectionId,
        section: currentSection,
        error: err?.message || String(err),
      });
      if (isNetworkLevelError(err)) {
        lastSaveFailedOfflineRef.current = true;
        toast({
          title: (
            <span className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 shrink-0" />
              You're offline — not saved to the server
            </span>
          ),
          description:
            "Your changes are only on this device for now. Keep this form open — it will save to the server automatically once you're back online.",
          className: OFFLINE_TOAST_CLASS,
          duration: 8000,
        });
      } else {
        toast({
          title: 'Save Failed',
          description: err?.message || 'Failed to save inspection data',
          variant: 'destructive',
        });
      }
      return currentInspectionId;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 30 seconds
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;

  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChangesRef.current && !isSavingRef.current) {
        handleSaveRef.current({ silent: true });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // localStorage backup — saves form state every 30s as crash recovery
  const localStorageKey = currentInspectionId ? `mrc_inspection_backup_${currentInspectionId}` : null;

  useEffect(() => {
    if (!localStorageKey || !hasUnsavedChanges) return;
    const backupTimer = setTimeout(() => {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify({
          formData,
          currentSection,
          savedAt: new Date().toISOString(),
        }));
      } catch {
        // localStorage full or unavailable — ignore
      }
    }, 30000);
    return () => clearTimeout(backupTimer);
  }, [formData, currentSection, localStorageKey, hasUnsavedChanges]);

  // On mount: check for localStorage backup and offer restore
  useEffect(() => {
    if (!localStorageKey) return;
    try {
      const backup = localStorage.getItem(localStorageKey);
      if (backup) {
        const parsed = JSON.parse(backup);
        const savedAt = new Date(parsed.savedAt);
        const ageMinutes = (Date.now() - savedAt.getTime()) / 60000;
        // Only offer restore if backup is less than 24 hours old
        if (ageMinutes < 1440 && parsed.formData) {
          toast({
            title: 'Unsaved work found',
            description: `You have a backup from ${savedAt.toLocaleTimeString('en-AU').replace(/\b[ap]m\b/gi, (m) => m.toUpperCase())}. Tap to restore.`,
            duration: 10000,
            action: {
              label: 'Restore',
              onClick: () => {
                setFormData(parsed.formData);
                if (parsed.currentSection) setCurrentSection(parsed.currentSection);
                toast({ title: 'Restored', description: 'Your previous work has been restored.' });
              },
            },
          } as any);
        }
      }
    } catch {
      // Corrupt backup — ignore
    }
  }, [localStorageKey]);

  // Clear localStorage backup on successful save
  useEffect(() => {
    if (!hasUnsavedChanges && localStorageKey) {
      try { localStorage.removeItem(localStorageKey); } catch {}
    }
  }, [hasUnsavedChanges, localStorageKey]);

  // Form validation before submit
  const [validationErrors, setValidationErrors] = useState<{ section: number; label: string; message: string }[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  const validateForm = (): { section: number; label: string; message: string }[] => {
    const { errors } = validateInspectionCompletion({
      inspectionDate: formData.inspectionDate,
      areas: formData.areas,
      optionSelected: formData.optionSelected,
      selectedTreatmentMethods: formData.selectedTreatmentMethods,
      noDemolitionHours: formData.noDemolitionHours || 0,
      demolitionHours: formData.demolitionHours || 0,
      subfloorHours: formData.subfloorHours || 0,
      manualPriceOverride: formData.manualPriceOverride,
    });
    return errors;
  };

  // Navigation handlers (auto-save on section change)
  const handlePrevious = () => {
    if (hasUnsavedChanges) handleSave();
    setCurrentSection((prev) => Math.max(1, prev - 1));
  };

  const [isCompleting, setIsCompleting] = useState(false);

  const handleNext = async () => {
    // Section 6 gate: a confirmed waste price must exist before leaving the section,
    // so a blank/unconfirmed price never reaches the cost estimate or invoice.
    if (
      currentSection === 6 &&
      formData.wasteDisposal?.enabled &&
      formData.wasteDisposal.confirmedCost == null
    ) {
      toast({
        title: 'Confirm the waste disposal price',
        description: 'Confirm or override the waste disposal price to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (currentSection === TOTAL_SECTIONS) {
      // B6: subfloorRequired must be explicitly set before submission.
      if (formData.subfloorRequired === null || formData.subfloorRequired === undefined) {
        toast({
          title: 'Subfloor confirmation required',
          description: 'Please confirm whether the property has a subfloor (Section 4) before submitting.',
          variant: 'destructive',
        });
        setCurrentSection(4);
        return;
      }

      // Waste disposal: a confirmed price is required before completion so an
      // enabled-but-unconfirmed waste charge can never reach the DB and bill $0.
      if (formData.wasteDisposal?.enabled && formData.wasteDisposal.confirmedCost == null) {
        toast({
          title: 'Confirm the waste disposal price',
          description: 'Confirm or override the waste disposal price (Section 6) before submitting.',
          variant: 'destructive',
        });
        setCurrentSection(6);
        return;
      }

      // Validate before completing
      const errors = validateForm();
      if (errors.length > 0) {
        setValidationErrors(errors);
        setShowValidationDialog(true);
        return;
      }

      // Final section — complete inspection, trigger AI generation, update status
      setIsCompleting(true);
      try {
        // 1. Save all form data — capture the resolved inspection id (handleSave
        // sets currentInspectionId via async state, which is stale here on a
        // brand-new inspection completed in a single render).
        const savedInspectionId = await handleSave();

        // Offline guard: handleSave swallows its own errors, so without this
        // check an offline Complete would sail on to a "Inspection Complete /
        // Inspection saved" toast while nothing reached the server. Stop here
        // with honest messaging; the form stays open so auto-save can retry.
        if (lastSaveFailedOfflineRef.current) {
          toast({
            title: (
              <span className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 shrink-0" />
                You're offline — inspection not submitted
              </span>
            ),
            description:
              "Nothing was sent to the server. Your work is kept on this device — keep this form open and tap Complete again once you're back online.",
            className: OFFLINE_TOAST_CLASS,
            duration: 10000,
          });
          return;
        }

        const effectiveInspectionId = savedInspectionId ?? currentInspectionId;

        // 2. Generate AI summary via edge function. The EF requires a valid
        // inspectionId (uuid); passing the stale null would 400 and skip the
        // ai_summary_versions write.
        let aiError: { message: string } | null = null;
        if (!effectiveInspectionId) {
          aiError = { message: 'Inspection id unavailable after save' };
          console.error('[AI Generate on Complete] Missing inspection id; skipping AI generation');
        } else {
          const payload = buildAIPayload({ ...formData, ...lastSavedTotalsRef.current }, lead);
          const { data: { session: aiSession } } = await supabase.auth.getSession();
          const result = await invokeEdgeFunction('generate-inspection-summary', {
            formData: payload,
            inspectionId: effectiveInspectionId,
            userId: aiSession?.user?.id,
            structured: true,
          });
          aiError = result.error;
        }

        // Stage 3.4.5: post-AI mirror write removed. The EF
        // (generate-inspection-summary) is now the canonical writer of
        // ai_summary_versions per Stage 3.2; the previous client-side
        // inspections.update() here was a redundant mirror.
        if (aiError) {
          console.error('[AI Generate on Complete] Error:', aiError);
          // AI failed — still proceed, admin can regenerate manually
        }

        // 4. Update lead status to inspection_ai_summary
        if (leadId) {
          await supabase.from('leads').update({ status: 'inspection_ai_summary' }).eq('id', leadId);
          await logFieldEdits({
            leadId,
            entityType: 'lead',
            entityId: leadId,
            changes: [{ field: 'status', old: lead?.status ?? null, new: 'inspection_ai_summary' }],
            extraMetadata: { trigger: 'inspection_completed', ai_generated: !aiError },
          });
          queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
        }

        // 5. Navigate back to technician home
        toast({
          title: 'Inspection Complete',
          description: aiError
            ? 'Inspection saved. AI generation failed — admin can regenerate.'
            : 'Inspection saved and AI summary generated for admin review.',
        });
        navigate('/technician');
      } catch (err: any) {
        captureBusinessError('Complete inspection failed', {
          leadId,
          inspectionId: currentInspectionId,
          error: err?.message || String(err),
        });
        if (isNetworkLevelError(err)) {
          toast({
            title: (
              <span className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 shrink-0" />
                You're offline — inspection not submitted
              </span>
            ),
            description:
              "Nothing was sent to the server. Your work is kept on this device — keep this form open and tap Complete again once you're back online.",
            className: OFFLINE_TOAST_CLASS,
            duration: 10000,
          });
        } else {
          toast({
            title: 'Error',
            description: err?.message || 'Failed to complete inspection. Please try again.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsCompleting(false);
      }
      return;
    }
    if (hasUnsavedChanges) handleSave();
    setCurrentSection((prev) => Math.min(TOTAL_SECTIONS, prev + 1));
  };

  // Section props
  const sectionProps: SectionProps = {
    formData,
    onChange: handleChange,
    onAreaChange: handleAreaChange,
    onAddArea: handleAddArea,
    onRemoveArea: handleRemoveArea,
    onPhotoCapture: handlePhotoCapture,
    onPhotoRemove: handlePhotoRemove,
    onMoistureReadingAdd: handleMoistureReadingAdd,
    onMoistureReadingRemove: handleMoistureReadingRemove,
    onMoistureReadingChange: handleMoistureReadingChange,
    onSubfloorReadingAdd: handleSubfloorReadingAdd,
    onSubfloorReadingRemove: handleSubfloorReadingRemove,
    onSubfloorReadingChange: handleSubfloorReadingChange,
    onCalculateDewPoint: handleCalculateDewPoint,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#86868b] text-sm">Loading inspection form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-[160px]">
      <Header
        onBack={handleBack}
        onSave={handleSave}
        currentSection={currentSection}
        totalSections={TOTAL_SECTIONS}
        titleOverride={adminMode ? 'Edit Inspection (Admin)' : undefined}
      />

      <main className="flex-1 p-4 space-y-6">
        {/* Customer Info Card (shown on all sections) */}
        <CustomerInfoCard
          lead={lead}
          booking={booking}
          isExpanded={customerInfoExpanded}
          onToggle={() => setCustomerInfoExpanded(!customerInfoExpanded)}
        />

        {/* Section Content */}
        {currentSection === 1 && <Section1BasicInfo {...sectionProps} />}
        {currentSection === 2 && <Section2PropertyDetails {...sectionProps} />}
        {currentSection === 3 && <Section3AreaInspection {...sectionProps} />}
        {currentSection === 4 && <Section4Subfloor {...sectionProps} />}
        {currentSection === 5 && <Section5OutdoorInfo {...sectionProps} />}
        {currentSection === 6 && <Section6WasteDisposal {...sectionProps} />}
        {currentSection === 7 && <Section7WorkProcedure {...sectionProps} />}
        {currentSection === 8 && <Section8JobSummary {...sectionProps} />}
        {currentSection === 9 && <Section9CostEstimate {...sectionProps} />}
      </main>

      <Footer
        onSave={handleSave}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isSaving={isSaving}
        showPrevious={currentSection > 1}
        isLastSection={currentSection === TOTAL_SECTIONS}
      />

      {/* Validation errors dialog */}
      {showValidationDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1d1d1f]">Missing Required Fields</h3>
                  <p className="text-sm text-[#86868b]">Please complete the following before submitting</p>
                </div>
              </div>
            </div>
            <div className="p-4 max-h-60 overflow-y-auto space-y-2">
              {validationErrors.map((err, i) => (
                <button
                  key={i}
                  className="w-full text-left p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-3"
                  style={{ minHeight: '48px' }}
                  onClick={() => {
                    setCurrentSection(err.section);
                    setShowValidationDialog(false);
                  }}
                >
                  <span className="w-7 h-7 bg-red-200 text-red-700 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {err.section}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-red-800">{err.label}</div>
                    <div className="text-xs text-red-600 truncate">{err.message}</div>
                  </div>
                  <ChevronRight className="h-[18px] w-[18px] text-red-400" />
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                className="w-full h-12 bg-[#007AFF] text-white font-semibold rounded-xl"
                onClick={() => setShowValidationDialog(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent hidden file input for photo uploads (mobile browsers block .click() on detached inputs) */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoInputChange}
      />

      {/* Completing overlay — shown while AI summary generates */}
      {isCompleting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-xl">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-[#1d1d1f] mb-2">Generating AI Summary</h3>
            <p className="text-sm text-[#86868b]">
              Please wait while we generate the inspection report content...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
