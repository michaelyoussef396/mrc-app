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
    console.log('🔄 [useSessionRefresh] Initializing session refresh monitor');

    // Check session every 5 minutes
    const interval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ [useSessionRefresh] Session check failed:', error);
        return;
      }

      if (!session) {
        console.log('⚠️ [useSessionRefresh] No active session');
        return;
      }

      // Check if token expires in less than 10 minutes
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt! - now;

      if (timeUntilExpiry < 600) {
        // Less than 10 minutes until expiry
        console.log('🔄 [useSessionRefresh] Token expiring soon, refreshing...');
        console.log(`⏰ [useSessionRefresh] Time until expiry: ${Math.floor(timeUntilExpiry / 60)} minutes`);

        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('❌ [useSessionRefresh] Failed to refresh session:', refreshError);
        } else {
          console.log('✅ [useSessionRefresh] Session refreshed successfully');
        }
      } else {
        console.log(`✅ [useSessionRefresh] Session healthy (${Math.floor(timeUntilExpiry / 60)} minutes remaining)`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup on unmount
    return () => {
      console.log('🛑 [useSessionRefresh] Cleaning up session refresh monitor');
      clearInterval(interval);
    };
  }, []);
}
