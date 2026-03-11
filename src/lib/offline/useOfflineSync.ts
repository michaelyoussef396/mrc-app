import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { syncManager } from './SyncManager';
import { useNetworkStatus } from './useNetworkStatus';
import type { OverallSyncState } from './types';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds

interface UseOfflineSyncResult {
  syncState: OverallSyncState;
  pendingCount: number;
  syncNow: () => Promise<void>;
  lastSyncError: string | null;
}

export function useOfflineSync(): UseOfflineSyncResult {
  const isOnline = useNetworkStatus();
  const [syncState, setSyncState] = useState<OverallSyncState>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const wasOfflineRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    try {
      const counts = await syncManager.getPendingCounts();
      const total = counts.drafts + counts.photos;
      setPendingCount(total);

      if (!isOnline) {
        setSyncState('offline');
      } else if (total > 0) {
        setSyncState('pending');
      } else {
        setSyncState('synced');
      }
    } catch {
      // IndexedDB might not be available
    }
  }, [isOnline]);

  const syncNow = useCallback(async () => {
    if (!isOnline) return;

    setSyncState('syncing');
    setLastSyncError(null);

    try {
      const result = await syncManager.syncAll();
      const totalSynced = result.syncedDrafts + result.syncedPhotos;

      if (result.errors.length > 0) {
        setLastSyncError(result.errors[0]);
        setSyncState('error');
        toast.error('Some changes failed to sync. Will retry automatically.');
      } else if (totalSynced > 0) {
        toast.success(`All changes synced (${totalSynced} item${totalSynced > 1 ? 's' : ''})`);
      }
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Sync failed');
      setSyncState('error');
      toast.error('Sync failed. Will retry automatically.');
    }

    await refreshCounts();
  }, [isOnline, refreshCounts]);

  // Track offline→online transitions and show "Back online" toast
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      toast.success('Back online');
    }
  }, [isOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      toast('Syncing your changes...', { duration: 2000 });
      syncNow();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for pending items and auto-sync
  useEffect(() => {
    refreshCounts();

    intervalRef.current = setInterval(async () => {
      await refreshCounts();
      if (isOnline && pendingCount > 0) {
        await syncNow();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  return { syncState, pendingCount, syncNow, lastSyncError };
}
