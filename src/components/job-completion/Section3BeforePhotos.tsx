'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ImageIcon, Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
  leadId: string;
  jobCompletionId: string | null;
}

/** Photo row enriched with a short-lived signed URL for display */
interface PhotoWithUrl {
  id: string;
  storage_path: string;
  caption: string | null;
  area_id: string | null;
  photo_type: string | null;
  job_completion_id: string | null;
  signed_url: string;
}

const MAX_SELECTED_BEFORE_PHOTOS = 10;
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Fetch all photos from the inspection linked to this lead, enriched with
 * signed URLs so the <img> tags can actually render them.
 */
async function fetchInspectionPhotos(leadId: string): Promise<PhotoWithUrl[]> {
  // Step 1: find the most recent inspection for this lead
  const { data: inspection, error: inspError } = await supabase
    .from('inspections')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inspError) throw inspError;
  if (!inspection) return [];

  // Step 2: fetch ALL photos for that inspection (both unassigned and
  // already-selected-for-this-job-completion)
  const { data: rows, error: photosError } = await supabase
    .from('photos')
    .select('id, storage_path, caption, area_id, photo_type, job_completion_id')
    .eq('inspection_id', inspection.id)
    .order('order_index', { ascending: true });

  if (photosError) throw photosError;
  if (!rows || rows.length === 0) return [];

  // Step 3: generate a signed URL for each one (parallel)
  const withUrls = await Promise.all(
    rows.map(async (row) => {
      try {
        const { data } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        return { ...row, signed_url: data?.signedUrl ?? '' } as PhotoWithUrl;
      } catch {
        return { ...row, signed_url: '' } as PhotoWithUrl;
      }
    })
  );

  // Return only the photos we could actually sign — a broken one is useless
  return withUrls.filter((p) => p.signed_url);
}

/**
 * Section3BeforePhotos — pre-populates "before" photos from the linked
 * inspection. Technicians pick up to 10 to include in the job report.
 *
 * Selection is persisted in the photos table: a selected photo has
 * `job_completion_id` set to this job_completion's id and
 * `photo_category = 'before'`. Deselecting clears both fields (photo
 * stays linked to the inspection via `inspection_id`).
 */
export function Section3BeforePhotos({
  formData,
  isReadOnly = false,
  leadId,
  jobCompletionId,
}: SectionProps) {
  const {
    data: photos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inspection-photos', leadId],
    queryFn: () => fetchInspectionPhotos(leadId),
    enabled: !!leadId,
    staleTime: 5 * 60_000,
  });

  // Local selection state mirrors the DB. Starts from whichever photos
  // already have job_completion_id == this jobCompletionId.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPersisting, setIsPersisting] = useState(false);

  // Seed the selection set once photos arrive
  useEffect(() => {
    if (!jobCompletionId || photos.length === 0) return;
    const preSelected = new Set(
      photos.filter((p) => p.job_completion_id === jobCompletionId).map((p) => p.id)
    );
    setSelectedIds(preSelected);
  }, [photos, jobCompletionId]);

  const selectedCount = selectedIds.size;

  const togglePhoto = async (photoId: string) => {
    if (isReadOnly || isPersisting || !jobCompletionId) return;

    const isCurrentlySelected = selectedIds.has(photoId);
    const isAtLimit = selectedCount >= MAX_SELECTED_BEFORE_PHOTOS;

    if (!isCurrentlySelected && isAtLimit) {
      toast.error(`You can select at most ${MAX_SELECTED_BEFORE_PHOTOS} before photos`);
      return;
    }

    // Optimistic update
    const next = new Set(selectedIds);
    if (isCurrentlySelected) {
      next.delete(photoId);
    } else {
      next.add(photoId);
    }
    setSelectedIds(next);

    setIsPersisting(true);
    try {
      // Persist the selection to the photos table
      const { error: updateError } = await supabase
        .from('photos')
        .update(
          isCurrentlySelected
            ? { job_completion_id: null, photo_category: null }
            : { job_completion_id: jobCompletionId, photo_category: 'before' }
        )
        .eq('id', photoId);

      if (updateError) throw updateError;
    } catch (err) {
      // Revert on failure
      console.error('[Section3BeforePhotos] Failed to update photo selection:', err);
      toast.error('Could not save photo selection');
      setSelectedIds(selectedIds); // revert
    } finally {
      setIsPersisting(false);
    }
  };

  // Group photos by area for cleaner display
  const photosByArea = useMemo(() => {
    const grouped: Record<string, PhotoWithUrl[]> = {};
    for (const photo of photos) {
      const key = photo.area_id || 'general';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(photo);
    }
    return grouped;
  }, [photos]);

  return (
    <section aria-labelledby="before-photos-heading" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="before-photos-heading"
            className="text-[17px] font-semibold text-[#1d1d1f]"
          >
            Before Photos
          </h2>
          <p className="text-sm text-[#86868b] mt-1">
            Pick up to {MAX_SELECTED_BEFORE_PHOTOS} photos from the inspection to include in the job report.
          </p>
        </div>
        {photos.length > 0 && (
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-bold text-[#007AFF]">{selectedCount}</div>
            <div className="text-xs text-[#86868b]">of {MAX_SELECTED_BEFORE_PHOTOS}</div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
          <p className="text-sm text-[#86868b]">Loading inspection photos...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Could not load inspection photos</p>
          <p className="mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-red-900 underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty — no inspection photos */}
      {!isLoading && !error && photos.length === 0 && (
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-gray-300" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-medium text-[#1d1d1f]">No inspection photos found</p>
            <p className="text-sm text-[#86868b] mt-0.5">
              No photos were uploaded during the inspection for this lead.
            </p>
          </div>
        </div>
      )}

      {/* Photo grid grouped by area */}
      {!isLoading && !error && photos.length > 0 && (
        <div className="space-y-5">
          {Object.entries(photosByArea).map(([areaKey, areaPhotos]) => (
            <div key={areaKey} className="bg-white rounded-xl p-4">
              <p className="text-sm font-semibold text-[#1d1d1f] mb-3">
                {areaKey === 'general' ? 'General / Outdoor' : `Area photos`}
                <span className="ml-2 text-xs font-normal text-[#86868b]">
                  ({areaPhotos.length} {areaPhotos.length === 1 ? 'photo' : 'photos'})
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {areaPhotos.map((photo) => {
                  const isSelected = selectedIds.has(photo.id);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => togglePhoto(photo.id)}
                      disabled={isReadOnly || isPersisting}
                      aria-pressed={isSelected}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} photo${photo.caption ? ` ${photo.caption}` : ''}`}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-[#007AFF] ring-2 ring-[#007AFF]/30'
                          : 'border-gray-200 hover:border-gray-300'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <img
                        src={photo.signed_url}
                        alt={photo.caption ?? 'Inspection photo'}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#007AFF] flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 text-white" aria-hidden="true" />
                        </div>
                      )}
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                          <p className="text-[10px] text-white truncate">{photo.caption}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info footer — unused onChange prop silenced by referencing formData */}
      {formData.areasTreated.length === 0 && photos.length === 0 && !isLoading && (
        <p className="text-xs text-[#86868b] italic text-center">
          No areas or photos linked yet.
        </p>
      )}
    </section>
  );
}
