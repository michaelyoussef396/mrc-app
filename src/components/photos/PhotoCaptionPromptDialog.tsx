// PhotoCaptionPromptDialog
// Pre-upload caption modal for Stage 4.1 caption-required gate.
// Shown before the file picker opens so the technician — typically wearing
// gloves on-site — captures a caption first and never has to return to a
// thumbnail grid to retro-add one.
//
// Pattern copied from src/components/pdf/EditFieldModal.tsx
// (mobile-first 56px input height, 48px touch targets, shadcn/ui Dialog).

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Camera, X } from 'lucide-react'

const MAX_CAPTION_LENGTH = 500

interface PhotoCaptionPromptDialogProps {
  isOpen: boolean
  /** Headline shown at top of modal. e.g. "Add Subfloor Photo" */
  title: string
  /** Optional helper line under the title */
  description?: string
  /** Optional placeholder text for the caption field */
  placeholder?: string
  /** Called with the trimmed, non-empty caption. Modal does not close itself — owner closes via isOpen. */
  onConfirm: (caption: string) => void
  onCancel: () => void
}

/**
 * Prompt the technician for a non-empty caption before opening the file
 * picker. Validates locally; the upload pipeline re-validates via
 * validatePhotoCaption().
 */
export function PhotoCaptionPromptDialog({
  isOpen,
  title,
  description,
  placeholder = 'e.g. Mould on bathroom ceiling near vent',
  onConfirm,
  onCancel,
}: PhotoCaptionPromptDialogProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setValue('')
      setError(null)
      const t = setTimeout(() => textareaRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      setError('Caption is required')
      return
    }
    if (trimmed.length > MAX_CAPTION_LENGTH) {
      setError(`Caption must be ${MAX_CAPTION_LENGTH} characters or fewer`)
      return
    }
    onConfirm(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="photo-caption" className="text-base font-medium mb-2 block">
            Caption
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            <span className="sr-only"> required</span>
          </Label>

          <Textarea
            ref={textareaRef}
            id="photo-caption"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={MAX_CAPTION_LENGTH}
            rows={3}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'photo-caption-error' : 'photo-caption-help'}
            className="min-h-[96px] text-base resize-none"
          />

          <div className="flex items-center justify-between mt-2">
            <p
              id={error ? 'photo-caption-error' : 'photo-caption-help'}
              className={`text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}
              role={error ? 'alert' : undefined}
              aria-live={error ? 'polite' : undefined}
            >
              {error ?? 'Describe what this photo shows'}
            </p>
            <p className="text-xs text-gray-400 tabular-nums">
              {value.trim().length}/{MAX_CAPTION_LENGTH}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-12 min-h-[48px] flex-1"
          >
            <X className="h-5 w-5 mr-2" aria-hidden="true" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={value.trim().length === 0}
            className="h-12 min-h-[48px] flex-1 bg-orange-600 hover:bg-orange-700"
          >
            <Camera className="h-5 w-5 mr-2" aria-hidden="true" />
            Choose Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PhotoCaptionPromptDialog
