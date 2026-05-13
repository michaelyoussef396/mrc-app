import { supabase } from '@/integrations/supabase/client'
import { syncManager, resizePhoto } from '@/lib/offline'
import { addBusinessBreadcrumb, captureBusinessError } from '@/lib/sentry'
import { recordPhotoHistory } from '@/lib/utils/photoHistory'

export interface PhotoUploadResult {
  storage_path: string
  photo_id: string
  signed_url: string
}

export interface PhotoMetadata {
  inspection_id: string
  area_id?: string
  subfloor_id?: string
  moisture_reading_id?: string
  photo_type: 'area' | 'subfloor' | 'general' | 'outdoor'
  /**
   * Required since Stage 4.1. Either a sentinel role tag (e.g. 'infrared',
   * 'front_house', 'moisture') or a human-readable description collected via
   * PhotoCaptionPromptDialog. Empty/whitespace strings are rejected.
   */
  caption: string
  order_index?: number
  job_completion_id?: string
  photo_category?: 'before' | 'after' | 'demolition'
}

export class PhotoCaptionRequiredError extends Error {
  constructor() {
    super('Photo caption is required and cannot be empty')
    this.name = 'PhotoCaptionRequiredError'
  }
}

/**
 * Stage 4.1 gate: every photo INSERT (online or queued offline) must carry a
 * non-empty caption. Sentinel role tags satisfy this; human captions are
 * collected via PhotoCaptionPromptDialog before the file picker opens.
 */
export function validatePhotoCaption(caption: unknown): asserts caption is string {
  if (typeof caption !== 'string' || caption.trim().length === 0) {
    throw new PhotoCaptionRequiredError()
  }
}

/**
 * Queue a photo for offline upload. Resizes and stores in IndexedDB.
 * Use this when offline or when you want to batch photos for later sync.
 */
export async function queuePhotoOffline(
  file: File,
  metadata: PhotoMetadata & { inspectionDraftId: string }
): Promise<string> {
  validatePhotoCaption(metadata.caption)

  const resized = await resizePhoto(file)
  const id = crypto.randomUUID()

  await syncManager.queuePhoto({
    id,
    inspectionDraftId: metadata.inspectionDraftId,
    blob: resized,
    originalFileName: file.name,
    photoType: metadata.photo_type,
    areaId: metadata.area_id,
    subfloorId: metadata.subfloor_id,
    caption: metadata.caption,
    orderIndex: metadata.order_index || 0,
  })

  return id
}

/**
 * Upload a photo to Supabase Storage and save metadata to photos table.
 * If offline, automatically queues for later sync.
 * @param file The image file to upload
 * @param metadata Photo metadata including inspection_id, area_id, etc.
 * @returns Promise with storage_path, photo_id, and signed_url
 */
