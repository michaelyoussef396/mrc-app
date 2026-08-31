'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ImageIcon, Loader2, Plus, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type { JobCompletionFormData } from '@/types/jobCompletion';
import { recordPhotoHistory } from '@/lib/utils/photoHistory';
import { deleteInspectionPhoto, uploadMultiplePhotos } from '@/lib/utils/photoUpload';
import { derivePhotoCaption } from '@/lib/utils/photoCaption';
import {
  ONSITE_GROUP_KEY,
  groupPhotos,
  isLikelyOnsiteUpload,
  type PhotoWithUrl,
} from './beforePhotoGrouping';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
  leadId: string;
  jobCompletionId: string | null;
}

interface BeforePhotoSet {
  inspectionId: string | null;
  photos: PhotoWithUrl[];
}

/** Row shape of the photos this grid reads, before signed URLs are attached. */
interface PhotoRow {
  id: string;
  inspection_id: string | null;
  storage_path: string;
  caption: string | null;
  area_id: string | null;
  photo_type: string | null;
  photo_category: string | null;
  job_completion_id: string | null;
}

const MAX_SELECTED_BEFORE_PHOTOS = 10;
const SIGNED_URL_TTL_SECONDS = 3600;

const PHOTO_COLUMNS =
  'id, inspection_id, storage_path, caption, area_id, photo_type, photo_category, job_completion_id';

/** Stable identity so an empty result does not re-trigger memos every render. */
const NO_PHOTOS: readonly PhotoWithUrl[] = Object.freeze([]);

/**
 * Everything this grid can show: the lead's inspection photos, plus the before
 * photos already attached to this job completion.
 *
 * The second half is what makes a lead with no inspection work at all. Those
 * photos carry `inspection_id = null`, so an inspection-scoped read cannot see
 * them — querying by inspection alone would accept an upload and then lose it
 * on the very next refetch. The inspection id comes back too, because an upload
 * needs it and it is already resolved here.
 */
async function fetchBeforePhotos(
  leadId: string,
  jobCompletionId: string | null
): Promise<BeforePhotoSet> {
  const { data: inspection, error: inspError } = await supabase
    .from('inspections')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inspError) throw inspError;

  const inspectionId = inspection?.id ?? null;

  const [inspectionRows, jobRows, areaNames] = await Promise.all([
    fetchInspectionPhotoRows(inspectionId),
    fetchJobCompletionPhotoRows(jobCompletionId),
    fetchAreaNames(inspectionId),
  ]);

  // A picked inspection photo satisfies both queries — keep the first sighting.
  const byId = new Map<string, PhotoRow>();
  for (const row of [...inspectionRows, ...jobRows]) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  if (byId.size === 0) return { inspectionId, photos: [] };

  const withUrls = await Promise.all(
    [...byId.values()].map((row) => toPhotoWithUrl(row, areaNames))
  );

  return { inspectionId, photos: withUrls.filter((p) => p.signed_url) };
}

async function fetchInspectionPhotoRows(inspectionId: string | null): Promise<PhotoRow[]> {
  if (!inspectionId) return [];

  const { data, error } = await supabase
    .from('photos')
    .select(PHOTO_COLUMNS)
    .eq('inspection_id', inspectionId)
    .or('photo_category.is.null,photo_category.eq.before')
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PhotoRow[];
}

async function fetchJobCompletionPhotoRows(jobCompletionId: string | null): Promise<PhotoRow[]> {
  if (!jobCompletionId) return [];

  const { data, error } = await supabase
    .from('photos')
    .select(PHOTO_COLUMNS)
    .eq('job_completion_id', jobCompletionId)
    .eq('photo_category', 'before')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PhotoRow[];
}

async function fetchAreaNames(inspectionId: string | null): Promise<Map<string, string>> {
  const areaNames = new Map<string, string>();
  if (!inspectionId) return areaNames;

  const { data } = await supabase
    .from('inspection_areas')
    .select('id, area_name')
    .eq('inspection_id', inspectionId);

  for (const area of data ?? []) {
    areaNames.set(area.id, area.area_name);
  }
  return areaNames;
}

async function toPhotoWithUrl(
  row: PhotoRow,
  areaNames: Map<string, string>
): Promise<PhotoWithUrl> {
  let signedUrl = '';
  try {
    const { data } = await supabase.storage
      .from('inspection-photos')
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
    signedUrl = data?.signedUrl ?? '';
  } catch {
    signedUrl = '';
  }

  return {
    id: row.id,
    inspection_id: row.inspection_id,
    storage_path: row.storage_path,
    caption: row.caption,
    area_id: row.area_id,
    area_name: row.area_id ? (areaNames.get(row.area_id) ?? null) : null,
    photo_type: row.photo_type,
    photo_category: row.photo_category,
    job_completion_id: row.job_completion_id,
    signed_url: signedUrl,
  };
}

/**
 * Section3BeforePhotos — pre-populates "before" photos from the linked
 * inspection, and lets the technician add photos taken at job time. Up to 10
 * in total go into the job report. A lead with no inspection is a supported
 * case: uploading is then the only way a before photo reaches the report.
 *
 * Two kinds of photo live in this grid and they are removed differently.
 * A picked inspection photo is selected by setting `job_completion_id` and
 * `photo_category = 'before'`, and deselecting clears both (the photo stays
 * with the inspection via `inspection_id`). A photo uploaded here exists only
 * because of this job, so it is deleted rather than deselected — see
 * handleDeleteOnsite.
 */
