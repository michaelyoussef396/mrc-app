import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TechnicianBottomNav from '@/components/technician/TechnicianBottomNav';
import { calculateDewPoint } from '@/lib/inspectionUtils';
import {
  calculateCostEstimate,
  LABOUR_RATES,
  EQUIPMENT_RATES,
  formatCurrency,
  formatPercent,
} from '@/lib/calculations/pricing';
import {
  uploadInspectionPhoto,
  deleteInspectionPhoto,
  loadInspectionPhotos,
} from '@/lib/utils/photoUpload';
import type {
  InspectionFormData,
  InspectionArea,
  MoistureReading,
  SubfloorReading,
  Photo,
} from '@/types/inspection';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOTAL_SECTIONS = 10;

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
  'AI Summary',
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

const WASTE_DISPOSAL_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
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
}

interface BookingData {
  id: string;
  start_datetime: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateJobNumber(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MRC-${year}-${randomNum}`;
}

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
    });
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
    moistureReadingsEnabled: false,
    moistureReadings: [],
    externalMoisture: '',
    internalNotes: '',
    roomViewPhotos: [],
    infraredEnabled: false,
    infraredPhoto: null,
    naturalInfraredPhoto: null,
    infraredObservations: [],
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
}

function Header({ onBack, onSave, currentSection, totalSections }: HeaderProps) {
  const progress = (currentSection / totalSections) * 100;
  const sectionTitle = SECTION_TITLES[currentSection - 1] || 'Inspection Form';

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center p-2 -ml-2 text-[#007AFF] hover:bg-gray-100 rounded-lg transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <span className="material-symbols-outlined text-3xl">chevron_left</span>
        </button>
        <h1 className="text-lg font-bold leading-tight flex-1 text-center text-[#1d1d1f]">
          {sectionTitle}
        </h1>
        <button
          onClick={onSave}
          className="flex items-center justify-center p-2 -mr-2 text-[#007AFF] hover:bg-gray-100 rounded-lg transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <span className="material-symbols-outlined text-2xl">save</span>
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
          <span className="material-symbols-outlined text-xl">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {isExpanded && (
        <div className="divide-y divide-gray-100">
          <a
            href={`tel:${lead.phone.replace(/\s/g, '')}`}
            className="flex items-center p-4 active:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
              <span className="material-symbols-outlined text-xl">call</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#86868b] mb-0.5">Phone</p>
              <p className="font-medium text-[#1d1d1f] text-base">{formatPhone(lead.phone)}</p>
            </div>
            <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
          </a>

          <a
            href={`mailto:${lead.email}`}
            className="flex items-center p-4 active:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
              <span className="material-symbols-outlined text-xl">mail</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#86868b] mb-0.5">Email</p>
              <p className="font-medium text-[#1d1d1f] text-base">{lead.email}</p>
            </div>
            <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
          </a>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 active:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
              <span className="material-symbols-outlined text-xl">location_on</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#86868b] mb-0.5">Address</p>
              <p className="font-medium text-[#1d1d1f] text-base">{fullAddress}</p>
            </div>
            <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
          </a>

          {booking && (
            <div className="flex items-center p-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] mr-4">
                <span className="material-symbols-outlined text-xl">schedule</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#86868b] mb-0.5">Scheduled</p>
                <p className="font-medium text-[#1d1d1f] text-base">
                  {formatDisplayDate(booking.start_datetime)}
                </p>
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
      <span className="absolute right-4 text-gray-400 material-symbols-outlined text-lg">lock</span>
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
      <span className="material-symbols-outlined">add_a_photo</span>
      {label} {countText}
    </button>
  );
}

interface PhotoGridProps {
  photos: Photo[];
  onRemove: (photoId: string) => void;
}

function PhotoGrid({ photos, onRemove }: PhotoGridProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {photos.map((photo) => (
        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
          <img
            src={photo.url}
            alt={photo.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      ))}
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
          <span className="material-symbols-outlined text-lg">close</span>
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
      className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200 z-40"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      <div className="flex flex-col gap-3 max-w-md mx-auto w-full pb-16">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="w-full h-14 bg-[#007AFF] text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
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
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Previous
            </button>
          )}
          <button
            onClick={onNext}
            className={`${showPrevious ? 'flex-1' : 'w-full'} text-center text-[#007AFF] font-semibold text-base py-2 flex items-center justify-center gap-1 active:opacity-70`}
            style={{ minHeight: '48px' }}
          >
            {isLastSection ? 'Complete' : 'Next Section'}
            <span className="material-symbols-outlined text-lg">
              {isLastSection ? 'check_circle' : 'arrow_forward'}
            </span>
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
        <ReadOnlyInput value={formData.jobNumber} />
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
                  <span className="material-symbols-outlined">delete</span>
                </button>
              )}
              <span className="material-symbols-outlined text-[#86868b]">
                {expandedAreas[area.id] ? 'expand_less' : 'expand_more'}
              </span>
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

              {/* Mould Description */}
              <FormField label="Mould Description">
                <textarea
                  rows={2}
                  value={area.mouldDescription}
                  onChange={(e) => onAreaChange?.(area.id, 'mouldDescription', e.target.value)}
                  placeholder="Describe visible mould..."
                  className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none"
                />
              </FormField>

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

