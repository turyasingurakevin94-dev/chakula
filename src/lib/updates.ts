import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

// By default a new update only shows on the launch after it downloads. Check on open and when the
// app comes back to the front. A restart wipes what the student is doing, so restart straight away
// only if the update arrives within a few seconds of opening; otherwise wait until the app has been
// in the background and comes back.
const RELOAD_WINDOW_MS = 4000;
// How long the app must have been in the background for a return to count.
const AWAY_MS = 15000;

export function useApplyUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const openedAt = Date.now();
    let busy = false;
    let ready = false;
    // Counted from opening, or from the latest return to the app.
    let since = openedAt;
    const soon = () => Date.now() - since < RELOAD_WINDOW_MS && AppState.currentState === 'active';
    const check = async (resumed: boolean) => {
      if (resumed) since = Date.now();
      if (ready) {
        if (resumed) await Updates.reloadAsync().catch(() => {});
        return;
      }
      if (busy) return;
      busy = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        // A roll back to the built-in code (after a bad update) is applied the same way.
        if (result.isAvailable || result.isRollBackToEmbedded) {
          const fetched = await Updates.fetchUpdateAsync();
          if (fetched.isNew || fetched.isRollBackToEmbedded) {
            ready = true;
            if (soon()) await Updates.reloadAsync();
          }
        }
      } catch {
        // Offline or the update server is unreachable: keep running the current version.
      } finally {
        busy = false;
      }
    };
    check(false);
    let last = AppState.currentState;
    let leftAt = 0;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && last !== 'background') leftAt = Date.now();
      // System dialogs (like the "Allow notifications" prompt) briefly send the app to the background.
      // Restarting then would wipe what the student is doing, so only count a real trip away.
      if (state === 'active' && last === 'background' && Date.now() - leftAt >= AWAY_MS) check(true);
      last = state;
    });
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
