import Dexie, { type Table } from 'dexie';
import type { InspectionDraft, QueuedPhoto, QuarantinedPhoto, SyncLogEntry } from './types';

class MrcOfflineDb extends Dexie {
  inspectionDrafts!: Table<InspectionDraft, string>;
  photoQueue!: Table<QueuedPhoto, string>;
  quarantinedPhotos!: Table<QuarantinedPhoto, string>;
  syncLog!: Table<SyncLogEntry, string>;

  constructor() {
    super('mrc-offline');
    this.version(1).stores({
      inspectionDrafts: 'id, leadId, status, updatedAt',
      photoQueue: 'id, inspectionDraftId, status, createdAt',
      syncLog: 'id, entityType, entityId, syncedAt',
    });
    // Stage 4.1.5: quarantine photos that fail the caption gate at dequeue
    // so they never reach photos.caption = NULL.
    this.version(2).stores({
      inspectionDrafts: 'id, leadId, status, updatedAt',
      photoQueue: 'id, inspectionDraftId, status, createdAt',
      quarantinedPhotos: 'id, inspectionDraftId, reason, quarantinedAt',
      syncLog: 'id, entityType, entityId, syncedAt',
    });
  }
}

export const offlineDb = new MrcOfflineDb();
