import { requireOptionalNativeModule } from 'expo';
import { Linking, Platform } from 'react-native';

// The one place the rider app touches expo-notifications. Phones that still run the first APK
// don't have its native module, and OTA updates for runtime 1.0.0 run this code on them, so the
// module is loaded lazily, only after checking the native side is there. Every call is wrapped:
// when the module is missing, or alerts are not allowed, callers get `false` and show the alert
// inside the app instead. Nothing else in the app may import expo-notifications.

type NotificationsModule = typeof import('expo-notifications');
type NotificationResponse = import('expo-notifications').NotificationResponse;

// Android channels. Runs ring loud; pickup heads-ups pop up; reminders are ordinary.
export type AlertChannel = 'runs' | 'pickup' | 'reminders';

export type AlertKind = 'run' | 'pickup' | 'reminder' | 'test';

export type Alert = {
  title: string;
  body: string;
  channel: AlertChannel;
  kind: AlertKind;
  // Opened when the rider taps the alert.
  url?: string;
};

export type AlertPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

let cached: NotificationsModule | null | undefined;

function load(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS === 'web') return cached;
  try {
    // Check the native side before evaluating the JS package, which throws without it.
    if (!requireOptionalNativeModule('ExpoNotificationScheduler') || !requireOptionalNativeModule('ExpoNotificationPermissionsModule')) return cached;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

// True when this build can show system notifications at all (not whether the rider allowed them).
export function canNotify() {
  return load() !== null;
}

let ready: Promise<void> | null = null;

// Channels and the foreground handler. Safe to call many times.
export function setupAlerts() {
  if (ready) return ready;
  ready = (async () => {
    const N = load();
    if (!N) return;
    try {
      N.setNotificationHandler({
        // In the app, runs and pickups already show on screen, so only the sound plays.
        // Reminders and the test alert show as a banner too, so the rider sees the real thing.
        handleNotification: async (n) => {
          const kind = n.request.content.data?.kind;
          return { shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: kind === 'reminder' || kind === 'test', shouldShowList: true };
        },
      });
      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync('runs', {
          name: 'New runs',
          description: 'Loud, so you never miss a run. Plays on silent.',
          importance: N.AndroidImportance.MAX,
          bypassDnd: true,
          lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 600, 250, 600, 250, 600],
          lightColor: '#FF6B35',
          sound: 'default',
        });
        await N.setNotificationChannelAsync('pickup', {
          name: 'Pickup',
          description: 'Leave now, and when your bags are sealed.',
          importance: N.AndroidImportance.HIGH,
          lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 300, 200, 300],
          sound: 'default',
        });
        await N.setNotificationChannelAsync('reminders', {
          name: 'Shift and pay',
          description: 'Shift reminders and tonight’s pay.',
          importance: N.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }
    } catch {
      // Keep going with in-app alerts.
    }
  })();
  return ready;
}

export async function getAlertPermission(): Promise<{ status: AlertPermission; canAskAgain: boolean }> {
  const N = load();
  if (!N) return { status: 'unavailable', canAskAgain: false };
  try {
    const p = await N.getPermissionsAsync();
    return { status: p.granted || p.ios?.status === N.IosAuthorizationStatus.PROVISIONAL ? 'granted' : p.status === 'denied' ? 'denied' : 'undetermined', canAskAgain: p.canAskAgain };
  } catch {
    return { status: 'unavailable', canAskAgain: false };
  }
}

// Asks once; if Android or iOS won't ask again, opens the app's settings instead.
export async function requestAlertPermission(): Promise<AlertPermission> {
  const N = load();
  if (!N) return 'unavailable';
  try {
    await setupAlerts();
    const before = await N.getPermissionsAsync();
    if (before.granted) return 'granted';
    if (!before.canAskAgain) {
      await openAppSettings();
      return 'denied';
    }
    const after = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return after.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

// Whether the loud run channel is still loud (the rider can turn it down in Android settings).
export async function runChannelIsLoud(): Promise<boolean | null> {
  const N = load();
  if (!N || Platform.OS !== 'android') return null;
  try {
    await setupAlerts();
    const ch = await N.getNotificationChannelAsync('runs');
    return ch ? ch.importance >= N.AndroidImportance.HIGH : null;
  } catch {
    return null;
  }
}

function content(a: Alert) {
  return {
    title: a.title,
    body: a.body,
    sound: true,
    data: { kind: a.kind, url: a.url ?? '/' },
    color: '#1B4332',
    priority: a.channel === 'reminders' ? 'default' : 'max',
    // Time-sensitive breaks through Focus on iOS, but still follows the ring/silent switch: playing on
    // silent there needs the critical alerts entitlement, which we don't have.
    interruptionLevel: a.channel === 'reminders' ? ('active' as const) : ('timeSensitive' as const),
  };
}

// Shows a system notification now. Returns false when it couldn't, so the caller shows it in the app.
export async function sendAlert(a: Alert): Promise<boolean> {
  const N = load();
  if (!N) return false;
  try {
    await setupAlerts();
    if (!(await N.getPermissionsAsync()).granted) return false;
    await N.scheduleNotificationAsync({ content: content(a), trigger: Platform.OS === 'android' ? { channelId: a.channel } : null });
    return true;
  } catch {
    return false;
  }
}

// Schedules (or replaces) a reminder by id. Returns false when the phone can't, so the caller
// keeps an in-app timer instead.
export async function scheduleAlert(id: string, at: Date, a: Alert): Promise<boolean> {
  const N = load();
  if (!N) return false;
  try {
    await setupAlerts();
    if (!(await N.getPermissionsAsync()).granted) return false;
    await N.cancelScheduledNotificationAsync(id).catch(() => {});
    if (at.getTime() <= Date.now()) return true;
    await N.scheduleNotificationAsync({
      identifier: id,
      content: content(a),
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: a.channel },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelAlert(id: string) {
  const N = load();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    // Nothing scheduled.
  }
}

// Calls back with the alert's url when the rider taps a notification. Returns the unsubscribe.
export function onAlertTap(cb: (url: string) => void): () => void {
  const N = load();
  if (!N) return () => {};
  try {
    // A tap is routed once, whether it arrives here or as the response that launched the app.
    let opened = '';
    const open = (r: NotificationResponse) => {
      const key = `${r.notification.request.identifier}:${r.notification.date}`;
      if (key === opened) return;
      opened = key;
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string') cb(url);
    };
    const sub = N.addNotificationResponseReceivedListener(open);
    // A tap that launched the app from closed comes before the listener exists: read it, then clear it
    // so it isn't replayed the next time this runs.
    const launch = typeof N.getLastNotificationResponse === 'function' ? N.getLastNotificationResponse() : null;
    if (launch) {
      if (typeof N.clearLastNotificationResponse === 'function') N.clearLastNotificationResponse();
      setTimeout(() => open(launch), 0);
    }
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

export async function openAppSettings() {
  try {
    await Linking.openSettings();
  } catch {
    // Not supported here (web).
  }
}

// Battery saver settings on Android, else the app's settings. Returns false if nothing opened.
export async function openBatterySettings() {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.BATTERY_SAVER_SETTINGS');
      return true;
    }
  } catch {
    // Fall through to the app's settings.
  }
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}
