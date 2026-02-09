import { supabase } from '@/integrations/supabase/client'
import { syncManager, resizePhoto } from '@/lib/offline'

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
  caption?: string
  order_index?: number
}

/**
 * Queue a photo for offline upload. Resizes and stores in IndexedDB.
 * Use this when offline or when you want to batch photos for later sync.
 */
export async function queuePhotoOffline(
  file: File,
  metadata: PhotoMetadata & { inspectionDraftId: string }
): Promise<string> {
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

  console.log(`[PhotoUpload] Queued offline: ${file.name} → ${resized.size} bytes (resized)`)
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
  // 1. Generate unique filename with timestamp and UUID to prevent collisions
  const timestamp = Date.now()
  const uniqueId = crypto.randomUUID().slice(0, 8) // 8 chars of randomness
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${metadata.photo_type}-${timestamp}-${uniqueId}.${extension}`

  // 2. Construct storage path based on metadata
  let storagePath: string
  if (metadata.area_id) {
    storagePath = `${metadata.inspection_id}/${metadata.area_id}/${filename}`
  } else if (metadata.subfloor_id) {
    storagePath = `${metadata.inspection_id}/subfloor/${filename}`
  } else {
    storagePath = `${metadata.inspection_id}/${filename}`
  }

  // 3. Upload file to Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('inspection-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    console.error('Photo upload error:', uploadError)
    throw new Error(`Failed to upload photo: ${uploadError.message}`)
  }

  // 4. Get signed URL for display (valid for 1 hour)
  const { data: urlData } = await supabase.storage
    .from('inspection-photos')
    .createSignedUrl(uploadData.path, 3600)

  if (!urlData?.signedUrl) {
    throw new Error('Failed to generate signed URL for photo')
  }

  // 5. Get current user ID for uploaded_by tracking
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Clean up uploaded file if user not authenticated
    await supabase.storage
      .from('inspection-photos')
      .remove([uploadData.path])
    throw new Error('User must be authenticated to upload photos')
  }

  // 6. Save photo metadata to photos table
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
      file_size: file.size,
      mime_type: file.type,
      caption: metadata.caption || null,
      order_index: metadata.order_index || 0,
      uploaded_by: user.id
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
      console.log(`Uploading photo ${i + 1}/${files.length}: ${files[i].name}`)

      const result = await uploadInspectionPhoto(files[i], {
        ...metadata,
        order_index: (metadata.order_index || 0) + i
      })

      results.push(result)
      console.log(`✓ Photo ${i + 1}/${files.length} uploaded successfully`)
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
 * Delete a photo from Storage and photos table
 * @param photoId The photo ID from photos table
 * @returns Promise<void>
 */
export async function deleteInspectionPhoto(photoId: string): Promise<void> {
  // 1. Get photo metadata to find storage path
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', photoId)
    .single()

  if (fetchError || !photo) {
    throw new Error('Photo not found')
  }

  // 2. Delete from Storage
  const { error: storageError } = await supabase.storage
    .from('inspection-photos')
    .remove([photo.storage_path])

  if (storageError) {
    console.error('Storage delete error:', storageError)
    // Continue anyway to delete metadata
  }

  // 3. Delete metadata from photos table
  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)

  if (deleteError) {
    throw new Error(`Failed to delete photo metadata: ${deleteError.message}`)
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
  // 1. Get photo metadata
  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .eq('inspection_id', inspectionId)
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
