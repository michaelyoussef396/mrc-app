import Dexie, { type Table } from 'dexie';
import type { InspectionDraft, QueuedPhoto, SyncLogEntry } from './types';

class MrcOfflineDb extends Dexie {
  inspectionDrafts!: Table<InspectionDraft, string>;
  photoQueue!: Table<QueuedPhoto, string>;
  syncLog!: Table<SyncLogEntry, string>;

  constructor() {
    super('mrc-offline');
    this.version(1).stores({
      inspectionDrafts: 'id, leadId, status, updatedAt',
      photoQueue: 'id, inspectionDraftId, status, createdAt',
      syncLog: 'id, entityType, entityId, syncedAt',
    });
  }
}

export const offlineDb = new MrcOfflineDb();
