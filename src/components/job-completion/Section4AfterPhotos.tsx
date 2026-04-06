'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, ImageIcon, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import {
  uploadMultiplePhotos,
  deleteInspectionPhoto,
} from '@/lib/utils/photoUpload';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
  leadId: string;
  jobCompletionId: string | null;
}

type PhotoCategory = 'after' | 'demolition';

interface JobPhoto {
  id: string;
  storage_path: string;
  photo_category: PhotoCategory;
  signed_url: string;
}

const SIGNED_URL_TTL_SECONDS = 3600;

/** Look up the most recent inspection for a lead — needed because the photos table requires inspection_id. */
async function fetchInspectionId(leadId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('inspections')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Fetch all after/demolition photos for a job completion, enriched with signed URLs. */
async function fetchJobCompletionPhotos(jobCompletionId: string): Promise<JobPhoto[]> {
  const { data: rows, error } = await supabase
    .from('photos')
    .select('id, storage_path, photo_category')
    .eq('job_completion_id', jobCompletionId)
    .in('photo_category', ['after', 'demolition'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const withUrls = await Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.storage
        .from('inspection-photos')
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
      return {
        id: row.id,
        storage_path: row.storage_path,
        photo_category: row.photo_category as PhotoCategory,
        signed_url: data?.signedUrl ?? '',
      };
    })
  );

  return withUrls.filter((p) => p.signed_url);
}

/**
 * Section4AfterPhotos — After-remediation photo capture.
 *
 * Technicians upload photos of completed work. When the demolition toggle
 * is on, an additional grid for demolition photos appears. All photos are
 * stored in the photos table linked to the job_completion via
 * job_completion_id and tagged with photo_category ('after' | 'demolition').
 */
export function Section4AfterPhotos({
  formData,
  onChange,
  isReadOnly = false,
  leadId,
  jobCompletionId,
}: SectionProps) {
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [inspectionLookupError, setInspectionLookupError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCategoryRef = useRef<PhotoCategory>('after');

  // Resolve the inspection_id once per lead — required for photos.insert.
  useEffect(() => {
    let cancelled = false;
    fetchInspectionId(leadId)
      .then((id) => {
        if (cancelled) return;
        setInspectionId(id);
        if (!id) setInspectionLookupError('No inspection linked to this lead. Photos cannot be uploaded.');
      })
      .catch((err) => {
        if (cancelled) return;
        setInspectionLookupError(err instanceof Error ? err.message : 'Failed to load inspection.');
      });
    return () => { cancelled = true; };
  }, [leadId]);

  const {
    data: photos = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['job-completion-after-photos', jobCompletionId],
    queryFn: () => fetchJobCompletionPhotos(jobCompletionId as string),
    enabled: !!jobCompletionId,
  });

  const { afterPhotos, demolitionPhotos } = useMemo(() => {
    const after: JobPhoto[] = [];
    const demolition: JobPhoto[] = [];
    for (const p of photos) {
      if (p.photo_category === 'demolition') demolition.push(p);
      else after.push(p);
    }
    return { afterPhotos: after, demolitionPhotos: demolition };
  }, [photos]);

  const canUpload = !isReadOnly && !!inspectionId && !!jobCompletionId && !isUploading;

  function triggerUpload(category: PhotoCategory) {
    if (!canUpload) return;
    pendingCategoryRef.current = category;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Reset the input immediately so the same file can be re-selected later.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0 || !inspectionId || !jobCompletionId) return;

    const category = pendingCategoryRef.current;
    setIsUploading(true);
    try {
      const results = await uploadMultiplePhotos(files, {
        inspection_id: inspectionId,
        job_completion_id: jobCompletionId,
        photo_category: category,
        photo_type: 'general',
      });
      await refetch();
      toast.success(`${results.length} photo${results.length === 1 ? '' : 's'} uploaded`);
    } catch (err) {
      console.error('[Section4AfterPhotos] Upload failed:', err);
      toast.error(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    if (isReadOnly || deletingId) return;
    setDeletingId(photoId);
    try {
      await deleteInspectionPhoto(photoId);
      await refetch();
      toast.success('Photo deleted');
    } catch (err) {
      console.error('[Section4AfterPhotos] Delete failed:', err);
      toast.error('Could not delete photo');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section aria-labelledby="after-photos-heading" className="space-y-5">
      {/* Hidden file input — reused by both grids via pendingCategoryRef */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

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

      {inspectionLookupError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {inspectionLookupError}
        </div>
      )}

      {/* After photos card */}
      <div className="bg-white rounded-xl p-5 space-y-4">
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => triggerUpload('after')}
            disabled={!canUpload}
            className="flex items-center justify-center gap-2 w-full h-12 bg-[#007AFF] text-white rounded-lg font-medium text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 active:opacity-90 disabled:opacity-50"
            aria-label="Take a photo"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="w-5 h-5" aria-hidden="true" />
            )}
            {isUploading ? 'Uploading...' : 'Take Photo'}
          </button>
        )}

        <PhotoGrid
          photos={afterPhotos}
          isLoading={isLoading}
          isReadOnly={isReadOnly}
          canUpload={canUpload}
          deletingId={deletingId}
          onAdd={() => triggerUpload('after')}
          onDelete={handleDelete}
          emptyLabel="No after photos yet. Tap Take Photo to add one."
        />
      </div>

      {/* Demolition photos — conditional on toggle */}
      {formData.demolitionWorks && (
        <div className="bg-white rounded-xl p-5 space-y-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Demolition Photos</h3>
          <p className="text-xs text-[#86868b]">
            Document material removal and cavity exposure
          </p>
          <PhotoGrid
            photos={demolitionPhotos}
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            canUpload={canUpload}
            deletingId={deletingId}
            onAdd={() => triggerUpload('demolition')}
            onDelete={handleDelete}
            emptyLabel="No demolition photos yet."
          />
        </div>
      )}
    </section>
  );
}

interface PhotoGridProps {
  photos: JobPhoto[];
  isLoading: boolean;
  isReadOnly: boolean;
  canUpload: boolean;
  deletingId: string | null;
  onAdd: () => void;
  onDelete: (id: string) => void;
  emptyLabel: string;
}

function PhotoGrid({
  photos,
  isLoading,
  isReadOnly,
  canUpload,
  deletingId,
  onAdd,
  onDelete,
  emptyLabel,
}: PhotoGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
        >
          <img
            src={photo.signed_url}
            alt="After remediation"
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => onDelete(photo.id)}
              disabled={deletingId === photo.id}
              aria-label="Delete photo"
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-50"
            >
              {deletingId === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <X className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      ))}

      {!isReadOnly && (
        <button
          type="button"
          onClick={onAdd}
          disabled={!canUpload}
          aria-label="Add photo"
          className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 min-h-[48px] hover:border-[#007AFF] hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5 text-gray-400" aria-hidden="true" />
          <span className="text-[11px] text-gray-400">Add</span>
        </button>
      )}

      {photos.length === 0 && isReadOnly && (
        <div className="col-span-full flex flex-col items-center justify-center py-6 gap-2">
          <ImageIcon className="w-7 h-7 text-gray-300" aria-hidden="true" />
          <p className="text-xs text-[#86868b]">{emptyLabel}</p>
        </div>
      )}
    </div>
  );
}
