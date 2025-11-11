import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionInfo {
  hasSession: boolean;
  email?: string;
  expiresAt?: Date;
  timeUntilExpiry?: string;
}

/**
 * Development-only component to monitor session health
 * Shows session status, token expiry, and remaining time in bottom-right corner
 *
 * Only renders in development mode (import.meta.env.DEV)
 */
export function SessionMonitor() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    hasSession: false,
  });

  useEffect(() => {
    // Only show in development
    if (!import.meta.env.DEV) return;

    console.log('🔍 [SessionMonitor] Initializing...');

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const expiresAt = new Date(session.expires_at! * 1000);
        const now = new Date();
        const msUntilExpiry = expiresAt.getTime() - now.getTime();
        const minUntilExpiry = Math.floor(msUntilExpiry / 1000 / 60);

        setSessionInfo({
          hasSession: true,
          email: session.user.email,
          expiresAt,
          timeUntilExpiry:
            minUntilExpiry > 60
              ? `${Math.floor(minUntilExpiry / 60)}h ${minUntilExpiry % 60}m`
              : `${minUntilExpiry}m`,
        });
      } else {
        setSessionInfo({ hasSession: false });
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  // Only render in development
  if (!import.meta.env.DEV) return null;

  return (
    <div
      className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white text-xs p-3 rounded-lg shadow-2xl max-w-xs z-50 font-mono border border-gray-700"
      style={{
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="font-bold mb-2 flex items-center gap-2">
        <span>🔐</span>
        <span>Session Monitor</span>
      </div>
      {sessionInfo.hasSession ? (
        <>
          <div className="text-green-400 mb-2 flex items-center gap-2">
            <span>✅</span>
            <span className="font-semibold">Active Session</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex items-start gap-2">
              <span className="opacity-70">👤</span>
              <span className="break-all">{sessionInfo.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-70">⏰</span>
              <span>{sessionInfo.expiresAt?.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-70">⏳</span>
              <span className="font-semibold text-green-400">{sessionInfo.timeUntilExpiry}</span>
              <span className="opacity-70">left</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-red-400 flex items-center gap-2">
          <span>❌</span>
          <span className="font-semibold">No Active Session</span>
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-500 text-[10px]">
        Dev mode only • Updates every 30s
      </div>
    </div>
  );
}
