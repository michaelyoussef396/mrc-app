import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ImageOff, Loader2 } from 'lucide-react'
import { loadInspectionPhotos } from '@/lib/utils/photoUpload'

interface PickerPhoto {
  id: string
  signed_url: string
  caption: string | null
  photo_type: string
  area_id: string | null
  subfloor_id: string | null
}

interface PhotoPickerDialogProps {
  isOpen: boolean
  inspectionId: string
  excludePhotoIds?: string[]
  onSelect: (photo: PickerPhoto) => void
  onCancel: () => void
}

export function PhotoPickerDialog({
  isOpen,
  inspectionId,
  excludePhotoIds = [],
  onSelect,
  onCancel,
}: PhotoPickerDialogProps) {
  const [photos, setPhotos] = useState<PickerPhoto[]>([])
  const [loading, setLoading] = useState(false)

  const excludeKey = useMemo(() => [...excludePhotoIds].sort().join(','), [excludePhotoIds])

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    const excludeSet = excludeKey ? new Set(excludeKey.split(',')) : new Set<string>()
    loadInspectionPhotos(inspectionId)
      .then((all) => {
        const available = (excludeSet.size > 0 ? all.filter((p) => !excludeSet.has(p.id)) : all)
          .map((p) => ({
            id: p.id,
            signed_url: p.signed_url,
            caption: p.caption,
            photo_type: p.photo_type,
            area_id: p.area_id,
            subfloor_id: p.subfloor_id,
          }))
        setPhotos(available)
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [isOpen, inspectionId, excludeKey])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pick from existing photos</DialogTitle>
          <DialogDescription>Select a photo to add a copy to this section.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No available photos found.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => onSelect(photo)}
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
              >
                {photo.signed_url ? (
                  <img
                    src={photo.signed_url}
                    alt={photo.caption || 'Inspection photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <ImageOff className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                    <span className="text-[10px] text-white line-clamp-1">{photo.caption}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onCancel} className="min-h-[48px]">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
