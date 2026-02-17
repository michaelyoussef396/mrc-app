import { offlineDb } from './db';
import type { InspectionDraft, QueuedPhoto, SyncLogEntry, SyncStatus } from './types';
import { supabase } from '@/integrations/supabase/client';

const MAX_RETRIES = 3;

/**
 * SyncManager orchestrates the text-first sync pattern:
 * 1. Save inspection text data to IndexedDB immediately
 * 2. Queue photos separately
 * 3. When online: sync text first → get remote inspection_id → upload photos
 */
export class SyncManager {
  private syncing = false;

  /**
   * Save or update an inspection draft to IndexedDB
   */
  async saveDraft(draft: Omit<InspectionDraft, 'createdAt' | 'updatedAt' | 'status'>): Promise<InspectionDraft> {
    const now = new Date().toISOString();
    const existing = await offlineDb.inspectionDrafts.get(draft.id);

    const record: InspectionDraft = {
      ...draft,
      status: 'pending',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await offlineDb.inspectionDrafts.put(record);
    return record;
  }

  /**
   * Queue a photo for upload (already resized)
   */
  async queuePhoto(photo: Omit<QueuedPhoto, 'createdAt' | 'status'>): Promise<QueuedPhoto> {
    const record: QueuedPhoto = {
      ...photo,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await offlineDb.photoQueue.put(record);
    return record;
  }

  /**
   * Get all pending drafts
   */
  async getPendingDrafts(): Promise<InspectionDraft[]> {
    return offlineDb.inspectionDrafts
      .where('status')
      .anyOf(['pending', 'error'])
      .toArray();
  }

  /**
   * Get all pending photos for a draft
   */
  async getPendingPhotos(draftId: string): Promise<QueuedPhoto[]> {
    return offlineDb.photoQueue
      .where('inspectionDraftId')
      .equals(draftId)
      .filter(p => p.status === 'pending' || p.status === 'error')
      .toArray();
  }

  /**
   * Get counts of pending items
   */
  async getPendingCounts(): Promise<{ drafts: number; photos: number }> {
    const drafts = await offlineDb.inspectionDrafts
      .where('status')
      .anyOf(['pending', 'error'])
      .count();
    const photos = await offlineDb.photoQueue
      .where('status')
      .anyOf(['pending', 'error'])
      .count();
    return { drafts, photos };
  }

  /**
   * Get a specific draft by ID
   */
  async getDraft(id: string): Promise<InspectionDraft | undefined> {
    return offlineDb.inspectionDrafts.get(id);
  }

  /**
   * Get a specific draft by lead ID
   */
  async getDraftByLeadId(leadId: string): Promise<InspectionDraft | undefined> {
    return offlineDb.inspectionDrafts
      .where('leadId')
      .equals(leadId)
      .first();
  }

  /**
   * Sync all pending items to Supabase.
   * Text-first pattern: sync inspection text → then photos.
   */
  async syncAll(): Promise<{ syncedDrafts: number; syncedPhotos: number; errors: string[] }> {
    if (this.syncing) {
      return { syncedDrafts: 0, syncedPhotos: 0, errors: [] };
    }

    if (!navigator.onLine) {
      return { syncedDrafts: 0, syncedPhotos: 0, errors: ['Device is offline'] };
    }

    this.syncing = true;
    let syncedDrafts = 0;
    let syncedPhotos = 0;
    const errors: string[] = [];

    try {
      const pendingDrafts = await this.getPendingDrafts();

      for (const draft of pendingDrafts) {
        try {
          // Step 1: Sync text data
          await this.syncDraft(draft);
          syncedDrafts++;

          // Step 2: Sync photos for this draft
          const photos = await this.getPendingPhotos(draft.id);
          for (const photo of photos) {
            try {
              await this.syncPhoto(photo, draft);
              syncedPhotos++;
            } catch (err) {
              const msg = `Photo sync failed (${photo.id}): ${err instanceof Error ? err.message : 'Unknown error'}`;
              console.error('[SyncManager]', msg);
              errors.push(msg);
              await offlineDb.photoQueue.update(photo.id, {
                status: 'error' as SyncStatus,
                errorMessage: msg,
              });
            }
          }
        } catch (err) {
          const msg = `Draft sync failed (${draft.id}): ${err instanceof Error ? err.message : 'Unknown error'}`;
          console.error('[SyncManager]', msg);
          errors.push(msg);
          await offlineDb.inspectionDrafts.update(draft.id, {
            status: 'error' as SyncStatus,
            errorMessage: msg,
          });
        }
      }
    } finally {
      this.syncing = false;
    }

    return { syncedDrafts, syncedPhotos, errors };
  }

  /**
   * Sync a single inspection draft text data to Supabase.
   * Maps formData keys to actual inspections table columns.
   */
  private async syncDraft(draft: InspectionDraft): Promise<void> {
    await offlineDb.inspectionDrafts.update(draft.id, { status: 'syncing' as SyncStatus });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Build column data from formData - only include keys that match actual DB columns
    const dbPayload: Record<string, unknown> = {
      lead_id: draft.leadId,
      inspector_id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Map formData to actual DB columns (snake_case columns on the inspections table)
    for (const [key, value] of Object.entries(draft.formData)) {
      if (value !== undefined) {
        dbPayload[key] = value;
      }
    }

    if (draft.remoteInspectionId) {
      // Update existing inspection - remove lead_id and inspector_id from update
      const { lead_id: _l, inspector_id: _i, ...updatePayload } = dbPayload;
      const { error } = await supabase
        .from('inspections')
        .update(updatePayload)
        .eq('id', draft.remoteInspectionId);

      if (error) throw error;
    } else {
      // Create new inspection
      const { data, error } = await supabase
        .from('inspections')
        .insert(dbPayload)
        .select('id')
        .single();

      if (error) throw error;

      draft.remoteInspectionId = data.id;
    }

    const now = new Date().toISOString();
    await offlineDb.inspectionDrafts.update(draft.id, {
      status: 'synced' as SyncStatus,
      syncedAt: now,
      remoteInspectionId: draft.remoteInspectionId,
    });

    // Log sync
    await offlineDb.syncLog.put({
      id: crypto.randomUUID(),
      entityType: 'inspection',
      entityId: draft.id,
      action: draft.remoteInspectionId ? 'update' : 'create',
      syncedAt: now,
      remoteId: draft.remoteInspectionId!,
    });
  }

  /**
   * Sync a single photo to Supabase Storage
   */
  private async syncPhoto(photo: QueuedPhoto, draft: InspectionDraft): Promise<void> {
    if (!draft.remoteInspectionId) {
      throw new Error('Cannot sync photo: draft has no remote inspection ID');
    }

    await offlineDb.photoQueue.update(photo.id, { status: 'syncing' as SyncStatus });

    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const filename = `${photo.photoType}-${timestamp}-${uniqueId}.jpg`;

    let storagePath: string;
    if (photo.areaId) {
      storagePath = `${draft.remoteInspectionId}/${photo.areaId}/${filename}`;
    } else if (photo.subfloorId) {
      storagePath = `${draft.remoteInspectionId}/subfloor/${filename}`;
    } else {
      storagePath = `${draft.remoteInspectionId}/${filename}`;
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inspection-photos')
      .upload(storagePath, photo.blob, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get current user for tracking
    const { data: { user } } = await supabase.auth.getUser();

    // Save photo metadata
    const { data: photoData, error: photoError } = await supabase
      .from('photos')
      .insert({
        inspection_id: draft.remoteInspectionId,
        area_id: photo.areaId || null,
        subfloor_id: photo.subfloorId || null,
        photo_type: photo.photoType,
        storage_path: uploadData.path,
        file_name: filename,
        file_size: photo.blob.size,
        mime_type: 'image/jpeg',
        caption: photo.caption || null,
        order_index: photo.orderIndex,
        uploaded_by: user?.id || null,
      })
      .select('id')
      .single();

    if (photoError) {
      // Clean up uploaded file
      await supabase.storage.from('inspection-photos').remove([uploadData.path]);
      throw photoError;
    }

    const now = new Date().toISOString();
    await offlineDb.photoQueue.update(photo.id, {
      status: 'synced' as SyncStatus,
      syncedAt: now,
      remotePhotoId: photoData.id,
    });

    await offlineDb.syncLog.put({
      id: crypto.randomUUID(),
      entityType: 'photo',
      entityId: photo.id,
      action: 'create',
      syncedAt: now,
      remoteId: photoData.id,
    });
  }

  /**
   * Delete a draft and its queued photos from IndexedDB
   */
  async deleteDraft(draftId: string): Promise<void> {
    await offlineDb.photoQueue
      .where('inspectionDraftId')
      .equals(draftId)
      .delete();
    await offlineDb.inspectionDrafts.delete(draftId);
  }
}

// Singleton instance
export const syncManager = new SyncManager();
