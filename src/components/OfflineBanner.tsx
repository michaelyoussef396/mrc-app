import { useState, useEffect } from "react";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const { pendingCount, syncState } = useOfflineSync();

  useEffect(() => {
    const handleOffline = () => { setIsOffline(true); setDismissed(false); };
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  const message = syncState === 'syncing'
    ? 'Syncing your changes...'
    : pendingCount > 0
      ? `You're offline. ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending.`
      : "You're offline. Changes will be saved when you reconnect.";

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="material-symbols-outlined text-lg">wifi_off</span>
        {message}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex items-center justify-center rounded-full"
        style={{ minWidth: "48px", minHeight: "48px" }}
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
