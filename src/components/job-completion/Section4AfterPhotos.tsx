'use client';

import { Camera, ImageIcon, Plus } from 'lucide-react';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

// Slots displayed per area before the "add more" button appears
const INITIAL_PHOTO_SLOTS = 4;

interface PhotoSlotGridProps {
  label: string;
  description?: string;
  isReadOnly: boolean;
}

function PhotoSlotGrid({ label, description, isReadOnly }: PhotoSlotGridProps) {
  return (
    <div>
      <p className="text-sm font-medium text-[#1d1d1f] mb-1">{label}</p>
      {description && (
        <p className="text-xs text-[#86868b] mb-2">{description}</p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: INITIAL_PHOTO_SLOTS }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center gap-1"
            aria-label={`After photo slot ${i + 1} for ${label}`}
          >
            <ImageIcon className="w-6 h-6 text-gray-300" aria-hidden="true" />
            <span className="text-[11px] text-gray-300">Photo {i + 1}</span>
          </div>
        ))}

        {/* Add photo button — opens camera or file picker when wired */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => {
              // NOTE: integration-specialist — wire to uploadJobCompletionPhoto()
              // with photo_category = 'after' and job_completion_id
              console.log('After photo upload triggered — integration-specialist to wire camera/file input');
            }}
            aria-label={`Add after photo for ${label}`}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 min-h-[48px] hover:border-[#007AFF] hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
          >
            <Plus className="w-5 h-5 text-gray-400" aria-hidden="true" />
            <span className="text-[11px] text-gray-400">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Section4AfterPhotos — After-remediation photo capture section.
 *
 * Technician photographs each treated area after remediation is complete.
 * When the demolition toggle is on, an additional demolition photos grid
 * appears below the standard after-photo grid.
 *
 * @param formData - Full job completion form state (demolitionWorks drives conditional section)
 * @param onChange - Field update callback (demolitionWorks toggle)
 * @param isReadOnly - When true, hides all upload buttons
 *
 * @remarks
 * Integration notes:
 * - "Take Photo" / "Add" buttons should open a hidden <input type="file" accept="image/*" capture="environment">
 * - Wire to uploadJobCompletionPhoto(file, jobCompletionId, 'after') from photoUpload.ts
 * - Demolition photos use photo_category = 'demolition'
 * - Photos should be stored in IndexedDB offline queue if no connection
 */
export function Section4AfterPhotos({ formData, onChange, isReadOnly = false }: SectionProps) {
  const hasAreas = formData.areasTreated.length > 0;

  return (
    <section aria-labelledby="after-photos-heading" className="space-y-5">
      <div>
        <h2
          id="after-photos-heading"
          className="text-[17px] font-semibold text-[#1d1d1f]"
        >
          After Photos
        </h2>
        <p className="text-sm text-[#86868b] mt-1">
          Photograph each area after remediation is complete
        </p>
      </div>

      {/* Demolition Works toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl">
        <label
          htmlFor="demolition-works"
          className="text-[15px] font-medium text-[#1d1d1f] cursor-pointer"
        >
          Demolition Works
        </label>
        <button
          id="demolition-works"
          type="button"
          role="switch"
          aria-checked={formData.demolitionWorks}
          onClick={() => onChange('demolitionWorks', !formData.demolitionWorks)}
          disabled={isReadOnly}
          className={`relative w-[51px] h-[31px] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 disabled:opacity-50 ${
            formData.demolitionWorks ? 'bg-[#34C759]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform ${
              formData.demolitionWorks ? 'translate-x-[20px]' : ''
            }`}
            aria-hidden="true"
          />
          <span className="sr-only">{formData.demolitionWorks ? 'On' : 'Off'}</span>
        </button>
      </div>

      {/* After photos — one grid per treated area */}
      <div className="bg-white rounded-xl p-5 space-y-6">
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => {
              // NOTE: integration-specialist — wire to camera input for primary capture button
              console.log('Primary camera capture triggered — integration-specialist to wire file input');
            }}
            className="flex items-center justify-center gap-2 w-full h-12 bg-[#007AFF] text-white rounded-lg font-medium text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 active:opacity-90"
            aria-label="Take a photo"
          >
            <Camera className="w-5 h-5" aria-hidden="true" />
            Take Photo
          </button>
        )}

        {hasAreas ? (
          formData.areasTreated.map((area) => (
            <PhotoSlotGrid
              key={area}
              label={area}
              description="After remediation"
              isReadOnly={isReadOnly}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Camera className="w-7 h-7 text-gray-300" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-medium text-[#1d1d1f]">No areas available</p>
              <p className="text-sm text-[#86868b] mt-0.5">
                Areas from the inspection will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Demolition photos — conditional on toggle */}
      {formData.demolitionWorks && (
        <div className="bg-white rounded-xl p-5">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Demolition Photos</h3>
          <PhotoSlotGrid
            label="Demolition works"
            description="Document material removal and cavity exposure"
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* TODO(integration-specialist): Wire hidden <input type="file" accept="image/*" capture="environment">
          for both after-photo and demolition-photo slots.
          Use uploadJobCompletionPhoto() from photoUpload.ts with appropriate photo_category. */}
    </section>
  );
}
