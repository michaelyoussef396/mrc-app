'use client';

import { ImageIcon } from 'lucide-react';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

// Number of placeholder slots to show per area — mirrors the inspection form
const PHOTO_SLOTS_PER_AREA = 4;

interface PhotoPlaceholderGridProps {
  areaName: string;
}

function PhotoPlaceholderGrid({ areaName }: PhotoPlaceholderGridProps) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-sm font-medium text-[#86868b] mb-2 px-1">{areaName}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: PHOTO_SLOTS_PER_AREA }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center gap-1"
            aria-label={`Photo slot ${i + 1} for ${areaName}`}
          >
            <ImageIcon className="w-6 h-6 text-gray-300" aria-hidden="true" />
            <span className="text-[11px] text-gray-300">Photo {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Section3BeforePhotos — Placeholder for before-remediation photo display.
 *
 * Before photos are pre-populated from the inspection record and require
 * signed URL generation from Supabase Storage. This component renders the
 * structural layout (per-area grids) so the integration-specialist can wire
 * in the real photo loading logic using signed URLs.
 *
 * @param formData - Full job completion form state (uses areasTreated for section headers)
 * @param onChange - Field update callback (unused in this section — photos managed separately)
 * @param isReadOnly - When true, prevents any add-photo actions
 *
 * @remarks
 * Integration notes:
 * - Load photos from `photos` table WHERE inspection_id = X AND photo_category = 'before'
 * - Generate signed URLs via supabase.storage.from('inspection-photos').createSignedUrl()
 * - Replace placeholder grids with actual <img> thumbnails
 * - Tap-to-enlarge handled via a lightbox/modal at the parent form level
 */
export function Section3BeforePhotos({ formData }: SectionProps) {
  const hasAreas = formData.areasTreated.length > 0;

  return (
    <section aria-labelledby="before-photos-heading" className="space-y-5">
      <div>
        <h2
          id="before-photos-heading"
          className="text-[17px] font-semibold text-[#1d1d1f]"
        >
          Before Photos
        </h2>
        <p className="text-sm text-[#86868b] mt-1">
          Pre-populated from the inspection record
        </p>
      </div>

      {/* Online-required notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          Before photos will be pre-populated from the inspection once this form connects to the server.
          New before photos can be added below if taken before work commenced.
        </p>
      </div>

      {/* Per-area photo grids */}
      <div className="bg-white rounded-xl p-5">
        {hasAreas ? (
          formData.areasTreated.map((area) => (
            <PhotoPlaceholderGrid key={area} areaName={area} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-7 h-7 text-gray-300" aria-hidden="true" />
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

      {/* TODO(integration-specialist): Wire signed URL loading from Supabase Storage
          photos table WHERE inspection_id = lead.inspection_id AND photo_category = 'before' */}
    </section>
  );
}
