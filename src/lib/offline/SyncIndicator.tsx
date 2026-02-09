import { useOfflineSync } from './useOfflineSync';
import type { OverallSyncState } from './types';

const stateConfig: Record<OverallSyncState, { color: string; label: string; bgColor: string }> = {
  synced: { color: '#34C759', label: 'Synced', bgColor: 'rgba(52, 199, 89, 0.15)' },
  pending: { color: '#FF9500', label: 'Pending', bgColor: 'rgba(255, 149, 0, 0.15)' },
  syncing: { color: '#007AFF', label: 'Syncing', bgColor: 'rgba(0, 122, 255, 0.15)' },
  offline: { color: '#FF3B30', label: 'Offline', bgColor: 'rgba(255, 59, 48, 0.15)' },
  error: { color: '#FF3B30', label: 'Sync Error', bgColor: 'rgba(255, 59, 48, 0.15)' },
};

export function SyncIndicator() {
  const { syncState, pendingCount, syncNow } = useOfflineSync();

  // Don't show when everything is synced and online
  if (syncState === 'synced' && pendingCount === 0) return null;

  const config = stateConfig[syncState];

  return (
    <button
      onClick={syncState === 'pending' || syncState === 'error' ? () => syncNow() : undefined}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        cursor: syncState === 'pending' || syncState === 'error' ? 'pointer' : 'default',
        minHeight: '28px',
      }}
    >
      {/* Status dot */}
      <span
        className={`w-2 h-2 rounded-full ${syncState === 'syncing' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: config.color }}
      />

      {/* Label */}
      <span>{config.label}</span>

      {/* Count badge */}
      {pendingCount > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white px-1"
          style={{ backgroundColor: config.color }}
        >
          {pendingCount}
        </span>
      )}
    </button>
  );
}