              {/* Moisture Readings Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-[#1d1d1f]">Moisture Readings</span>
                <ToggleSwitch
                  checked={area.moistureReadingsEnabled}
                  onChange={(checked) => onAreaChange?.(area.id, 'moistureReadingsEnabled', checked)}
                />
              </div>

              {/* Moisture Readings Section */}
              {area.moistureReadingsEnabled && (
                <div className="space-y-3 pl-4 border-l-2 border-[#007AFF]">
                  {area.moistureReadings.map((reading, rIndex) => (
                    <div key={reading.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#86868b]">Reading {rIndex + 1}</span>
                        <button
                          onClick={() => onMoistureReadingRemove?.(area.id, reading.id)}
                          className="text-red-500 p-1"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={reading.title}
                        onChange={(e) => onMoistureReadingChange?.(area.id, reading.id, 'title', e.target.value)}
                        placeholder="Location (e.g., Wall near window)"
                        className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                      />
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={reading.reading}
                          onChange={(e) => onMoistureReadingChange?.(area.id, reading.id, 'reading', e.target.value)}
                          placeholder="0-100%"
                          className="flex-1 h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                        />
                        {reading.photo ? (
                          <div className="relative w-12 h-12">
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
                            className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-[#007AFF]"
                          >
                            <span className="material-symbols-outlined">photo_camera</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => onMoistureReadingAdd?.(area.id)}
                    className="w-full h-12 bg-white border border-dashed border-[#007AFF] rounded-lg text-[#007AFF] font-medium flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Add Reading
                  </button>

                  {/* External Moisture */}
                  <FormField label="External Moisture %">
                    <input
                      type="number"
                      value={area.externalMoisture}
                      onChange={(e) => onAreaChange?.(area.id, 'externalMoisture', e.target.value)}
                      placeholder="0-100"
                      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                    />
                  </FormField>
                </div>
              )}

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

              {/* Room View Photos */}
              <FormField label="Room View Photos (Max 4)">
                <PhotoUploadButton
                  onClick={() => onPhotoCapture?.('roomView', area.id)}
                  label="Add Photos"
                  count={area.roomViewPhotos.length}
                  maxCount={4}
                />
                <PhotoGrid
                  photos={area.roomViewPhotos}
                  onRemove={(photoId) => onPhotoRemove?.('roomView', photoId, area.id)}
                />
              </FormField>

              {/* Infrared Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-[#1d1d1f]">Infrared Inspection</span>
                <ToggleSwitch
                  checked={area.infraredEnabled}
                  onChange={(checked) => onAreaChange?.(area.id, 'infraredEnabled', checked)}
                />
              </div>

              {/* Infrared Section */}
              {area.infraredEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-[#007AFF]">
                  <FormField label="Infrared Photo">
                    <SinglePhoto
                      photo={area.infraredPhoto}
                      onCapture={() => onPhotoCapture?.('infrared', area.id)}
                      onRemove={() => onPhotoRemove?.('infrared', area.infraredPhoto?.id || '', area.id)}
                      label="Capture Infrared"
                    />
                  </FormField>

                  <FormField label="Natural Light Comparison">
                    <SinglePhoto
                      photo={area.naturalInfraredPhoto}
                      onCapture={() => onPhotoCapture?.('naturalInfrared', area.id)}
                      onRemove={() => onPhotoRemove?.('naturalInfrared', area.naturalInfraredPhoto?.id || '', area.id)}
                      label="Capture Natural"
                    />
                  </FormField>

                  <FormField label="Infrared Observations">
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
                  </FormField>
                </div>
              )}

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
                  <FormField label="Demolition Time (Hours)">
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
        <span className="material-symbols-outlined">add</span>
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
  return (
    <section className="space-y-5">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div>
          <span className="font-semibold text-[#1d1d1f]">Subfloor Inspection Required</span>
          <p className="text-sm text-[#86868b]">Enable to add subfloor details</p>
        </div>
        <ToggleSwitch
          checked={formData.subfloorEnabled}
          onChange={(checked) => onChange('subfloorEnabled', checked)}
        />
      </div>

      {formData.subfloorEnabled && (
        <div className="space-y-5">
          {/* Observations */}
          <FormField label="Subfloor Observations">
            <textarea
              rows={3}
              value={formData.subfloorObservations}
              onChange={(e) => onChange('subfloorObservations', e.target.value)}
              placeholder="Raw observations from subfloor..."
              className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
            />
          </FormField>

          {/* Landscape */}
          <FormField label="Block Landscape">
            <div className="flex gap-3">
              {['Flat Block', 'Sloping Block'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange('subfloorLandscape', option)}
                  className={`flex-1 h-12 rounded-lg font-medium transition-colors ${
                    formData.subfloorLandscape === option
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-white border border-gray-200 text-[#1d1d1f]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </FormField>

          {/* Comments */}
          <FormField label="Subfloor Comments">
            <textarea
              rows={2}
              value={formData.subfloorComments}
              onChange={(e) => onChange('subfloorComments', e.target.value)}
              placeholder="Additional comments..."
              className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none"
            />
          </FormField>

          {/* Moisture Readings */}
          <FormField label="Subfloor Moisture Readings">
            <div className="space-y-3">
              {formData.subfloorReadings.map((reading, index) => (
                <div key={reading.id} className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={reading.location}
                      onChange={(e) => onSubfloorReadingChange?.(reading.id, 'location', e.target.value)}
                      placeholder="Location"
                      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                    />
                    <input
                      type="text"
                      value={reading.reading}
                      onChange={(e) => onSubfloorReadingChange?.(reading.id, 'reading', e.target.value)}
                      placeholder="Reading %"
                      className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4"
                    />
                  </div>
                  <button
                    onClick={() => onSubfloorReadingRemove?.(reading.id)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-lg"
                    style={{ minWidth: '48px', minHeight: '48px' }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
              <button
                onClick={onSubfloorReadingAdd}
                className="w-full h-12 bg-white border border-dashed border-[#007AFF] rounded-lg text-[#007AFF] font-medium flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                Add Reading
              </button>
            </div>
          </FormField>

          {/* Photos */}
          <FormField label="Subfloor Photos">
            <PhotoUploadButton
              onClick={() => onPhotoCapture?.('subfloor')}
              label="Add Subfloor Photos"
              count={formData.subfloorPhotos.length}
              maxCount={20}
            />
            <PhotoGrid
              photos={formData.subfloorPhotos}
              onRemove={(photoId) => onPhotoRemove?.('subfloor', photoId)}
            />
          </FormField>

          {/* Sanitation Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium text-[#1d1d1f]">Subfloor Sanitation</span>
            <ToggleSwitch
              checked={formData.subfloorSanitation}
              onChange={(checked) => onChange('subfloorSanitation', checked)}
            />
          </div>

          {/* Racking (only if sanitation enabled) */}
          {formData.subfloorSanitation && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg ml-4 border-l-2 border-[#007AFF]">
              <span className="font-medium text-[#1d1d1f]">Racking Required</span>
              <ToggleSwitch
                checked={formData.subfloorRacking}
                onChange={(checked) => onChange('subfloorRacking', checked)}
              />
            </div>
          )}

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

// Section 6: Waste Disposal
function Section6WasteDisposal({ formData, onChange }: SectionProps) {
  return (
    <section className="space-y-5">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div>
          <span className="font-semibold text-[#1d1d1f]">Waste Disposal Required</span>
          <p className="text-sm text-[#86868b]">Enable to specify disposal amount</p>
        </div>
        <ToggleSwitch
          checked={formData.wasteDisposalEnabled}
          onChange={(checked) => onChange('wasteDisposalEnabled', checked)}
        />
      </div>

      {formData.wasteDisposalEnabled && (
        <FormField label="Waste Amount">
          <SelectInput
            value={formData.wasteDisposalAmount}
            onChange={(value) => onChange('wasteDisposalAmount', value)}
            options={WASTE_DISPOSAL_OPTIONS}
            placeholder="Select amount..."
          />
        </FormField>
      )}
    </section>
  );
}

// Section 7: Work Procedure
function Section7WorkProcedure({ formData, onChange }: SectionProps) {
  return (
    <section className="space-y-5">
      {/* Treatment Toggles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f]">Treatment Methods</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { key: 'hepaVac', label: 'HEPA Vacuuming' },
            { key: 'antimicrobial', label: 'Antimicrobial Treatment' },
            { key: 'stainRemovingAntimicrobial', label: 'Stain Removing Antimicrobial' },
            { key: 'homeSanitationFogging', label: 'Home Sanitation Fogging' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between p-4">
              <span className="text-[#1d1d1f]">{label}</span>
              <ToggleSwitch
                checked={formData[key as keyof InspectionFormData] as boolean}
                onChange={(checked) => onChange(key as keyof InspectionFormData, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Drying Equipment */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f]">Drying Equipment</h3>
          <ToggleSwitch
            checked={formData.dryingEquipmentEnabled}
            onChange={(checked) => onChange('dryingEquipmentEnabled', checked)}
          />
        </div>

        {formData.dryingEquipmentEnabled && (
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
          </div>
        )}
      </div>
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
  // Calculate cost estimate
  const costResult = calculateCostEstimate({
    nonDemoHours: formData.noDemolitionHours || 0,
    demolitionHours: formData.demolitionHours || 0,
    subfloorHours: formData.subfloorHours || 0,
    dehumidifierQty: formData.commercialDehumidifierQty || 0,
    airMoverQty: formData.airMoversQty || 0,
    rcdQty: formData.rcdBoxQty || 0,
    manualOverride: formData.manualPriceOverride,
    manualTotal: formData.manualTotal,
  });

  return (
    <section className="space-y-5">
      {/* Tier Pricing Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#007AFF]">info</span>
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
              </tr>
            </thead>
            <tbody className="text-[#1d1d1f]">
              <tr>
                <td className="py-1">No Demolition</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.nonDemo.tier2h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.nonDemo.tier8h)}</td>
              </tr>
              <tr>
                <td className="py-1">Demolition</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.demolition.tier2h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.demolition.tier8h)}</td>
              </tr>
              <tr>
                <td className="py-1">Subfloor</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.subfloor.tier2h)}</td>
                <td className="py-1 text-right">{formatCurrency(LABOUR_RATES.subfloor.tier8h)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-[#86868b] mt-3 italic">
            2h minimum charge • Linear interpolation 2-8h • Day blocks for 8h+
          </p>
        </div>
      </div>

      {/* Labour Hours Inputs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#007AFF]">schedule</span>
          Labour Hours
        </h3>

        <FormField label="No Demolition Hours">
          <NumberInput
            value={formData.noDemolitionHours}
            onChange={(value) => onChange('noDemolitionHours', value)}
            step={0.5}
            placeholder="0"
            unit="hrs"
          />
        </FormField>

        <FormField label="Demolition Hours">
          <NumberInput
            value={formData.demolitionHours}
            onChange={(value) => onChange('demolitionHours', value)}
            step={0.5}
            placeholder="0"
            unit="hrs"
          />
        </FormField>

        <FormField label="Subfloor Hours">
          <NumberInput
            value={formData.subfloorHours}
            onChange={(value) => onChange('subfloorHours', value)}
            step={0.5}
            placeholder="0"
            unit="hrs"
          />
        </FormField>
      </div>

      {/* Labour Calculation Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#007AFF]">calculate</span>
          Labour Breakdown
        </h3>
        <div className="space-y-2 text-sm">
          {/* Non-Demo */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <span className="text-[#1d1d1f]">No Demolition</span>
              <span className="text-[#86868b] ml-2">({formData.noDemolitionHours || 0}h)</span>
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
              <span className="text-[#86868b] ml-2">({formData.demolitionHours || 0}h)</span>
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
              <span className="text-[#86868b] ml-2">({formData.subfloorHours || 0}h)</span>
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
          <span className="material-symbols-outlined text-[#007AFF]">air</span>
          Equipment Breakdown ({costResult.totalDays} day{costResult.totalDays !== 1 ? 's' : ''})
        </h3>
        <div className="space-y-2 text-sm">
          {formData.commercialDehumidifierQty > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-[#1d1d1f]">Dehumidifier</span>
                <span className="text-[#86868b] ml-2">
                  ({formData.commercialDehumidifierQty} × ${EQUIPMENT_RATES.dehumidifier} × {costResult.totalDays} days)
                </span>
              </div>
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.equipment.dehumidifier.cost)}</span>
            </div>
          )}
          {formData.airMoversQty > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-[#1d1d1f]">Air Movers</span>
                <span className="text-[#86868b] ml-2">
                  ({formData.airMoversQty} × ${EQUIPMENT_RATES.airMover} × {costResult.totalDays} days)
                </span>
              </div>
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.equipment.airMover.cost)}</span>
            </div>
          )}
          {formData.rcdBoxQty > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-[#1d1d1f]">RCD Box</span>
                <span className="text-[#86868b] ml-2">
                  ({formData.rcdBoxQty} × ${EQUIPMENT_RATES.rcd} × {costResult.totalDays} days)
                </span>
              </div>
              <span className="font-medium text-[#1d1d1f]">{formatCurrency(costResult.equipment.rcd.cost)}</span>
            </div>
          )}
          {!formData.commercialDehumidifierQty && !formData.airMoversQty && !formData.rcdBoxQty && (
            <p className="text-[#86868b] italic py-2">No equipment selected (set in Section 7)</p>
          )}
          {/* Equipment Total */}
          <div className="flex justify-between items-center pt-2 font-medium">
            <span className="text-[#1d1d1f]">Equipment Total</span>
            <span className="text-[#1d1d1f]">{formatCurrency(costResult.equipmentCost)}</span>
          </div>
        </div>
      </div>

      {/* Manual Override */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div>
          <span className="font-semibold text-[#1d1d1f]">Manual Price Override</span>
          <p className="text-sm text-[#86868b]">Enter total manually</p>
        </div>
        <ToggleSwitch
          checked={formData.manualPriceOverride}
          onChange={(checked) => onChange('manualPriceOverride', checked)}
        />
      </div>

      {formData.manualPriceOverride && (
        <FormField label="Manual Total (Inc GST)">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]">$</span>
            <input
              type="number"
              value={formData.manualTotal || ''}
              onChange={(e) => onChange('manualTotal', parseFloat(e.target.value) || 0)}
              step={0.01}
              className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 pl-8 pr-4"
            />
          </div>
        </FormField>
      )}

      {/* Final Cost Summary */}
      <div className="bg-gradient-to-br from-[#007AFF]/5 to-[#007AFF]/10 rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-[#1d1d1f] text-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[#007AFF]">receipt_long</span>
          Final Summary
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#86868b]">Labour Subtotal</span>
            <span className="font-medium">{formatCurrency(costResult.labourSubtotal)}</span>
          </div>

          {costResult.discountPercent > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Multi-day Discount ({formatPercent(costResult.discountPercent)})</span>
              <span>-{formatCurrency(costResult.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-[#86868b]">Labour After Discount</span>
            <span className="font-medium">{formatCurrency(costResult.labourAfterDiscount)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-[#86868b]">Equipment Total</span>
            <span className="font-medium">{formatCurrency(costResult.equipmentCost)}</span>
          </div>

          <div className="border-t border-[#007AFF]/20 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-[#1d1d1f] font-medium">Subtotal (ex GST)</span>
              <span className="font-semibold">{formatCurrency(costResult.subtotalExGst)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[#86868b]">GST (10%)</span>
              <span className="font-medium">{formatCurrency(costResult.gstAmount)}</span>
            </div>
          </div>

          <div className="border-t-2 border-[#007AFF]/30 pt-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1d1d1f] text-xl">Total (inc GST)</span>
              <span className="font-bold text-[#007AFF] text-3xl">{formatCurrency(costResult.totalIncGst)}</span>
            </div>
          </div>
        </div>

        {/* Discount Tier Info */}
        <div className="mt-3 p-3 bg-white/60 rounded-lg">
          <p className="text-sm font-medium text-[#1d1d1f]">{costResult.discountTierDescription}</p>
          <p className="text-xs text-[#86868b] mt-1">
            Total Hours: {costResult.totalLabourHours}h • Work Days: {costResult.totalDays}
          </p>
        </div>
      </div>
    </section>
  );
}

// Section 10: AI Job Summary
function Section10AISummary({ formData, onChange }: SectionProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(
    !!(formData.jobSummaryFinal || formData.whatWeFoundText || formData.whatWeWillDoText)
  );
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  // Feedback inputs for each section
  const [jobSummaryFeedback, setJobSummaryFeedback] = useState('');
  const [whatWeFoundFeedback, setWhatWeFoundFeedback] = useState('');
  const [whatWeWillDoFeedback, setWhatWeWillDoFeedback] = useState('');

  const handleGenerateAll = async () => {
    setIsGenerating(true);

    try {
      // Build payload matching the Edge Function's InspectionFormData interface
      const payload = {
        propertyAddress: formData.address,
        inspectionDate: formData.inspectionDate,
        inspector: formData.inspector,
        triage: formData.triage,
        requestedBy: formData.requestedBy,
        attentionTo: formData.attentionTo,
        propertyOccupation: formData.propertyOccupation,
        dwellingType: formData.dwellingType,
        areas: formData.areas.map((a) => ({
          areaName: a.areaName,
          mouldVisibility: [] as string[],
          commentsForReport: a.commentsForReport,
          temperature: a.temperature,
          humidity: a.humidity,
          dewPoint: a.dewPoint,
          timeWithoutDemo: a.timeWithoutDemo,
          demolitionRequired: a.demolitionRequired,
          demolitionTime: a.demolitionTime,
          demolitionDescription: a.demolitionDescription,
          moistureReadings: a.moistureReadings.map((r) => ({ title: r.title, reading: r.reading })),
          infraredEnabled: a.infraredEnabled,
          infraredObservations: a.infraredObservations,
        })),
        subfloorEnabled: formData.subfloorEnabled,
        subfloorObservations: formData.subfloorObservations,
        subfloorComments: formData.subfloorComments,
        subfloorLandscape: formData.subfloorLandscape,
        subfloorSanitation: formData.subfloorSanitation,
        subfloorRacking: formData.subfloorRacking,
        subfloorTreatmentTime: formData.subfloorTreatmentTime,
        outdoorTemperature: formData.outdoorTemperature,
        outdoorHumidity: formData.outdoorHumidity,
        outdoorDewPoint: formData.outdoorDewPoint,
        outdoorComments: formData.outdoorComments,
        wasteDisposalEnabled: formData.wasteDisposalEnabled,
        wasteDisposalAmount: formData.wasteDisposalAmount,
        hepaVac: formData.hepaVac,
        antimicrobial: formData.antimicrobial,
        stainRemovingAntimicrobial: formData.stainRemovingAntimicrobial,
        homeSanitationFogging: formData.homeSanitationFogging,
        commercialDehumidifierEnabled: formData.commercialDehumidifierEnabled,
        commercialDehumidifierQty: formData.commercialDehumidifierQty,
        airMoversEnabled: formData.airMoversEnabled,
        airMoversQty: formData.airMoversQty,
        rcdBoxEnabled: formData.rcdBoxEnabled,
        rcdBoxQty: formData.rcdBoxQty,
        recommendDehumidifier: formData.recommendDehumidifier,
        dehumidifierSize: formData.dehumidifierSize,
        causeOfMould: formData.causeOfMould,
        additionalInfoForTech: formData.additionalInfoForTech,
        additionalEquipmentComments: formData.additionalEquipmentComments,
        parkingOptions: formData.parkingOptions,
        laborCost: formData.laborCost,
        equipmentCost: formData.equipmentCost,
        subtotalExGst: formData.subtotalExGst,
        gstAmount: formData.gstAmount,
        totalIncGst: formData.totalIncGst,
      };

      const { data, error } = await supabase.functions.invoke('generate-inspection-summary', {
        body: { formData: payload, structured: true },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'AI generation failed');

      // Map structured response to form fields
      onChange('whatWeFoundText', data.what_we_found || '');
      onChange('whatWeWillDoText', data.what_we_will_do || '');
      onChange('whatYouGetText', data.what_you_get || '');

      // Concatenate job summary sections into jobSummaryFinal
      const summaryParts = [
        data.what_we_discovered,
        data.identified_causes,
        data.contributing_factors,
        data.why_this_happened,
        data.immediate_actions,
        data.long_term_protection,
        data.what_success_looks_like,
        data.timeline_text,
      ].filter(Boolean);
      onChange('jobSummaryFinal', summaryParts.join('\n\n'));

      setHasGenerated(true);
    } catch (err: any) {
      console.error('[AI Generate] Error:', err);
      // Fallback: show error toast but keep the form usable
      const errorMsg = err?.message || 'Failed to generate AI summary';
      // If it's a network/auth error, show specific message
      if (errorMsg.includes('not configured')) {
        onChange('jobSummaryFinal', '');
        onChange('whatWeFoundText', '');
        onChange('whatWeWillDoText', '');
      }
      toast({ title: 'Generation Failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (section: 'jobSummary' | 'whatWeFound' | 'whatWeWillDo') => {
    const feedbackMap = {
      jobSummary: jobSummaryFeedback,
      whatWeFound: whatWeFoundFeedback,
      whatWeWillDo: whatWeWillDoFeedback,
    };
    const contentMap = {
      jobSummary: formData.jobSummaryFinal,
      whatWeFound: formData.whatWeFoundText,
      whatWeWillDo: formData.whatWeWillDoText,
    };

    const feedback = feedbackMap[section];
    const currentContent = contentMap[section];
    setRegeneratingSection(section);

    try {
      // Map section names to Edge Function section params
      const edgeFnSection = section === 'jobSummary' ? undefined : section;

      const payload = {
        propertyAddress: formData.address,
        areas: formData.areas.map((a) => ({
          areaName: a.areaName,
          mouldVisibility: [] as string[],
          commentsForReport: a.commentsForReport,
          temperature: a.temperature,
          humidity: a.humidity,
          moistureReadings: a.moistureReadings.map((r) => ({ title: r.title, reading: r.reading })),
          timeWithoutDemo: a.timeWithoutDemo,
          demolitionRequired: a.demolitionRequired,
          demolitionTime: a.demolitionTime,
        })),
        causeOfMould: formData.causeOfMould,
        hepaVac: formData.hepaVac,
        antimicrobial: formData.antimicrobial,
        stainRemovingAntimicrobial: formData.stainRemovingAntimicrobial,
        homeSanitationFogging: formData.homeSanitationFogging,
        subfloorEnabled: formData.subfloorEnabled,
      };

      const { data, error } = await supabase.functions.invoke('generate-inspection-summary', {
        body: {
          formData: payload,
          section: edgeFnSection,
          customPrompt: feedback,
          currentContent,
          ...(section === 'jobSummary' ? { feedback } : {}),
        },
      });

      if (error) throw error;

      if (section === 'jobSummary') {
        onChange('jobSummaryFinal', data?.summary || data?.what_we_discovered || formData.jobSummaryFinal);
        setJobSummaryFeedback('');
      } else if (section === 'whatWeFound') {
        onChange('whatWeFoundText', data?.summary || formData.whatWeFoundText);
        setWhatWeFoundFeedback('');
      } else if (section === 'whatWeWillDo') {
        onChange('whatWeWillDoText', data?.summary || formData.whatWeWillDoText);
        setWhatWeWillDoFeedback('');
      }
    } catch (err: any) {
      console.error('[AI Regenerate] Error:', err);
      toast({
        title: 'Regeneration Failed',
        description: err?.message || 'Failed to regenerate section',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingSection(null);
    }
  };

  // Initial state - show generate button
  if (!hasGenerated) {
    return (
      <section className="space-y-5">
        {/* Explanation Card */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-white text-3xl">auto_awesome</span>
          </div>
          <h3 className="text-xl font-bold text-[#1d1d1f] mb-2">AI-Powered Summary</h3>
          <p className="text-[#86868b] text-sm mb-6">
            Generate a complete job summary using AI based on all your inspection data from Sections 1-9.
            The AI will create three sections: Job Summary, What We Found, and What We Will Do.
          </p>

          <button
            onClick={handleGenerateAll}
            disabled={isGenerating}
            className="w-full h-14 bg-gradient-to-r from-purple-500 to-[#007AFF] text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/30 active:scale-[0.98] transition-transform"
          >
            {isGenerating ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Generating All Sections...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">auto_awesome</span>
                Generate AI Summary
              </>
            )}
          </button>
        </div>

        {/* Data preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="text-sm font-semibold text-[#86868b] uppercase tracking-wider mb-3">
            Data for AI Generation
          </h4>
          <div className="space-y-2 text-sm text-[#1d1d1f]">
            <p>• {formData.areas.length} area(s) inspected</p>
            <p>• Property: {formData.dwellingType || 'Not specified'}, {formData.propertyOccupation || 'Not specified'}</p>
            <p>• Subfloor: {formData.subfloorEnabled ? 'Included' : 'Not included'}</p>
            <p>• Demolition: {formData.areas.some((a) => a.demolitionRequired) ? 'Required' : 'Not required'}</p>
            <p>• Equipment: {(formData.commercialDehumidifierQty || 0) + (formData.airMoversQty || 0) + (formData.rcdBoxQty || 0)} items</p>
          </div>
        </div>
      </section>
    );
  }

  // After generation - show editable sections with regenerate
  return (
    <section className="space-y-5">
      {/* Regenerate All Button */}
      <button
        onClick={handleGenerateAll}
        disabled={isGenerating}
        className="w-full h-12 bg-white border border-[#007AFF] text-[#007AFF] font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            Regenerating All...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-lg">refresh</span>
            Regenerate All Sections
          </>
        )}
      </button>

      {/* Job Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#007AFF]">summarize</span>
            Job Summary
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            rows={6}
            value={formData.jobSummaryFinal}
            onChange={(e) => onChange('jobSummaryFinal', e.target.value)}
            className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={jobSummaryFeedback}
              onChange={(e) => setJobSummaryFeedback(e.target.value)}
              placeholder="Feedback (e.g., 'Make it shorter')"
              className="flex-1 h-12 bg-gray-50 text-[#1d1d1f] text-sm rounded-lg border border-gray-200 px-4"
            />
            <button
              onClick={() => handleRegenerateSection('jobSummary')}
              disabled={regeneratingSection === 'jobSummary' || !jobSummaryFeedback}
              className="h-12 px-4 bg-[#007AFF] text-white font-medium rounded-lg flex items-center gap-1 disabled:opacity-50"
              style={{ minWidth: '48px' }}
            >
              {regeneratingSection === 'jobSummary' ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  <span className="hidden sm:inline">Regenerate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* What We Found Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#007AFF]">search</span>
            What We Found
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            rows={6}
            value={formData.whatWeFoundText}
            onChange={(e) => onChange('whatWeFoundText', e.target.value)}
            className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={whatWeFoundFeedback}
              onChange={(e) => setWhatWeFoundFeedback(e.target.value)}
              placeholder="Feedback (e.g., 'Add more detail about bathroom')"
              className="flex-1 h-12 bg-gray-50 text-[#1d1d1f] text-sm rounded-lg border border-gray-200 px-4"
            />
            <button
              onClick={() => handleRegenerateSection('whatWeFound')}
              disabled={regeneratingSection === 'whatWeFound' || !whatWeFoundFeedback}
              className="h-12 px-4 bg-[#007AFF] text-white font-medium rounded-lg flex items-center gap-1 disabled:opacity-50"
              style={{ minWidth: '48px' }}
            >
              {regeneratingSection === 'whatWeFound' ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  <span className="hidden sm:inline">Regenerate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* What We Will Do Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-[#1d1d1f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#007AFF]">handyman</span>
            What We Will Do
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            rows={6}
            value={formData.whatWeWillDoText}
            onChange={(e) => onChange('whatWeWillDoText', e.target.value)}
            className="w-full bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 px-4 py-3 resize-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={whatWeWillDoFeedback}
              onChange={(e) => setWhatWeWillDoFeedback(e.target.value)}
              placeholder="Feedback (e.g., 'Include equipment list')"
              className="flex-1 h-12 bg-gray-50 text-[#1d1d1f] text-sm rounded-lg border border-gray-200 px-4"
            />
            <button
              onClick={() => handleRegenerateSection('whatWeWillDo')}
              disabled={regeneratingSection === 'whatWeWillDo' || !whatWeWillDoFeedback}
              className="h-12 px-4 bg-[#007AFF] text-white font-medium rounded-lg flex items-center gap-1 disabled:opacity-50"
              style={{ minWidth: '48px' }}
            >
              {regeneratingSection === 'whatWeWillDo' ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  <span className="hidden sm:inline">Regenerate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Note about AI */}
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-800 flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 text-lg flex-shrink-0 mt-0.5">info</span>
          <span>AI-generated content. Please review and edit as needed before finalizing the report.</span>
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TechnicianInspectionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const { user } = useAuth();
  const { toast } = useToast();

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
    jobNumber: generateJobNumber(),
    triage: '',
    address: '',
    inspector: '',
    requestedBy: '',
    attentionTo: '',
    inspectionDate: formatDate(new Date()),
    propertyOccupation: '',
    dwellingType: '',
    areas: [createEmptyArea()],
    subfloorEnabled: false,
    subfloorObservations: '',
    subfloorLandscape: '',
    subfloorComments: '',
    subfloorReadings: [],
    subfloorPhotos: [],
    subfloorSanitation: false,
    subfloorRacking: false,
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
    laborCost: 0,
    discountPercent: 0,
    subtotalExGst: 0,
    gstAmount: 0,
    totalIncGst: 0,
    jobSummaryFinal: '',
    regenerationFeedback: '',
    whatWeFoundText: '',
    whatWeWillDoText: '',
    whatYouGetText: '',
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
            issue_description
          `
          )
          .eq('id', leadId)
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
          .single();

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
              .filter((p: any) => p.photo_type === 'area')
              .map((p: any) => ({ id: p.id, name: p.file_name || '', url: p.signed_url, timestamp: p.created_at }));
            const infraredPhoto = areaPhotos.find((p: any) => p.photo_type === 'area' && p.caption === 'infrared');
            const naturalInfraredPhoto = areaPhotos.find((p: any) => p.photo_type === 'area' && p.caption === 'natural_infrared');

            return {
              id: area.id,
              areaName: area.area_name || '',
              mouldDescription: area.mould_description || '',
              commentsForReport: area.comments || '',
              temperature: area.temperature != null ? String(area.temperature) : '',
              humidity: area.humidity != null ? String(area.humidity) : '',
              dewPoint: area.dew_point != null ? String(area.dew_point) : '',
              moistureReadingsEnabled: area.moisture_readings_enabled || false,
              moistureReadings: areaReadings.map((r: any) => ({
                id: r.id,
                title: r.title || '',
                reading: r.moisture_percentage != null ? String(r.moisture_percentage) : '',
                photo: null, // Moisture reading photos loaded separately if needed
              })),
              externalMoisture: area.external_moisture != null ? String(area.external_moisture) : '',
              internalNotes: area.internal_office_notes || '',
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
            subfloorEnabled: ins.subfloor_required || false,
            subfloorObservations: subfloorData?.observations || '',
            subfloorLandscape: subfloorData?.landscape || '',
            subfloorComments: subfloorData?.comments || '',
            subfloorReadings: mappedSubfloorReadings,
            subfloorPhotos: subfloorPhotos.map(mapPhoto),
            subfloorSanitation: subfloorData?.sanitation_required || false,
            subfloorRacking: subfloorData?.racking_required || false,
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
            hepaVac: ins.hepa_vac || false,
            antimicrobial: ins.antimicrobial || false,
            stainRemovingAntimicrobial: ins.stain_removing_antimicrobial || false,
            homeSanitationFogging: ins.home_sanitation_fogging || false,
            dryingEquipmentEnabled: ins.drying_equipment_enabled || false,
            commercialDehumidifierEnabled: ins.commercial_dehumidifier_enabled || false,
            commercialDehumidifierQty: ins.commercial_dehumidifier_qty || 0,
            airMoversEnabled: ins.air_movers_enabled || false,
            airMoversQty: ins.air_movers_qty || 0,
            rcdBoxEnabled: ins.rcd_box_enabled || false,
            rcdBoxQty: ins.rcd_box_qty || 0,
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
            manualPriceOverride: ins.manual_price_override || false,
            manualTotal: ins.manual_total_inc_gst ? Number(ins.manual_total_inc_gst) : 0,
            laborCost: ins.labor_cost_ex_gst ? Number(ins.labor_cost_ex_gst) : 0,
            discountPercent: ins.discount_percent ? Number(ins.discount_percent) : 0,
            subtotalExGst: ins.subtotal_ex_gst ? Number(ins.subtotal_ex_gst) : 0,
            gstAmount: ins.gst_amount ? Number(ins.gst_amount) : 0,
            totalIncGst: ins.total_inc_gst ? Number(ins.total_inc_gst) : 0,
            jobSummaryFinal: ins.ai_summary_text || '',
            whatWeFoundText: ins.what_we_found_text || '',
            whatWeWillDoText: ins.what_we_will_do_text || '',
            whatYouGetText: ins.what_you_get_text || '',
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
  const handlePhotoCapture = async (type: string, areaId?: string, readingId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = type !== 'single' && !readingId;

    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[];
      if (files.length === 0) return;

      // Require saved inspection before uploading photos
      if (!currentInspectionId) {
        toast({
          title: 'Save First',
          description: 'Save the inspection before uploading photos',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Uploading...',
        description: `Uploading ${files.length} photo(s)`,
      });

      try {
        // Determine photo_type and caption for metadata
        let photoType: 'area' | 'subfloor' | 'general' | 'outdoor' = 'general';
        let caption: string | undefined;
        if (areaId) {
          photoType = 'area';
          if (type === 'infrared') caption = 'infrared';
          else if (type === 'naturalInfrared') caption = 'natural_infrared';
        } else if (type === 'subfloor') {
          photoType = 'subfloor';
        } else if (['frontDoor', 'frontHouse', 'mailbox', 'street', 'direction'].includes(type)) {
          photoType = 'outdoor';
          const captionMap: Record<string, string> = {
            frontDoor: 'front_door', frontHouse: 'front_house',
            mailbox: 'mailbox', street: 'street', direction: 'direction',
          };
          caption = captionMap[type];
        }

        // Upload each file
        // NOTE: Do NOT pass moisture_reading_id here — the reading may not be saved to DB yet.
        // Photos are linked to moisture readings during handleSave() after readings are persisted.
        const newPhotos: Photo[] = [];
        for (const file of files) {
          const result = await uploadInspectionPhoto(file, {
            inspection_id: currentInspectionId,
            area_id: areaId,
            photo_type: photoType,
            caption: readingId ? 'moisture' : caption,
          });
          newPhotos.push({
            id: result.photo_id,
            name: file.name,
            url: result.signed_url,
            timestamp: new Date().toISOString(),
          });
        }

        // Update state based on photo type
        if (areaId && readingId) {
          handleMoistureReadingChange(areaId, readingId, 'photo', newPhotos[0]);
        } else if (areaId && type === 'roomView') {
          const area = formData.areas.find((a) => a.id === areaId);
          const currentPhotos = area?.roomViewPhotos || [];
          if (currentPhotos.length + newPhotos.length > 4) {
            toast({ title: 'Limit reached', description: 'Maximum 4 photos', variant: 'destructive' });
            return;
          }
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

        toast({ title: 'Photos added', description: `${newPhotos.length} photo(s) uploaded` });
      } catch (err: any) {
        console.error('[PhotoCapture] Upload error:', err);
        toast({
          title: 'Upload Failed',
          description: err?.message || 'Failed to upload photo(s)',
          variant: 'destructive',
        });
      }
    };

    input.click();
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
    navigate(-1);
  };

  // Save handler - multi-table upsert to Supabase
  const handleSave = async () => {
    if (!leadId || !user) return;
    setIsSaving(true);

    try {
      // 1. Upsert inspections row
      const inspectionRow: Record<string, any> = {
        lead_id: leadId,
        inspector_id: user.id,
        inspector_name: formData.inspector,
        job_number: formData.jobNumber,
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
        waste_disposal_required: formData.wasteDisposalEnabled,
        waste_disposal_amount: formData.wasteDisposalAmount || null,
        hepa_vac: formData.hepaVac,
        antimicrobial: formData.antimicrobial,
        stain_removing_antimicrobial: formData.stainRemovingAntimicrobial,
        home_sanitation_fogging: formData.homeSanitationFogging,
        drying_equipment_enabled: formData.dryingEquipmentEnabled,
        commercial_dehumidifier_enabled: formData.commercialDehumidifierEnabled,
        commercial_dehumidifier_qty: formData.commercialDehumidifierQty || 0,
        air_movers_enabled: formData.airMoversEnabled,
        air_movers_qty: formData.airMoversQty || 0,
        rcd_box_enabled: formData.rcdBoxEnabled,
        rcd_box_qty: formData.rcdBoxQty || 0,
        recommended_dehumidifier: formData.recommendDehumidifier ? (formData.dehumidifierSize || null) : null,
        cause_of_mould: formData.causeOfMould || null,
        additional_info_technician: formData.additionalInfoForTech || null,
        additional_equipment_comments: formData.additionalEquipmentComments || null,
        parking_option: formData.parkingOptions || null,
        subfloor_required: formData.subfloorEnabled,
        no_demolition_hours: formData.noDemolitionHours || 0,
        demolition_hours: formData.demolitionHours || 0,
        subfloor_hours: formData.subfloorHours || 0,
        equipment_cost_ex_gst: formData.equipmentCost || 0,
        manual_price_override: formData.manualPriceOverride,
        manual_total_inc_gst: formData.manualTotal || 0,
        labor_cost_ex_gst: formData.laborCost || 0,
        discount_percent: formData.discountPercent || 0,
        subtotal_ex_gst: formData.subtotalExGst || 0,
        gst_amount: formData.gstAmount || 0,
        total_inc_gst: formData.totalIncGst || 0,
        ai_summary_text: formData.jobSummaryFinal || null,
        what_we_found_text: formData.whatWeFoundText || null,
        what_we_will_do_text: formData.whatWeWillDoText || null,
        what_you_get_text: formData.whatYouGetText || null,
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
          .select('id')
          .single();
        if (insertError) throw insertError;
        inspectionId = insertData.id;
        setCurrentInspectionId(inspectionId);
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
          mould_description: area.mouldDescription || null,
          comments: area.commentsForReport || null,
          temperature: area.temperature ? parseFloat(area.temperature) : null,
          humidity: area.humidity ? parseFloat(area.humidity) : null,
          dew_point: area.dewPoint ? parseFloat(area.dewPoint) : null,
          moisture_readings_enabled: area.moistureReadingsEnabled,
          external_moisture: area.externalMoisture ? parseFloat(area.externalMoisture) : null,
          internal_office_notes: area.internalNotes || null,
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

        // 3. Upsert moisture_readings for this area
        if (area.moistureReadingsEnabled && area.moistureReadings.length > 0) {
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

            // Link photo to this moisture reading (photo was uploaded without moisture_reading_id)
            if (reading.photo) {
              await supabase
                .from('photos')
                .update({ moisture_reading_id: reading.id })
                .eq('id', reading.photo.id);
            }
          }
        }
      }

      // 4. Upsert subfloor_data
      if (formData.subfloorEnabled) {
        const subfloorRow = {
          inspection_id: inspectionId,
          observations: formData.subfloorObservations || null,
          comments: formData.subfloorComments || null,
          landscape: formData.subfloorLandscape || null,
          sanitation_required: formData.subfloorSanitation,
          racking_required: formData.subfloorRacking,
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
          await supabase.from('subfloor_data').update(subfloorRow).eq('id', subfloorId);
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

      setHasUnsavedChanges(false);
      toast({
        title: 'Saved',
        description: `Section ${currentSection} saved successfully`,
      });
    } catch (err: any) {
      console.error('[InspectionForm] Save error:', err);
      toast({
        title: 'Save Failed',
        description: err?.message || 'Failed to save inspection data',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation handlers (auto-save on section change)
  const handlePrevious = () => {
    if (hasUnsavedChanges) handleSave();
    setCurrentSection((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    if (currentSection === TOTAL_SECTIONS) {
      handleSave();
      toast({
        title: 'Form Complete',
        description: 'Inspection form has been completed!',
      });
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
    <div className="min-h-screen bg-[#f5f7f8] pb-[180px]">
      <Header
        onBack={handleBack}
        onSave={handleSave}
        currentSection={currentSection}
        totalSections={TOTAL_SECTIONS}
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
        {currentSection === 10 && <Section10AISummary {...sectionProps} />}
      </main>

      <Footer
        onSave={handleSave}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isSaving={isSaving}
        showPrevious={currentSection > 1}
        isLastSection={currentSection === TOTAL_SECTIONS}
      />

      <TechnicianBottomNav />
    </div>
  );
}
