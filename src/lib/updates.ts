import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

// By default a new update only shows on the launch after it downloads. Check on open and when the
// app comes back to the front, and restart straight into the new version when there is one.
export function useApplyUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync();
          if (fetched.isNew) await Updates.reloadAsync();
        }
      } catch {
        // Offline or the update server is unreachable: keep running the current version.
      } finally {
        busy = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, []);
}

// Shown at the bottom of Profile so we can tell which version a phone is running.
export function versionLabel() {
  const parts = [`Version ${Updates.runtimeVersion || '1.0.0'}`];
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) parts.push('built-in code');
  else parts.push(`update of ${Updates.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`);
  if (Updates.isEmergencyLaunch) parts.push('recovered from a failed update');
  return parts.join(' · ');
}
