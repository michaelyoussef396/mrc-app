import { useState, useEffect, useRef } from "react";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";
import { WifiOff, X } from 'lucide-react';

// iOS Safari often fails to fire the window 'online'/'offline' events when
// airplane mode toggles, so event-only detection can leave the banner hidden
// while genuinely offline. Poll navigator.onLine as a fallback, and re-check
// on focus/visibilitychange because techs background the app between rooms.
const CONNECTIVITY_POLL_MS = 3000;

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const { pendingCount, syncState } = useOfflineSync();
  const wasOfflineRef = useRef(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => {
      // Reset dismissal only on the online→offline transition so a dismissed
      // banner stays dismissed for the rest of the same offline spell (the
      // poll re-fires goOffline every few seconds while offline).
      if (!wasOfflineRef.current) setDismissed(false);
      wasOfflineRef.current = true;
      setIsOffline(true);
    };
    const goOnline = () => {
      wasOfflineRef.current = false;
      setIsOffline(false);
    };
    const checkNow = () => (navigator.onLine ? goOnline() : goOffline());

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    window.addEventListener("focus", checkNow);
    document.addEventListener("visibilitychange", checkNow);
    const pollId = window.setInterval(checkNow, CONNECTIVITY_POLL_MS);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("focus", checkNow);
      document.removeEventListener("visibilitychange", checkNow);
      window.clearInterval(pollId);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  const message = syncState === 'syncing'
    ? 'Syncing your changes...'
    : pendingCount > 0
      ? `You're offline. ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending.`
      : "You're offline — new changes stay on this device until you're back online.";

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium">
        <WifiOff className="h-5 w-5 shrink-0" />
        {message}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ minWidth: "48px", minHeight: "48px" }}
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
