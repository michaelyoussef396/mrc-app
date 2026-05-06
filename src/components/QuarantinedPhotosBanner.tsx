// QuarantinedPhotosBanner — Stage 4.1.5
//
// Surfaces photos that failed the dequeue caption gate inside SyncManager.
// Photos land here when their queued metadata is missing/invalid (pre-Stage
// 4.1 enqueue, manual IndexedDB tampering, schema drift). The banner is the
// only visible signal — without it, quarantined photos sit forever.
//
// Banner stays in the page chrome; clicking "Review" opens a modal listing
// each photo with two actions: re-caption + retry, or discard.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Trash2, Camera } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useQuarantinedPhotos } from '@/lib/offline/useQuarantinedPhotos'
import { PhotoCaptionPromptDialog } from '@/components/photos/PhotoCaptionPromptDialog'
import type { QuarantinedPhoto } from '@/lib/offline/types'

export default function QuarantinedPhotosBanner() {
  const { count, photos, requeue, discard } = useQuarantinedPhotos()
  const [reviewOpen, setReviewOpen] = useState(false)
  const [captionTarget, setCaptionTarget] = useState<QuarantinedPhoto | null>(null)

  if (count === 0) return null

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9998] bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-sm font-medium min-w-0">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {count} photo{count > 1 ? 's' : ''} couldn't sync — review required
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setReviewOpen(true)}
          className="h-12 min-h-[48px] bg-white text-red-700 hover:bg-red-50"
        >
          Review
        </Button>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Photos awaiting review</DialogTitle>
            <DialogDescription>
              These photos couldn't sync because they were missing a caption. Add
              one to retry, or discard the photo.
            </DialogDescription>
          </DialogHeader>

          <ul className="py-2 space-y-3">
            {photos.map((photo) => (
              <QuarantinedPhotoRow
                key={photo.id}
                photo={photo}
                onAddCaption={() => setCaptionTarget(photo)}
                onDiscard={async () => {
                  try {
                    await discard(photo.id)
                    toast.success('Photo discarded')
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to discard photo')
                  }
                }}
              />
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <PhotoCaptionPromptDialog
        isOpen={captionTarget !== null}
        title="Add caption to retry"
        description="The next sync will pick this photo up automatically."
        onConfirm={async (caption) => {
          if (!captionTarget) return
          try {
            await requeue(captionTarget.id, caption)
            toast.success('Photo re-queued for sync')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to re-queue photo')
          } finally {
            setCaptionTarget(null)
          }
        }}
        onCancel={() => setCaptionTarget(null)}
      />
    </>
  )
}

interface QuarantinedPhotoRowProps {
  photo: QuarantinedPhoto
  onAddCaption: () => void
  onDiscard: () => void | Promise<void>
}

function QuarantinedPhotoRow({ photo, onAddCaption, onDiscard }: QuarantinedPhotoRowProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob])

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  return (
    <li className="flex items-start gap-3 p-3 border rounded-lg">
      <img
        src={previewUrl}
        alt={photo.originalFileName}
        width={64}
        height={64}
        className="w-16 h-16 object-cover rounded-md bg-gray-100 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{photo.originalFileName}</p>
        <p className="text-xs text-gray-500 capitalize">{photo.photoType}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            onClick={onAddCaption}
            className="h-12 min-h-[48px] bg-orange-600 hover:bg-orange-700"
          >
            <Camera className="h-4 w-4 mr-1" aria-hidden="true" />
            Add caption & retry
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDiscard}
            className="h-12 min-h-[48px]"
          >
            <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
            Discard
          </Button>
        </div>
      </div>
    </li>
  )
}
