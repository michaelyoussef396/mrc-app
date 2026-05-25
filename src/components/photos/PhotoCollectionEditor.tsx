import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { uploadInspectionPhoto, deleteInspectionPhoto } from '@/lib/utils/photoUpload'
import { recordPhotoHistory } from '@/lib/utils/photoHistory'
import { Camera, CheckCircle2, ImagePlus, Star, Trash2, Loader2, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { PhotoCaptionPromptDialog } from '@/components/photos/PhotoCaptionPromptDialog'
import { PhotoDeleteConfirm } from '@/components/photos/PhotoDeleteConfirm'
import { PhotoPickerDialog } from '@/components/photos/PhotoPickerDialog'

import type { PhotoMetadata } from '@/lib/utils/photoUpload'

export interface CollectionPhoto {
  id: string
  storage_path: string
  signed_url: string
  caption?: string | null
}

export type PhotoAssociation =
  | { type: 'area'; areaId: string }
  | { type: 'subfloor' }
  | { type: 'general' }
  | { type: 'job'; jobCompletionId: string; photoCategory: 'before' | 'after' | 'demolition' }

interface PhotoCollectionEditorProps {
  photos: CollectionPhoto[]
  loading?: boolean
  inspectionId: string
  association: PhotoAssociation
  onPhotoAdded: () => void
  onPhotoDeleted: () => void
  primaryPhotoId?: string | null
  onSetPrimary?: (photoId: string) => void
  maxCount?: number
}

function buildMetadata(inspectionId: string, association: PhotoAssociation, caption: string): PhotoMetadata {
  const base = { inspection_id: inspectionId, caption }
  switch (association.type) {
    case 'area':
      return { ...base, photo_type: 'area', area_id: association.areaId }
    case 'subfloor':
      return { ...base, photo_type: 'subfloor' }
    case 'general':
      return { ...base, photo_type: 'general' }
    case 'job':
      return { ...base, photo_type: 'general', job_completion_id: association.jobCompletionId, photo_category: association.photoCategory }
  }
}

function associationColumns(association: PhotoAssociation): Record<string, unknown> {
  switch (association.type) {
    case 'area':
      return { area_id: association.areaId, photo_type: 'area', subfloor_id: null }
    case 'subfloor':
      return { photo_type: 'subfloor', area_id: null, subfloor_id: null }
    case 'general':
      return { photo_type: 'general', area_id: null, subfloor_id: null }
    case 'job':
      return { photo_type: 'general', job_completion_id: association.jobCompletionId, photo_category: association.photoCategory }
  }
}

export function PhotoCollectionEditor({
  photos,
  loading,
  inspectionId,
  association,
  onPhotoAdded,
  onPhotoDeleted,
  primaryPhotoId,
  onSetPrimary,
  maxCount,
}: PhotoCollectionEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [captionOpen, setCaptionOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (!selectedId || !gridRef.current) return
    const target = e.target as Node
    if (gridRef.current.contains(target)) return
    // Don't deselect when clicking dialog overlays, headers, or action dialogs
    const el = target instanceof Element ? target : target.parentElement
    if (el?.closest('[role="dialog"], [role="alertdialog"]')) return
    setSelectedId(null)
  }, [selectedId])

  useEffect(() => {
    if (selectedId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedId, handleClickOutside])

  useEffect(() => {
    if (selectedId && !photos.some((p) => p.id === selectedId)) {
      setSelectedId(null)
    }
  }, [photos, selectedId])

  async function handleUploadWithCaption(caption: string) {
    setCaptionOpen(false)
    const input = fileInputRef.current
    if (!input) return
    input.dataset.caption = caption
    input.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const caption = (e.target as HTMLInputElement).dataset?.caption || ''
    e.target.value = ''
    if (!file || !caption.trim()) return

    setUploading(true)
    try {
      const metadata = buildMetadata(inspectionId, association, caption)
      await uploadInspectionPhoto(file, metadata)
      toast.success('Photo uploaded')
      onPhotoAdded()
    } catch (err) {
      console.error('Photo upload failed:', err)
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handlePickExisting(photo: { id: string; signed_url: string; caption: string | null; photo_type: string; area_id: string | null; subfloor_id: string | null }) {
    const replacing = replaceTarget
    setPickerOpen(false)
    setReplaceTarget(null)
    setSelectedId(null)

    try {
      // Fetch the source photo's storage_path + metadata for the copy
      const { data: source, error: fetchErr } = await supabase
        .from('photos')
        .select('storage_path, file_name, file_size, mime_type, caption, uploaded_by')
        .eq('id', photo.id)
        .is('deleted_at', null)
        .single()
      if (fetchErr || !source) throw new Error('Failed to read source photo')

      // Insert copy BEFORE deleting old — if insert fails, no data lost
      const cols = associationColumns(association)
      const { data: newRow, error: insertErr } = await supabase
        .from('photos')
        .insert({
          inspection_id: inspectionId,
          storage_path: source.storage_path,
          file_name: source.file_name,
          file_size: source.file_size,
          mime_type: source.mime_type,
          caption: source.caption,
          uploaded_by: source.uploaded_by,
          ...cols,
        })
        .select('id')
        .single()
      if (insertErr) throw new Error(insertErr.message)

      // Soft-delete old photo AFTER copy succeeded (1-for-1 swap)
      if (replacing) {
        await deleteInspectionPhoto(replacing)
      }

      if (newRow) {
        await recordPhotoHistory({
          photo_id: newRow.id,
          inspection_id: inspectionId,
          action: 'added',
          after: { photo_type: (cols as Record<string, unknown>).photo_type as string, ...cols },
        })
      }

      toast.success(replacing ? 'Photo replaced' : 'Photo added')
      onPhotoAdded()
    } catch (err) {
      console.error('Pick existing photo failed:', err)
      toast.error(replacing ? 'Failed to replace photo' : 'Failed to add photo')
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const photoId = deleteTarget
    setDeleting(true)
    try {
      await deleteInspectionPhoto(photoId)
      setDeleteTarget(null)
      setSelectedId(null)
      setDeleting(false)
      toast.success('Photo deleted')
      onPhotoDeleted()
    } catch (err) {
      console.error('Delete photo failed:', err)
      toast.error('Failed to delete photo')
      setDeleteTarget(null)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading photos...</span>
      </div>
    )
  }

  const hasSelection = selectedId !== null
  const isAtCap = maxCount !== undefined && photos.length >= maxCount

  return (
    <>
      <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => {
          const isPrimary = primaryPhotoId === photo.id
          const isSelected = selectedId === photo.id
          const isDimmed = hasSelection && !isSelected
          return (
            <div key={photo.id}>
              <button
                type="button"
                onClick={() => setSelectedId(isSelected ? null : photo.id)}
                className={`relative w-full aspect-square rounded-lg overflow-hidden transition-all focus:outline-none ${
                  isSelected
                    ? 'border-4 border-blue-500 ring-[6px] ring-blue-400/60 shadow-xl shadow-blue-500/25'
                    : isPrimary
                      ? 'border-2 border-amber-500'
                      : 'border-2 border-transparent'
                } ${isDimmed ? 'opacity-30' : ''}`}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} photo: ${photo.caption || 'untitled'}`}
                aria-pressed={isSelected}
              >
                <img
                  src={photo.signed_url}
                  alt={photo.caption || 'Photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                    <CheckCircle2 className="h-6 w-6 fill-white stroke-blue-500" />
                  </div>
                )}

                {isPrimary && !isSelected && (
                  <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white rounded-full p-1">
                    <Star className="h-3 w-3 fill-current" />
                  </div>
                )}
              </button>

              {photo.caption && (
                <p className={`mt-1 text-xs line-clamp-1 ${isDimmed ? 'text-gray-300' : 'text-gray-500'}`}>{photo.caption}</p>
              )}

              {isSelected && (
                <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                  <button
                    onClick={() => { setReplaceTarget(photo.id); setPickerOpen(true) }}
                    className="h-10 min-w-[48px] px-3 flex items-center justify-center gap-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 text-xs font-medium transition-colors"
                    aria-label="Replace photo"
                  >
                    <ArrowLeftRight className="h-4 w-4 shrink-0" />
                    Replace
                  </button>
                  {onSetPrimary && !isPrimary && (
                    <button
                      onClick={() => { onSetPrimary(photo.id); setSelectedId(null) }}
                      className="h-10 min-w-[48px] px-3 flex items-center justify-center gap-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 text-xs font-medium transition-colors"
                      aria-label="Set as primary photo"
                    >
                      <Star className="h-4 w-4 shrink-0" />
                      Primary
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(photo.id)}
                    className="h-10 min-w-[48px] px-3 flex items-center justify-center gap-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 text-xs font-medium transition-colors"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add photo card — hidden when at capacity */}
        {!isAtCap && (
          <div className={`aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3 ${hasSelection ? 'opacity-40' : ''}`}>
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <button
                  onClick={() => { setSelectedId(null); setCaptionOpen(true) }}
                  className="h-12 w-12 flex items-center justify-center rounded-full bg-[#121D73] text-white hover:bg-[#0f1860] active:bg-[#0d1450] transition-colors"
                  title="Upload new photo"
                  aria-label="Upload new photo"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <button
                  onClick={() => { setSelectedId(null); setReplaceTarget(null); setPickerOpen(true) }}
                  className="h-12 w-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                  title="Pick from existing"
                  aria-label="Pick from existing photos"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      <PhotoCaptionPromptDialog
        isOpen={captionOpen}
        title="Add photo"
        description="Enter a caption before uploading."
        onConfirm={handleUploadWithCaption}
        onCancel={() => setCaptionOpen(false)}
      />

      <PhotoPickerDialog
        isOpen={pickerOpen}
        inspectionId={inspectionId}
        excludePhotoIds={photos.map((p) => p.id)}
        onSelect={handlePickExisting}
        onCancel={() => setPickerOpen(false)}
      />

      <PhotoDeleteConfirm
        isOpen={!!deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </>
  )
}
