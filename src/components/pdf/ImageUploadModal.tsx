// ImageUploadModal Component
// Handles photo replacement in the PDF report
// Mobile-first design with 48px touch targets

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Upload, Image as ImageIcon, X, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

interface ImageUploadModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal closes */
  onClose: () => void
  /** The inspection ID */
  inspectionId: string
  /** The photo field key (e.g., 'cover_photo', 'front_door_photo') */
  fieldKey: string
  /** Human-readable label */
  fieldLabel: string
  /** Current photo URL if any */
  currentPhotoUrl?: string
  /** Callback when photo is successfully uploaded */
  onSuccess: () => void
}

export function ImageUploadModal({
  isOpen,
  onClose,
  inspectionId,
  fieldKey,
  fieldLabel,
  currentPhotoUrl,
  onSuccess
}: ImageUploadModalProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first')
      return
    }

    setUploading(true)
    toast.loading('Uploading image...', { id: 'image-upload' })

    try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Generate unique filename
      const timestamp = Date.now()
      const ext = selectedFile.name.split('.').pop() || 'jpg'
      const filename = `${inspectionId}/${fieldKey}-${timestamp}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(filename, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filename)

      // Update the photos table
      await supabase
        .from('photos')
        .insert({
          inspection_id: inspectionId,
          storage_path: filename,
          photo_type: mapFieldKeyToPhotoType(fieldKey),
          caption: fieldLabel
        })

      toast.success('Image uploaded successfully!', { id: 'image-upload' })
      toast.loading('Regenerating PDF...', { id: 'pdf-regen' })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image', { id: 'image-upload' })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setPreview(currentPhotoUrl || null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Map field key to photo_type
  function mapFieldKeyToPhotoType(key: string): string {
    const typeMap: Record<string, string> = {
      'cover_photo': 'general',
      'front_door_photo': 'outdoor',
      'front_house_photo': 'outdoor',
      'mailbox_photo': 'outdoor',
      'street_photo': 'outdoor',
      'direction_photo': 'direction'
    }
    return typeMap[key] || 'general'
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Replace {fieldLabel}
          </DialogTitle>
          <DialogDescription>
            Upload a new image to replace the current photo
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Preview Area */}
          <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden mb-4">
            {preview ? (
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                {selectedFile && (
                  <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full
                               hover:bg-red-700 min-w-[40px] min-h-[40px]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-gray-50 p-6">
                <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-gray-500 text-center">
                  No image selected
                </p>
              </div>
            )}
          </div>

          {/* Upload Buttons */}
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload-input"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-14 min-h-[56px] text-lg"
              disabled={uploading}
            >
              <Upload className="w-5 h-5 mr-2" />
              Choose File
            </Button>

            {/* Camera button for mobile */}
            <Button
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.capture = 'environment'
                  fileInputRef.current.click()
                }
              }}
              className="h-14 min-h-[56px] px-4 md:hidden"
              disabled={uploading}
            >
              <Camera className="w-5 h-5" />
            </Button>
          </div>

          {selectedFile && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploading}
            className="h-12 min-h-[48px] flex-1"
          >
            <X className="h-5 w-5 mr-2" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="h-12 min-h-[48px] flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload & Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImageUploadModal
