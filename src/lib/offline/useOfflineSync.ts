import { useState, useEffect, useCallback, useRef } from 'react';
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
      if (result.errors.length > 0) {
        setLastSyncError(result.errors[0]);
        setSyncState('error');
      }
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Sync failed');
      setSyncState('error');
    }

    await refreshCounts();
  }, [isOnline, refreshCounts]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
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
