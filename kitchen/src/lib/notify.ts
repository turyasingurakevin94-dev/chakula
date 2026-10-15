import { requireOptionalNativeModule } from 'expo';
import { AppState, Platform, Vibration } from 'react-native';

// The one place that talks to expo-notifications. Nothing else may import it.
//
// The kitchen APK that is already installed was built without the expo-notifications native code,
// and over-the-air updates for runtime 1.0.0 run this JavaScript on it. So the module is required
// lazily, only after checking its native half exists, inside try/catch. When it is missing (old
// APK, web, or anything else goes wrong) every alert still shows inside the app and the phone
// vibrates, and nothing throws.

type Native = typeof import('expo-notifications');

let native: Native | null | undefined;

function load(): Native | null {
  if (native !== undefined) return native;
  native = null;
  if (Platform.OS === 'web') return native;
  try {
    // Check first so we never even evaluate the package on a build without it.
    if (!requireOptionalNativeModule('ExpoNotificationPresenter') || !requireOptionalNativeModule('ExpoNotificationScheduler') || !requireOptionalNativeModule('ExpoNotificationsHandlerModule')) return native;
    // A lazy require on purpose: an import would load the package on builds without its native code.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    native = require('expo-notifications') as Native;
  } catch {
    native = null;
  }
  return native;
}

// ---------------------------------------------------------------------------------------------
// What an alert is

export type AlertKind = 'newOrder' | 'notSeen' | 'riderSoon' | 'runningOver' | 'swap' | 'morning' | 'payout' | 'bell';

// bell: loud, rings through silent (new order, didn't print). soft: a chime. daily: the two reminders.
type Channel = 'bell' | 'soft' | 'daily';

const CHANNEL: Record<AlertKind, Channel> = {
  newOrder: 'bell',
  notSeen: 'bell',
  bell: 'bell',
  riderSoon: 'soft',
  runningOver: 'soft',
  swap: 'soft',
  morning: 'daily',
  payout: 'daily',
};

export type Alert = {
  kind: AlertKind;
  title: string;
  body: string;
  // Where a tap goes, e.g. "/order/4826".
  url?: string;
};

export type InAppAlert = Alert & { id: number; at: number; loud: boolean };

// ---------------------------------------------------------------------------------------------
// In-app alerts: always shown while the app is open, and the whole story when there is no native module.

const listeners = new Set<(a: InAppAlert) => void>();
let nextId = 1;

export function onInAppAlert(listener: (a: InAppAlert) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function showInApp(alert: Alert) {
  const a: InAppAlert = { ...alert, id: nextId++, at: Date.now(), loud: CHANNEL[alert.kind] === 'bell' };
  listeners.forEach((l) => l(a));
}

function buzz(loud: boolean) {
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate(loud ? [0, 600, 250, 600, 250, 600] : [0, 250]);
  } catch {
    // No vibrator, or no permission: the banner is enough.
  }
}

// ---------------------------------------------------------------------------------------------
// Setup

export type NotifyStatus = 'native' | 'denied' | 'in-app';

let ready: Promise<NotifyStatus> | null = null;
let status: NotifyStatus = 'in-app';

export function notifyStatus() {
  return status;
}

// Safe to call many times; the work happens once.
export function setupNotifications(): Promise<NotifyStatus> {
  if (!ready) ready = doSetup().then((s) => (status = s));
  return ready;
}

async function doSetup(): Promise<NotifyStatus> {
  const N = load();
  if (!N) return 'in-app';
  try {
    N.setNotificationHandler({
      handleNotification: async (n) => {
        const kind = n.request.content.data?.kind;
        const open = AppState.currentState === 'active';
        // With the app open the screen already shows it (Just in card, full-screen ticket, banner),
        // so only the sound comes from the system. Reminders are quiet and in-app while open.
        const quiet = open && (kind === 'morning' || kind === 'payout');
        return { shouldShowBanner: !open, shouldShowList: true, shouldPlaySound: !quiet, shouldSetBadge: false };
      },
    });

    if (Platform.OS === 'android') {
      // Channels must exist before Android 13+ will show the permission prompt. A channel's sound and
      // importance can't change once created, so these ids are final.
      await N.setNotificationChannelAsync('bell', {
        name: 'Kitchen bell',
        description: 'New orders and tickets nobody has seen. Loud, even on silent.',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 250, 600, 250, 600],
        enableVibrate: true,
        bypassDnd: true,
        lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
      });
      await N.setNotificationChannelAsync('soft', {
        name: 'Kitchen chime',
        description: 'Riders arriving, tickets running over, swaps.',
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
      });
      await N.setNotificationChannelAsync('daily', {
        name: 'Prep list and payout',
        description: 'The 8 am prep list and the nightly payout.',
        importance: N.AndroidImportance.DEFAULT,
      });
    }

    const current = await N.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) granted = (await N.requestPermissionsAsync()).granted;
    return granted ? 'native' : 'denied';
  } catch {
    return 'in-app';
  }
}

