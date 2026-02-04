import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to ensure session stays alive and refreshes automatically
 * Prevents session timeout issues by proactively refreshing tokens
 *
 * Usage: Add `useSessionRefresh()` to your App.tsx root component
 */
export function useSessionRefresh() {
  useEffect(() => {
    // SOFT LAUNCH: Removed console noise, keeping only error logs

    // Check session every 5 minutes
    const interval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ [useSessionRefresh] Session check failed:', error);
        return;
      }

      if (!session) {
        // No session is fine - user might be logged out
        return;
      }

      // Check if token expires in less than 10 minutes
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt! - now;

      if (timeUntilExpiry < 600) {
        // Less than 10 minutes until expiry - refresh silently
        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('❌ [useSessionRefresh] Failed to refresh session:', refreshError);
        }
      }
      // SOFT LAUNCH: Removed "session healthy" log that ran every 5 minutes
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
}