export async function uploadInspectionPhoto(
  file: File,
  metadata: PhotoMetadata
): Promise<PhotoUploadResult> {
  validatePhotoCaption(metadata.caption)

  // 1. Resize photo before upload (converts to JPEG, max 1600px, ~200-500KB)
  const resizedBlob = await resizePhoto(file)

  // 2. Convert to ArrayBuffer to avoid FormData/multipart encoding issues
  // This sends a simple binary POST with Content-Type header instead
  const resizedBuffer = await resizedBlob.arrayBuffer()

  // 3. Generate unique filename with timestamp and UUID to prevent collisions
  const timestamp = Date.now()
  const uniqueId = crypto.randomUUID().slice(0, 8) // 8 chars of randomness
  const filename = `${metadata.photo_type}-${timestamp}-${uniqueId}.jpg`

  // 4. Construct storage path based on metadata
  let storagePath: string
  if (metadata.area_id) {
    storagePath = `${metadata.inspection_id}/${metadata.area_id}/${filename}`
  } else if (metadata.subfloor_id) {
    storagePath = `${metadata.inspection_id}/subfloor/${filename}`
  } else {
    storagePath = `${metadata.inspection_id}/${filename}`
  }

  // 5. Upload resized photo to Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('inspection-photos')
    .upload(storagePath, resizedBuffer, {
      cacheControl: '3600',
      contentType: 'image/jpeg',
      upsert: false
    })

  if (uploadError) {
    console.error('Photo upload error:', uploadError)
    captureBusinessError('Photo upload failed', {
      inspectionId: metadata.inspection_id,
      photoType: metadata.photo_type,
      fileName: file.name,
      fileSize: resizedBlob.size,
      error: uploadError.message,
    })
    addBusinessBreadcrumb('photo_upload_failed', {
      error_message: uploadError.message,
      file_size: resizedBlob.size,
      mime_type: 'image/jpeg',
      photo_type: metadata.photo_type,
      inspection_id: metadata.inspection_id,
      has_moisture_reading_id: !!metadata.moisture_reading_id,
    })
    throw new Error(`Failed to upload photo: ${uploadError.message}`)
  }

  // 6. Get signed URL for display (valid for 1 hour)
  const { data: urlData } = await supabase.storage
    .from('inspection-photos')
    .createSignedUrl(uploadData.path, 3600)

  if (!urlData?.signedUrl) {
    throw new Error('Failed to generate signed URL for photo')
  }

  // 7. Get current user ID for uploaded_by tracking
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Clean up uploaded file if user not authenticated
    await supabase.storage
      .from('inspection-photos')
      .remove([uploadData.path])
    throw new Error('User must be authenticated to upload photos')
  }

  // 8. Save photo metadata to photos table
  const { data: photoData, error: photoError } = await supabase
    .from('photos')
    .insert({
      inspection_id: metadata.inspection_id,
      area_id: metadata.area_id || null,
      subfloor_id: metadata.subfloor_id || null,
      moisture_reading_id: metadata.moisture_reading_id || null,
      photo_type: metadata.photo_type,
      storage_path: uploadData.path,
      file_name: filename,
      file_size: resizedBlob.size,
      mime_type: 'image/jpeg',
      caption: metadata.caption.trim(),
      order_index: metadata.order_index || 0,
      uploaded_by: user.id,
      job_completion_id: metadata.job_completion_id || null,
      photo_category: metadata.photo_category || null
    })
    .select()
    .single()

  if (photoError) {
    // Clean up uploaded file if metadata save fails
    await supabase.storage
      .from('inspection-photos')
      .remove([uploadData.path])

    console.error('Photo metadata save error:', photoError)
    throw new Error(`Failed to save photo metadata: ${photoError.message}`)
  }

  // Stage 4.2: domain-level history. Non-blocking — never throws.
  await recordPhotoHistory({
    photo_id: photoData.id,
    inspection_id: metadata.inspection_id,
    action: 'added',
    after: {
      photo_type: metadata.photo_type,
      area_id: metadata.area_id ?? null,
      subfloor_id: metadata.subfloor_id ?? null,
      caption: metadata.caption.trim(),
      photo_category: metadata.photo_category ?? null,
    },
  })

  addBusinessBreadcrumb('photo_uploaded', {
    photo_id: photoData.id,
    caption_truthy: !!metadata.caption.trim(),
    has_moisture_reading_id: !!metadata.moisture_reading_id,
    photo_type: metadata.photo_type,
    inspection_id: metadata.inspection_id,
    area_id: metadata.area_id ?? null,
    file_size: resizedBlob.size,
  })

  return {
    storage_path: uploadData.path,
    photo_id: photoData.id,
    signed_url: urlData.signedUrl
  }
}

/**
 * Upload multiple photos sequentially to prevent HTTP/2 protocol errors
 * @param files Array of files to upload
 * @param metadata Base metadata for all photos (area_id, inspection_id, etc.)
 * @returns Promise with array of upload results
 */
export async function uploadMultiplePhotos(
  files: File[],
  metadata: PhotoMetadata
): Promise<PhotoUploadResult[]> {
  const results: PhotoUploadResult[] = []
  const errors: Array<{ index: number; filename: string; error: any }> = []

  // Upload sequentially to prevent overwhelming HTTP/2 connection
  for (let i = 0; i < files.length; i++) {
    try {

      const result = await uploadInspectionPhoto(files[i], {
        ...metadata,
        order_index: (metadata.order_index || 0) + i
      })

      results.push(result)
    } catch (error) {
      console.error(`✗ Failed to upload photo ${i + 1}/${files.length} (${files[i].name}):`, error)
      errors.push({
        index: i,
        filename: files[i].name,
        error
      })
      // Continue with remaining uploads instead of failing completely
    }
  }

  // If all uploads failed, throw error
  if (errors.length === files.length) {
    throw new Error(`All ${files.length} photo uploads failed. Check network connection and try again.`)
  }

  // If some uploads failed, log warning but return successful ones
  if (errors.length > 0) {
    console.warn(`${errors.length} of ${files.length} photos failed to upload:`, errors)
    // Don't throw - let caller decide how to handle partial success
  }

  return results
}