export function Section3BeforePhotos({
  formData,
  isReadOnly = false,
  leadId,
  jobCompletionId,
}: SectionProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inspection-photos', leadId, jobCompletionId],
    queryFn: () => fetchBeforePhotos(leadId, jobCompletionId),
    enabled: !!leadId,
    staleTime: 5 * 60_000,
  });

  const photos = data?.photos ?? (NO_PHOTOS as PhotoWithUrl[]);
  const inspectionId = data?.inspectionId ?? null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPersisting, setIsPersisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ids of photos uploaded during this mount. Needed in addition to the
  // row-derived signal below because this component unmounts on every section
  // change (JobCompletionForm renders one section at a time), so session state
  // alone would lose track of an upload as soon as the tech visits Section 4.
  const [sessionUploadedIds, setSessionUploadedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!jobCompletionId || photos.length === 0) return;
    const preSelected = new Set(
      photos.filter((p) => p.job_completion_id === jobCompletionId).map((p) => p.id)
    );
    setSelectedIds(preSelected);
  }, [photos, jobCompletionId]);

  const onsiteIds = useMemo(() => {
    const ids = new Set(sessionUploadedIds);
    for (const photo of photos) {
      if (isLikelyOnsiteUpload(photo, jobCompletionId)) ids.add(photo.id);
    }
    return ids;
  }, [photos, jobCompletionId, sessionUploadedIds]);

  const selectedCount = selectedIds.size;

  const togglePhoto = async (photoId: string) => {
    if (isReadOnly || isPersisting || isUploading || !jobCompletionId) return;

    const isCurrentlySelected = selectedIds.has(photoId);
    const isAtLimit = selectedCount >= MAX_SELECTED_BEFORE_PHOTOS;

    if (!isCurrentlySelected && isAtLimit) {
      toast.error(`You can select at most ${MAX_SELECTED_BEFORE_PHOTOS} before photos`);
      return;
    }

    const next = new Set(selectedIds);
    if (isCurrentlySelected) {
      next.delete(photoId);
    } else {
      next.add(photoId);
    }
    setSelectedIds(next);

    setIsPersisting(true);
    try {
      const photo = photos.find((p) => p.id === photoId);
      // Stage 4.3: guard against resurrecting soft-deleted rows
      const { error: updateError } = await supabase
        .from('photos')
        .update(
          isCurrentlySelected
            ? { job_completion_id: null, photo_category: null }
            : { job_completion_id: jobCompletionId, photo_category: 'before' }
        )
        .eq('id', photoId)
        .is('deleted_at', null);

      if (updateError) throw updateError;

      // Stage 4.2: domain-level history. Non-blocking — never throws.
      if (photo) {
        await recordPhotoHistory({
          photo_id: photoId,
          inspection_id: photo.inspection_id,
          action: 'category_changed',
          before: {
            photo_category: isCurrentlySelected ? 'before' : null,
            job_completion_id: isCurrentlySelected ? jobCompletionId : null,
          },
          after: isCurrentlySelected
            ? { photo_category: null, job_completion_id: null }
            : { photo_category: 'before', job_completion_id: jobCompletionId },
        });
      }
    } catch (err) {
      console.error('[Section3BeforePhotos] Failed to update photo selection:', err);
      toast.error('Could not save photo selection');
      // Undo just this photo against whatever the current state is. Replaying a
      // Set captured before the await would discard any selection made since.
      setSelectedIds((current) => {
        const rolledBack = new Set(current);
        if (isCurrentlySelected) rolledBack.add(photoId);
        else rolledBack.delete(photoId);
        return rolledBack;
      });
    } finally {
      setIsPersisting(false);
    }
  };

  // Deliberately not gated on inspectionId. A lead can reach job completion
  // without ever having an inspection, and on those jobs this upload is the
  // only way any photo reaches the report. The photo hangs off the job
  // completion instead — photos.inspection_id is nullable and the technician
  // RLS policies carry a job_completion_id-only branch for exactly that row.
  const canUpload = !isReadOnly && !!jobCompletionId && !isUploading && !isPersisting;

  /** Why the upload button is disabled, or null when it is live. */
  const uploadBlockedReason = (() => {
    if (isReadOnly) return 'This job is submitted — photos can no longer be changed.';
    if (isUploading) return null;
    if (isPersisting) return 'Saving your last change...';
    if (!jobCompletionId) return 'Preparing this job — you can add photos in a moment.';
    return null;
  })();

  function triggerUpload() {
    if (!canUpload) return;
    if (selectedCount >= MAX_SELECTED_BEFORE_PHOTOS) {
      toast.error(`You can include at most ${MAX_SELECTED_BEFORE_PHOTOS} before photos`);
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0 || !jobCompletionId) return;

    if (!navigator.onLine) {
      toast.error(
        files.length === 1
          ? "You're offline — the photo was not uploaded and is not kept on this device."
          : `You're offline — ${files.length} photos were not uploaded and are not kept on this device.`
      );
      return;
    }

    // An uploaded photo is selected the moment it lands, so it spends the same
    // budget as a picked one. Without this the cap is decorative and the
    // before/after parity check at submit inflates out of the tech's control.
    const remaining = MAX_SELECTED_BEFORE_PHOTOS - selectedCount;
    if (remaining <= 0) {
      toast.error(`Limit reached — ${MAX_SELECTED_BEFORE_PHOTOS} before photos allowed`);
      return;
    }

    const filesToUpload = files.slice(0, remaining);
    if (filesToUpload.length < files.length) {
      toast.info(
        `Only uploading ${filesToUpload.length} of ${files.length} — limit is ${MAX_SELECTED_BEFORE_PHOTOS}`
      );
    }

    setIsUploading(true);
    try {
      const results = await uploadMultiplePhotos(filesToUpload, {
        inspection_id: inspectionId,
        job_completion_id: jobCompletionId,
        photo_category: 'before',
        photo_type: 'general',
        caption: derivePhotoCaption('before'),
      });
      setSessionUploadedIds((prev) => {
        const next = new Set(prev);
        for (const result of results) next.add(result.photo_id);
        return next;
      });
      await refetch();
      if (results.length < filesToUpload.length) {
        toast.error(
          `${results.length} of ${filesToUpload.length} photos added — the rest failed and are not kept on this device.`
        );
      } else {
        toast.success(`${results.length} photo${results.length === 1 ? '' : 's'} added`);
      }
    } catch (err) {
      console.error('[Section3BeforePhotos] Upload failed:', err);
      toast.error(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * On-site uploads are deleted, never deselected. Deselecting clears
   * job_completion_id and photo_category, which for a photo that exists only
   * because of this job would drop an unreferenced row into the inspection's
   * general pool — where the admin photo picker can claim it and the inspection
   * report can pick it up as a cover image.
   */
  async function handleDeleteOnsite(photoId: string) {
    if (isReadOnly || deletingId) return;
    setDeletingId(photoId);
    try {
      await deleteInspectionPhoto(photoId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      setSessionUploadedIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      await refetch();
      toast.success('Photo deleted');
    } catch (err) {
      console.error('[Section3BeforePhotos] Delete failed:', err);
      toast.error('Could not delete photo');
    } finally {
      setDeletingId(null);
    }
  }

  const photoGroups = useMemo(() => groupPhotos(photos, onsiteIds), [photos, onsiteIds]);

  return (
    <section aria-labelledby="before-photos-heading" className="space-y-5">
      {/* No `capture` attribute: iOS then offers the photo library as well as
          the camera, which is what makes a bulk selection possible. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="before-photos-heading"
            className="text-[17px] font-semibold text-[#1d1d1f]"
          >
            Before Photos
          </h2>
          <p className="text-sm text-[#86868b] mt-1">
            Pick up to {MAX_SELECTED_BEFORE_PHOTOS} photos from the inspection, or add ones you took
            on site, to include in the job report.
          </p>
        </div>
        {photos.length > 0 && (
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-bold text-[#007AFF]">{selectedCount}</div>
            <div className="text-xs text-[#86868b]">of {MAX_SELECTED_BEFORE_PHOTOS}</div>
          </div>
        )}
      </div>

      {!isLoading && !error && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={triggerUpload}
            disabled={!canUpload}
            aria-describedby={uploadBlockedReason ? 'before-photos-upload-blocked' : undefined}
            className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-[15px] font-medium text-[#007AFF] hover:border-[#007AFF] hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="w-5 h-5" aria-hidden="true" />
            )}
            {isUploading ? 'Uploading...' : 'Add Before Photos'}
          </button>
          {/* A disabled control must never be silent — say why, or the tech is
              left tapping a dead button with no way to know what to do. */}
          {uploadBlockedReason && (
            <p
              id="before-photos-upload-blocked"
              role="status"
              className="text-xs text-[#86868b] text-center"
            >
              {uploadBlockedReason}
            </p>
          )}
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
          <p className="text-sm text-[#86868b]">Loading inspection photos...</p>
        </div>
      )}

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

      {!isLoading && !error && photos.length === 0 && (
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-gray-300" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-medium text-[#1d1d1f]">
              {inspectionId ? 'No inspection photos found' : 'No before photos yet'}
            </p>
            <p className="text-sm text-[#86868b] mt-0.5">
              {inspectionId
                ? 'No photos were uploaded during the inspection for this lead. Use Add Before Photos above to take them now.'
                : 'This job has no inspection to draw photos from. Use Add Before Photos above to take them now.'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && photos.length > 0 && (
        <div className="space-y-5">
          {photoGroups.map((group) => (
            <div key={group.key} className="bg-white rounded-xl p-4">
              <p className="text-sm font-semibold text-[#1d1d1f] mb-3">
                {group.label}
                <span className="ml-2 text-xs font-normal text-[#86868b]">
                  ({group.photos.length} {group.photos.length === 1 ? 'photo' : 'photos'})
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {group.photos.map((photo) => {
                  const isSelected = selectedIds.has(photo.id);

                  if (group.key === ONSITE_GROUP_KEY) {
                    return (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#007AFF] ring-2 ring-[#007AFF]/30"
                      >
                        <img
                          src={photo.signed_url}
                          alt={photo.caption ?? 'Before photo added on site'}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOnsite(photo.id)}
                            disabled={deletingId === photo.id}
                            aria-label="Delete photo"
                            className="absolute top-1.5 right-1.5 w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-50"
                          >
                            {deletingId === photo.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <X className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => togglePhoto(photo.id)}
                      disabled={isReadOnly || isPersisting || isUploading}
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

      {formData.areasTreated.length === 0 && photos.length === 0 && !isLoading && (
        <p className="text-xs text-[#86868b] italic text-center">
          No areas or photos linked yet.
        </p>
      )}
    </section>
  );
}
