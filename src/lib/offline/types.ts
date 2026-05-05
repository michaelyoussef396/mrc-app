export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface InspectionDraft {
  id: string; // client-generated UUID
  leadId: string;
  status: SyncStatus;
  formData: Record<string, unknown>; // all text/structured inspection data
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  syncedAt?: string; // ISO timestamp of last successful sync
  remoteInspectionId?: string; // Supabase inspection ID once synced
  errorMessage?: string;
}

export interface QueuedPhoto {
  id: string; // client-generated UUID
  inspectionDraftId: string; // FK to InspectionDraft.id
  status: SyncStatus;
  blob: Blob; // resized JPEG blob
  originalFileName: string;
  photoType: 'area' | 'subfloor' | 'general' | 'outdoor';
  areaId?: string;
  subfloorId?: string;
  /**
   * Required since Stage 4.1. Validated at enqueue (queuePhotoOffline) and
   * re-validated at dequeue (Stage 4.1.5 routes invalid rows to quarantine
   * rather than silently uploading with NULL).
   */
  caption: string;
  orderIndex: number;
  createdAt: string;
  syncedAt?: string;
  remotePhotoId?: string;
  errorMessage?: string;
}

export interface SyncLogEntry {
  id: string;
  entityType: 'inspection' | 'photo';
  entityId: string;
  action: 'create' | 'update';
  syncedAt: string;
  remoteId: string;
}

export type OverallSyncState = 'synced' | 'pending' | 'offline' | 'syncing' | 'error';