// ---------------------------------------------------------------------------------------------
// Ringing

function content(N: Native, alert: Alert, sticky = false) {
  const loud = CHANNEL[alert.kind] === 'bell';
  return {
    title: alert.title,
    body: alert.body,
    data: { kind: alert.kind, url: alert.url ?? '' },
    sound: true,
    priority: loud ? N.AndroidNotificationPriority.MAX : N.AndroidNotificationPriority.HIGH,
    vibrate: loud ? [0, 600, 250, 600, 250, 600] : [0, 250],
    sticky,
  };
}

// Sound the alert now: on the lock screen through the system when we can, and in the app while it's open.
export function ring(alert: Alert) {
  const N = status === 'native' ? load() : null;
  const open = AppState.currentState === 'active';
  if (N) {
    N.scheduleNotificationAsync({ content: content(N, alert), trigger: { channelId: CHANNEL[alert.kind] } }).catch(() => {
      buzz(CHANNEL[alert.kind] === 'bell');
    });
  } else {
    buzz(CHANNEL[alert.kind] === 'bell');
  }
  if (open || !N) showInApp(alert);
}

// "Rings until someone taps": a repeating system alert that keeps going even if the app is in the
// background, cancelled with stopRepeating. Resolves true only once the system has it; otherwise the
// caller keeps repeating ring() itself.
export async function startRepeating(key: string, alert: Alert): Promise<boolean> {
  const N = status === 'native' ? load() : null;
  if (!N) return false;
  try {
    await N.scheduleNotificationAsync({
      identifier: `repeat-${key}`,
      content: content(N, alert, true),
      // iOS won't repeat more often than once a minute.
      trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Platform.OS === 'ios' ? 60 : 30, repeats: true, channelId: CHANNEL[alert.kind] },
    });
    return true;
  } catch {
    return false;
  }
}

export function stopRepeating(key: string) {
  const N = load();
  if (!N) return;
  N.cancelScheduledNotificationAsync(`repeat-${key}`).catch(() => {});
  N.dismissNotificationAsync(`repeat-${key}`).catch(() => {});
}

// ---------------------------------------------------------------------------------------------
// Daily reminders

export type Daily = Alert & { hour: number; minute: number };

// Replaces both reminders with the ones passed in (an empty list turns them off).
export async function scheduleDaily(reminders: Daily[]) {
  const N = status === 'native' ? load() : null;
  if (!N) return;
  try {
    for (const id of ['daily-morning', 'daily-payout']) await N.cancelScheduledNotificationAsync(id).catch(() => {});
    for (const r of reminders) {
      await N.scheduleNotificationAsync({
        identifier: `daily-${r.kind}`,
        content: content(N, r),
        trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL[r.kind] },
      });
    }
  } catch {
    // Keep running without them; the in-app check below still covers an open app.
  }
}

// Show something in the app only (used for reminders the system already delivered or can't deliver).
export function showInAppOnly(alert: Alert) {
  showInApp(alert);
}

// ---------------------------------------------------------------------------------------------
// Taps on a notification, and reminders arriving while the app is open

export function listen(handlers: { onTap: (url: string) => void; onReceived: (alert: Alert) => void }) {
  const N = load();
  if (!N) return () => {};
  const subs: { remove: () => void }[] = [];
  const read = (data: Record<string, unknown> | undefined): Alert | null => {
    const kind = data?.kind;
    if (typeof kind !== 'string' || !(kind in CHANNEL)) return null;
    return { kind: kind as AlertKind, title: '', body: '', url: typeof data?.url === 'string' && data.url ? data.url : undefined };
  };
  try {
    subs.push(
      N.addNotificationResponseReceivedListener((r) => {
        if (r.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER) return;
        const a = read(r.notification.request.content.data);
        if (a?.url) handlers.onTap(a.url);
      }),
    );
    subs.push(
      N.addNotificationReceivedListener((n) => {
        const a = read(n.request.content.data);
        if (a) handlers.onReceived({ ...a, title: n.request.content.title ?? '', body: n.request.content.body ?? '' });
      }),
    );
    // Opened from a notification while the app was closed.
    const last = N.getLastNotificationResponse();
    if (last && last.actionIdentifier === N.DEFAULT_ACTION_IDENTIFIER) {
      const a = read(last.notification.request.content.data);
      N.clearLastNotificationResponseAsync?.().catch(() => {});
      if (a?.url) setTimeout(() => handlers.onTap(a.url!), 0);
    }
  } catch {
    // Listeners are a nicety; the app works without them.
  }
  return () => subs.forEach((s) => s.remove());
}
