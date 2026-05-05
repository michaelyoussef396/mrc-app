'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImageIcon, ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import {
  uploadMultiplePhotos,
  deleteInspectionPhoto,
} from '@/lib/utils/photoUpload';
import { PhotoCaptionPromptDialog } from '@/components/photos/PhotoCaptionPromptDialog';

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
const DEMOLITION_PHOTO_LIMIT = 4;

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

async function fetchBeforePhotoCount(jobCompletionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('job_completion_id', jobCompletionId)
    .eq('photo_category', 'before');

  if (error) return 0;
  return count ?? 0;
}

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
  const pendingCaptionRef = useRef<string>('');
  const [captionPromptOpen, setCaptionPromptOpen] = useState(false);
  const [captionPromptCategory, setCaptionPromptCategory] = useState<PhotoCategory>('after');

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

  const { data: beforeCount = 0 } = useQuery({
    queryKey: ['before-photo-count', jobCompletionId],
    queryFn: () => fetchBeforePhotoCount(jobCompletionId as string),
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

  const afterLimit = beforeCount;
  const isAfterAtLimit = afterPhotos.length >= afterLimit;
  const isDemolitionAtLimit = demolitionPhotos.length >= DEMOLITION_PHOTO_LIMIT;

  const canUpload = !isReadOnly && !!inspectionId && !!jobCompletionId && !isUploading;

  function triggerUpload(category: PhotoCategory) {
    if (!canUpload) return;

    if (category === 'after') {
      if (afterLimit === 0) {
        toast.error('Select before photos in Section 3 first');
        return;
      }
      if (isAfterAtLimit) {
        toast.error(`You already have ${afterLimit} after photos matching your ${afterLimit} before photos`);
        return;
      }
    }

    if (category === 'demolition' && isDemolitionAtLimit) {
      toast.error(`Demolition photos limited to ${DEMOLITION_PHOTO_LIMIT}`);
      return;
    }

    pendingCategoryRef.current = category;
    setCaptionPromptCategory(category);
    setCaptionPromptOpen(true);
  }

  function handleCaptionConfirm(caption: string) {
    pendingCaptionRef.current = caption;
    setCaptionPromptOpen(false);
    fileInputRef.current?.click();
  }

  function handleCaptionCancel() {
    setCaptionPromptOpen(false);
    pendingCaptionRef.current = '';
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0 || !inspectionId || !jobCompletionId) return;

    const category = pendingCategoryRef.current;
    const currentCount = category === 'after' ? afterPhotos.length : demolitionPhotos.length;
    const limit = category === 'after' ? afterLimit : DEMOLITION_PHOTO_LIMIT;
    const remaining = limit - currentCount;

    if (remaining <= 0) {
      toast.error(`Limit reached — ${limit} ${category} photos allowed`);
      return;
    }

    const filesToUpload = files.length > remaining
      ? files.slice(0, remaining)
      : files;

    if (filesToUpload.length < files.length) {
      toast.info(`Only uploading ${filesToUpload.length} of ${files.length} — limit is ${limit}`);
    }

    const caption = pendingCaptionRef.current;
    if (!caption.trim()) {
      toast.error('Caption missing — try uploading again');
      return;
    }

    setIsUploading(true);
    try {
      const results = await uploadMultiplePhotos(filesToUpload, {
        inspection_id: inspectionId,
        job_completion_id: jobCompletionId,
        photo_category: category,
        photo_type: 'general',
        caption,
      });
      await refetch();
      toast.success(`${results.length} photo${results.length === 1 ? '' : 's'} uploaded`);
    } catch (err) {
      console.error('[Section4AfterPhotos] Upload failed:', err);
      toast.error(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      pendingCaptionRef.current = '';
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
      <PhotoCaptionPromptDialog
        isOpen={captionPromptOpen}
        title={captionPromptCategory === 'demolition' ? 'Add Demolition Photo' : 'Add After Photo'}
        description={
          captionPromptCategory === 'demolition'
            ? 'Describe what was demolished or removed'
            : 'Describe the area after remediation'
        }
        placeholder={
          captionPromptCategory === 'demolition'
            ? 'e.g. Cavity exposed after removing affected plaster'
            : 'e.g. Bathroom ceiling cleared of mould'
        }
        onConfirm={handleCaptionConfirm}
        onCancel={handleCaptionCancel}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
            After Photos
          </h3>
          {afterLimit > 0 && (
            <span className={`text-sm font-semibold ${isAfterAtLimit ? 'text-[#34C759]' : 'text-[#007AFF]'}`}>
              {afterPhotos.length}/{afterLimit}
            </span>
          )}
        </div>

        {afterLimit === 0 && !isLoading && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Select before photos in Section 3 first — after photos must match the before photo count.
          </div>
        )}

        {afterLimit > 0 && !isReadOnly && (
          <button
            type="button"
            onClick={() => triggerUpload('after')}
            disabled={!canUpload || isAfterAtLimit}
            className="flex items-center justify-center gap-2 w-full h-12 bg-[#007AFF] text-white rounded-lg font-medium text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 active:opacity-90 disabled:opacity-50"
            aria-label="Add photos"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="w-5 h-5" aria-hidden="true" />
            )}
            {isUploading
              ? 'Uploading...'
              : isAfterAtLimit
                ? `All ${afterLimit} photos uploaded`
                : `Add Photos (${afterLimit - afterPhotos.length} remaining)`}
          </button>
        )}

        <PhotoGrid
          photos={afterPhotos}
          isLoading={isLoading}
          isReadOnly={isReadOnly}
          canUpload={canUpload && !isAfterAtLimit}
          deletingId={deletingId}
          onAdd={() => triggerUpload('after')}
          onDelete={handleDelete}
          emptyLabel={afterLimit > 0 ? 'No after photos yet. Tap Add Photos to get started.' : ''}
        />
      </div>

      {/* Demolition photos — conditional on toggle */}
      {formData.demolitionWorks && (
        <div className="bg-white rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Demolition Photos</h3>
              <p className="text-xs text-[#86868b]">
                Document material removal and cavity exposure
              </p>
            </div>
            <span className={`text-sm font-semibold ${isDemolitionAtLimit ? 'text-[#34C759]' : 'text-[#007AFF]'}`}>
              {demolitionPhotos.length}/{DEMOLITION_PHOTO_LIMIT}
            </span>
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => triggerUpload('demolition')}
              disabled={!canUpload || isDemolitionAtLimit}
              className="flex items-center justify-center gap-2 w-full h-12 bg-[#007AFF] text-white rounded-lg font-medium text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 active:opacity-90 disabled:opacity-50"
              aria-label="Add demolition photos"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="w-5 h-5" aria-hidden="true" />
              )}
              {isUploading
                ? 'Uploading...'
                : isDemolitionAtLimit
                  ? `All ${DEMOLITION_PHOTO_LIMIT} photos uploaded`
                  : `Add Photos (${DEMOLITION_PHOTO_LIMIT - demolitionPhotos.length} remaining)`}
            </button>
          )}

          <PhotoGrid
            photos={demolitionPhotos}
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            canUpload={canUpload && !isDemolitionAtLimit}
            deletingId={deletingId}
            onAdd={() => triggerUpload('demolition')}
            onDelete={handleDelete}
            emptyLabel="No demolition photos yet."
          />

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="demolition-justification" className="block text-[15px] font-medium text-[#1d1d1f]">
                Justification
              </label>
              <textarea
                id="demolition-justification"
                value={formData.demolitionJustification}
                readOnly={isReadOnly}
                onChange={(e) => onChange('demolitionJustification', e.target.value)}
                rows={3}
                placeholder="Describe why demolition was required..."
                className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] read-only:bg-gray-50 read-only:text-[#86868b]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="demolition-removal-notes" className="block text-[15px] font-medium text-[#1d1d1f]">
                Removal Notes
              </label>
              <textarea
                id="demolition-removal-notes"
                value={formData.demolitionRemovalNotes}
                readOnly={isReadOnly}
                onChange={(e) => onChange('demolitionRemovalNotes', e.target.value)}
                rows={3}
                placeholder="Describe what materials were removed and the process used..."
                className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] read-only:bg-gray-50 read-only:text-[#86868b]"
              />
            </div>
          </div>
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

      {!isReadOnly && canUpload && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add photo"
          className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 min-h-[48px] hover:border-[#007AFF] hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5 text-gray-400" aria-hidden="true" />
          <span className="text-[11px] text-gray-400">Add</span>
        </button>
      )}

      {photos.length === 0 && (isReadOnly || !canUpload) && emptyLabel && (
        <div className="col-span-full flex flex-col items-center justify-center py-6 gap-2">
          <ImageIcon className="w-7 h-7 text-gray-300" aria-hidden="true" />
          <p className="text-xs text-[#86868b]">{emptyLabel}</p>
        </div>
      )}
    </div>
  );
}