/**
 * Get a fresh signed URL for an existing photo
 * @param storagePath The storage_path from the photos table
 * @param expiresIn Expiry time in seconds (default: 1 hour)
 * @returns Promise with signed URL
 */
export async function getPhotoSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('inspection-photos')
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    console.error('Failed to get signed URL:', error)
    throw new Error('Failed to generate signed URL')
  }

  return data.signedUrl
}

/**
 * Soft-delete an inspection photo.
 *
 * Stage 4.3 — see docs/stage-4.3-consumer-audit.md and plan v2 §4.3.
 *
 * Behaviour:
 * 1. Reads the row metadata (filtered to active rows). Throws if the photo
 *    was already soft-deleted — silent idempotency would mask programmer
 *    errors.
 * 2. NULLs out `inspection_areas.primary_photo_id` for any area pointing to
 *    this photo. The SET NULL FK only fires on hard DELETE; soft-delete
 *    needs explicit cleanup or stale primary pointers leak.
 * 3. UPDATEs `photos.deleted_at = NOW()`. Read consumers filter
 *    `deleted_at IS NULL`, so the row disappears from the live set.
 * 4. The Storage object is intentionally retained — plan v2 verification
 *    spec: "file still in Storage" after soft-delete. A future stage may
 *    add Storage cleanup; out of scope here.
 * 5. Emits a `photo_history { action: 'deleted' }` row (non-blocking via
 *    `recordPhotoHistory`). Wires the `'deleted'` action enum value that
 *    Stage 4.2 added without a caller.
 */
export async function deleteInspectionPhoto(photoId: string): Promise<void> {
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('id, inspection_id, area_id, subfloor_id, photo_type, photo_category, caption, job_completion_id, storage_path')
    .eq('id', photoId)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to read photo before delete: ${fetchError.message}`)
  }
  if (!photo) {
    throw new Error('Photo not found or already deleted')
  }

  // Clear any inspection_areas.primary_photo_id pointing at this photo —
  // the FK is SET NULL on hard delete only, and we're soft-deleting.
  const { error: primaryNullError } = await supabase
    .from('inspection_areas')
    .update({ primary_photo_id: null })
    .eq('primary_photo_id', photoId)

  if (primaryNullError) {
    throw new Error(`Failed to clear primary_photo_id refs: ${primaryNullError.message}`)
  }

  const { error: softDeleteError } = await supabase
    .from('photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId)
    .is('deleted_at', null)

  if (softDeleteError) {
    throw new Error(`Failed to soft-delete photo: ${softDeleteError.message}`)
  }

  // Domain history. Non-blocking — never throws.
  if (photo.inspection_id) {
    await recordPhotoHistory({
      photo_id: photoId,
      inspection_id: photo.inspection_id,
      action: 'deleted',
      before: {
        photo_type: photo.photo_type,
        area_id: photo.area_id ?? null,
        subfloor_id: photo.subfloor_id ?? null,
        caption: photo.caption ?? null,
        photo_category: photo.photo_category ?? null,
        job_completion_id: photo.job_completion_id ?? null,
      },
      after: null,
    })
  }
}

/**
 * Load all photos for an inspection
 * @param inspectionId The inspection ID
 * @returns Promise with array of photos with signed URLs
 */
export async function loadInspectionPhotos(
  inspectionId: string
): Promise<Array<{
  id: string
  area_id: string | null
  subfloor_id: string | null
  moisture_reading_id: string | null
  photo_type: string
  storage_path: string
  file_name: string
  caption: string | null
  order_index: number
  signed_url: string
  created_at: string
}>> {
  // 1. Get photo metadata. Stage 4.3: filter soft-deleted rows.
  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .eq('inspection_id', inspectionId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to load photos: ${error.message}`)
  }

  if (!photos || photos.length === 0) {
    return []
  }

  // 2. Get signed URLs for all photos
  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      try {
        const signed_url = await getPhotoSignedUrl(photo.storage_path)
        return {
          ...photo,
          signed_url
        }
      } catch (error) {
        console.error(`Failed to get URL for photo ${photo.id}:`, error)
        return {
          ...photo,
          signed_url: '' // Fallback to empty string if URL generation fails
        }
      }
    })
  )

  return photosWithUrls
}
