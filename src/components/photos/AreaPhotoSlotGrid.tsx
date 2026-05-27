import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { uploadInspectionPhoto, unplacePhoto, loadUnplacedPhotos } from '@/lib/utils/photoUpload'
import { recordPhotoHistory } from '@/lib/utils/photoHistory'
import { Camera, ImagePlus, Star, Trash2, Loader2, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { PhotoCaptionPromptDialog } from '@/components/photos/PhotoCaptionPromptDialog'
import { PhotoDeleteConfirm } from '@/components/photos/PhotoDeleteConfirm'
import { PhotoPickerDialog } from '@/components/photos/PhotoPickerDialog'

import type { CollectionPhoto } from '@/components/photos/PhotoCollectionEditor'
import type { PhotoMetadata } from '@/lib/utils/photoUpload'

interface SlotDef {
  label: string
  type: 'regular' | 'infrared' | 'natural_infrared'
  autoCaption?: string
}

const REGULAR_SLOTS: SlotDef[] = [
  { label: 'Area 1', type: 'regular' },
  { label: 'Area 2', type: 'regular' },
  { label: 'Area 3', type: 'regular' },
  { label: 'Area 4', type: 'regular' },
]

const IR_SLOTS: SlotDef[] = [
  { label: 'Infrared', type: 'infrared', autoCaption: 'infrared' },
  { label: 'Natural Infrared', type: 'natural_infrared', autoCaption: 'natural_infrared' },
]

interface AreaPhotoSlotGridProps {
  areaPhotos: CollectionPhoto[]
  areaId: string
  inspectionId: string
  infraredEnabled: boolean
  primaryPhotoId: string | null
  onSetPrimary: (photoId: string) => void
  onPhotosChanged: () => Promise<void>
  onPreviewStale: () => void
  loading?: boolean
}

type Mode =
  | { step: 'idle' }
  | { step: 'selected'; slotIndex: number }
  | { step: 'removing'; slotIndex: number }
  | { step: 'picking'; slotIndex: number }
  | { step: 'captioning'; slotIndex: number }

function splitIntoSlots(photos: CollectionPhoto[], primaryPhotoId: string | null) {
  const regulars = photos.filter(p => p.caption !== 'infrared' && p.caption !== 'natural_infrared')
  if (primaryPhotoId) {
    const pIdx = regulars.findIndex(p => p.id === primaryPhotoId)
    if (pIdx > 0) {
      const [primary] = regulars.splice(pIdx, 1)
      regulars.unshift(primary)
    }
  }

  return {
    regular: regulars.slice(0, 4) as (CollectionPhoto | null)[],
    infrared: photos.find(p => p.caption === 'infrared') ?? null,
    naturalInfrared: photos.find(p => p.caption === 'natural_infrared') ?? null,
  }
}

export function AreaPhotoSlotGrid({
  areaPhotos,
  areaId,
  inspectionId,
  infraredEnabled,
  primaryPhotoId,
  onSetPrimary,
  onPhotosChanged,
  onPreviewStale,
  loading,
}: AreaPhotoSlotGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>({ step: 'idle' })
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)

  const slots = splitIntoSlots(areaPhotos, primaryPhotoId)
  const allSlotDefs = infraredEnabled ? [...REGULAR_SLOTS, ...IR_SLOTS] : [...REGULAR_SLOTS]

  function photoForSlot(index: number): CollectionPhoto | null {
    if (index < 4) {
      return slots.regular[index] ?? null
    }
    if (index === 4) return slots.infrared
    if (index === 5) return slots.naturalInfrared
    return null
  }

  const selectedSlotIndex = mode.step === 'selected' ? mode.slotIndex : null
  const hasSelection = mode.step === 'selected'

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (mode.step !== 'selected' || !gridRef.current) return
    const target = e.target as Node
    if (gridRef.current.contains(target)) return
    const el = target instanceof Element ? target : target.parentElement
    if (el?.closest('[role="dialog"], [role="alertdialog"]')) return
    setMode({ step: 'idle' })
  }, [mode])

  useEffect(() => {
    if (mode.step === 'selected') {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mode, handleClickOutside])

  const activeSlotDef = (mode.step !== 'idle' ? allSlotDefs[mode.slotIndex] : null) ?? null

  function handleUploadWithCaption(caption: string) {
    if (!activeSlotDef) return
    const input = fileInputRef.current
    if (!input) return
    input.dataset.caption = caption
    input.click()
    setMode({ step: 'idle' })
  }

  function handleAddUpload(slotIndex: number) {
    const def = allSlotDefs[slotIndex]
    if (def.autoCaption) {
      setMode({ step: 'idle' })
      const input = fileInputRef.current
      if (!input) return
      input.dataset.caption = def.autoCaption
      input.dataset.slotIndex = String(slotIndex)
      input.click()
    } else {
      setMode({ step: 'captioning', slotIndex })
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const caption = (e.target as HTMLInputElement).dataset?.caption || ''
    e.target.value = ''
    if (!file || !caption.trim()) return

    setUploading(true)
    try {
      const metadata: PhotoMetadata = {
        inspection_id: inspectionId,
        caption,
        photo_type: 'area',
        area_id: areaId,
      }
      await uploadInspectionPhoto(file, metadata)
      toast.success('Photo uploaded')
      await onPhotosChanged()
      onPreviewStale()
    } catch (err) {
      console.error('Photo upload failed:', err)
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handlePickExisting(photo: { id: string; signed_url: string; caption: string | null; photo_type: string; area_id: string | null; subfloor_id: string | null }) {
    if (mode.step !== 'picking') return
    const def = allSlotDefs[mode.slotIndex]
    setMode({ step: 'idle' })

    try {
      const updates: Record<string, unknown> = {
        area_id: areaId,
        photo_type: 'area',
        subfloor_id: null,
      }
      if (def.autoCaption) {
        updates.caption = def.autoCaption
      }

      const { error } = await supabase
        .from('photos')
        .update(updates)
        .eq('id', photo.id)
        .is('deleted_at', null)
      if (error) throw new Error(error.message)

      await recordPhotoHistory({
        photo_id: photo.id,
        inspection_id: inspectionId,
        action: 'category_changed',
        before: { area_id: photo.area_id, subfloor_id: photo.subfloor_id, caption: photo.caption },
        after: { area_id: areaId, subfloor_id: null, caption: def.autoCaption ?? photo.caption },
      })

      toast.success('Photo placed')
      await onPhotosChanged()
      onPreviewStale()
    } catch (err) {
      console.error('Pick existing photo failed:', err)
      toast.error('Failed to place photo')
    }
  }

  async function handleConfirmRemove() {
    if (mode.step !== 'removing') return
    const photo = photoForSlot(mode.slotIndex)
    if (!photo) return

    setRemoving(true)
    try {
      await unplacePhoto(photo.id)
      setMode({ step: 'idle' })
      toast.success('Photo removed from area')
      await onPhotosChanged()
      onPreviewStale()
    } catch (err) {
      console.error('Remove photo failed:', err)
      toast.error('Failed to remove photo')
    } finally {
      setRemoving(false)
    }
  }

  const loadPool = useCallback(
    (iid: string) => loadUnplacedPhotos(iid),
    []
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading photos...</span>
      </div>
    )
  }

  return (
    <>
      <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {allSlotDefs.map((def, index) => {
          const photo = photoForSlot(index)
          const isSelected = selectedSlotIndex === index
          const isDimmed = hasSelection && !isSelected
          const isPrimary = photo ? primaryPhotoId === photo.id : false
          const isRegular = def.type === 'regular'

          if (photo) {
            return (
              <div key={`slot-${index}`}>
                <button
                  type="button"
                  onClick={() => setMode(isSelected ? { step: 'idle' } : { step: 'selected', slotIndex: index })}
                  className={`relative w-full aspect-square rounded-lg overflow-hidden transition-all focus:outline-none ${
                    isSelected
                      ? 'border-4 border-blue-500 ring-[6px] ring-blue-400/60 shadow-xl shadow-blue-500/25'
                      : isPrimary
                        ? 'border-2 border-amber-500'
                        : 'border-2 border-transparent'
                  } ${isDimmed ? 'opacity-30' : ''}`}
                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${def.label}: ${photo.caption || 'untitled'}`}
                  aria-pressed={isSelected}
                >
                  <img
                    src={photo.signed_url}
                    alt={photo.caption || def.label}
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

                <p className={`mt-1 text-xs line-clamp-1 ${isDimmed ? 'text-gray-300' : 'text-gray-500'}`}>
                  {def.label}{photo.caption && photo.caption !== def.autoCaption ? ` — ${photo.caption}` : ''}
                </p>

                {isSelected && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                    <button
                      onClick={() => setMode({ step: 'removing', slotIndex: index })}
                      className="h-10 min-w-[48px] px-3 flex items-center justify-center gap-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 text-xs font-medium transition-colors"
                      aria-label="Remove photo from area"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      Remove
                    </button>
                    {isRegular && onSetPrimary && !isPrimary && (
                      <button
                        onClick={() => { onSetPrimary(photo.id); setMode({ step: 'idle' }) }}
                        className="h-10 min-w-[48px] px-3 flex items-center justify-center gap-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 text-xs font-medium transition-colors"
                        aria-label="Set as primary photo"
                      >
                        <Star className="h-4 w-4 shrink-0" />
                        Primary
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={`slot-${index}`} className={`${isDimmed ? 'opacity-30' : ''}`}>
              <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 bg-gray-50">
                <span className="text-xs font-medium text-gray-400">{def.label}</span>
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddUpload(index)}
                      className="h-10 w-10 flex items-center justify-center rounded-full bg-[#121D73] text-white hover:bg-[#0f1860] active:bg-[#0d1450] transition-colors"
                      title={`Upload ${def.label} photo`}
                      aria-label={`Upload ${def.label} photo`}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMode({ step: 'picking', slotIndex: index })}
                      className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                      title={`Pick existing for ${def.label}`}
                      aria-label={`Pick existing photo for ${def.label}`}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
        isOpen={mode.step === 'captioning'}
        title={`Add ${activeSlotDef?.label ?? 'Area'} Photo`}
        description="Enter a caption before uploading."
        onConfirm={handleUploadWithCaption}
        onCancel={() => setMode({ step: 'idle' })}
      />

      <PhotoPickerDialog
        isOpen={mode.step === 'picking'}
        inspectionId={inspectionId}
        excludePhotoIds={areaPhotos.map(p => p.id)}
        onSelect={handlePickExisting}
        onCancel={() => setMode({ step: 'idle' })}
        loadPhotos={loadPool}
      />

      <PhotoDeleteConfirm
        isOpen={mode.step === 'removing'}
        onConfirm={handleConfirmRemove}
        onCancel={() => setMode({ step: 'idle' })}
        deleting={removing}
      />
    </>
  )
}
