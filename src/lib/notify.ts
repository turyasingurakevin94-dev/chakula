import { Platform } from 'react-native';

// The one place that talks to expo-notifications. Everything else goes through `notify`.
//
// The module is loaded lazily, inside try/catch: APKs built before it was added don't contain its
// native code, and OTA updates still run this JavaScript on them. There, and on web, `available`
// is false, every call quietly does nothing, and the app shows its in-app banner instead.

type Notifications = typeof import('expo-notifications');
type NotificationResponse = import('expo-notifications').NotificationResponse;

let mod: Notifications | null | undefined;

function load(): Notifications | null {
  if (mod !== undefined) return mod;
  mod = null;
  if (Platform.OS === 'web') return mod;
  try {
    // A plain require, so a missing native module throws here, inside the try, and not at app start.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-notifications') as Notifications;
  } catch {
    mod = null;
  }
  return mod;
}

// Android channels. Order alerts ring; order updates are silent and replace the last one; reminders are normal.
export type Channel = 'orders' | 'updates' | 'reminders';

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'blocked' | 'unavailable';

export type Alert = {
  // Same id, same notification: a newer one replaces the older one in the tray.
  id: string;
  title: string;
  body: string;
  channel: Channel;
  // Screen to open when it is tapped.
  href?: string;
  // Feather icon name for the in-app banner.
  icon?: string;
};

export type AlertHandlers = {
  // A notification arrived while the app is open. It is shown as the in-app banner, not by the system.
  onForeground: (alert: { title: string; body: string; href?: string; icon?: string; quiet: boolean }) => void;
  // The student tapped a notification.
  onOpen: (href: string) => void;
};

let channelsReady: Promise<void> | null = null;

function ensureChannels(N: Notifications) {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelsReady ??= Promise.all([
    N.setNotificationChannelAsync('orders', {
      name: 'Order alerts',
      description: 'Two per order: picked up, and at your gate.',
      importance: N.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#FF6B35',
    }),
    N.setNotificationChannelAsync('updates', {
      name: 'Order updates',
      description: 'Quiet updates while your food is cooking.',
      importance: N.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
    }),
    N.setNotificationChannelAsync('reminders', {
      name: 'Meal plan and specials',
      description: 'Meal choice reminders, and the Friday special if you turned it on.',
      importance: N.AndroidImportance.DEFAULT,
    }),
  ])
    .then(() => undefined)
    .catch(() => undefined);
  return channelsReady;
}

function content(a: Alert) {
  return {
    title: a.title,
    body: a.body,
    data: { href: a.href ?? '', icon: a.icon ?? '', quiet: a.channel === 'updates' },
    // iOS has no channels: only order alerts and reminders make a sound.
    sound: a.channel === 'updates' ? false : 'default',
  } as const;
}

async function safely<T>(fallback: T, run: (N: Notifications) => Promise<T>): Promise<T> {
  const N = load();
  if (!N) return fallback;
  try {
    await ensureChannels(N);
    return await run(N);
  } catch {
    return fallback;
  }
}

export const notify = {
  get available() {
    return !!load();
  },

  // Sets up channels, the foreground handler and taps. Returns a cleanup function.
  init(handlers: AlertHandlers) {
    const N = load();
    if (!N) return () => {};
    let sub: { remove: () => void } | null = null;
    try {
      void ensureChannels(N);
      N.setNotificationHandler({
        handleNotification: async (n) => {
          const c = n.request.content;
          const data = (c.data ?? {}) as { href?: unknown; icon?: unknown; quiet?: unknown };
          const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
          handlers.onForeground({ title: c.title ?? '', body: c.body ?? '', href: text(data.href), icon: text(data.icon), quiet: data.quiet === true });
          // The banner inside the app takes its place, with no second sound.
          return { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
        },
      });
      // A tap is routed once, whether it arrives here or as the response that launched the app.
      let opened = '';
      const open = (response: NotificationResponse) => {
        const key = `${response.notification.request.identifier}:${response.notification.date}`;
        if (key === opened) return;
        opened = key;
        const href = (response.notification.request.content.data ?? {}).href;
        if (typeof href === 'string' && href) handlers.onOpen(href);
      };
      sub = N.addNotificationResponseReceivedListener(open);
      // A tap that launched the app from closed comes before the listener exists: read it, then clear it
      // so it isn't replayed the next time this runs.
      const launch = typeof N.getLastNotificationResponse === 'function' ? N.getLastNotificationResponse() : null;
      if (launch) {
        if (typeof N.clearLastNotificationResponse === 'function') N.clearLastNotificationResponse();
        setTimeout(() => open(launch), 0);
      }
    } catch {
      // Leave the in-app banner to do the work.
    }
    return () => {
      try {
        sub?.remove();
        N.setNotificationHandler(null);
      } catch {}
    };
  },

  permission(): Promise<PermissionState> {
    return safely<PermissionState>('unavailable', async (N) => {
      const p = await N.getPermissionsAsync();
      if (p.granted || p.ios?.status === N.IosAuthorizationStatus.PROVISIONAL) return 'granted';
      if (p.status === 'undetermined') return 'undetermined';
      return p.canAskAgain ? 'denied' : 'blocked';
    });
  },

  // Asks the phone. Resolves true when alerts are allowed.
  requestPermission(): Promise<boolean> {
    return safely(false, async (N) => {
      const p = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
      return p.granted || p.ios?.status === N.IosAuthorizationStatus.PROVISIONAL;
    });
  },

  // Shows a notification now. Resolves false when it could not.
  present(a: Alert): Promise<boolean> {
    return safely(false, async (N) => {
      await N.scheduleNotificationAsync({ identifier: a.id, content: content(a), trigger: Platform.OS === 'android' ? { channelId: a.channel } : null });
      return true;
    });
  },

  // Shows a notification at a time, even if the app is asleep by then.
  scheduleAt(a: Alert, time: number): Promise<boolean> {
    return safely(false, async (N) => {
      await N.scheduleNotificationAsync({ identifier: a.id, content: content(a), trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: time, channelId: a.channel } });
      return true;
    });
  },

  scheduleIn(a: Alert, seconds: number): Promise<boolean> {
    return safely(false, async (N) => {
      await N.scheduleNotificationAsync({ identifier: a.id, content: content(a), trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: a.channel } });
      return true;
    });
  },

  // Every day at hour:minute, local time.
  scheduleDaily(a: Alert, hour: number, minute: number): Promise<boolean> {
    return safely(false, async (N) => {
      await N.scheduleNotificationAsync({ identifier: a.id, content: content(a), trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: a.channel } });
      return true;
    });
  },

  // Every week. Weekdays run 1 (Sunday) to 7 (Saturday).
  scheduleWeekly(a: Alert, weekday: number, hour: number, minute: number): Promise<boolean> {
    return safely(false, async (N) => {
      await N.scheduleNotificationAsync({ identifier: a.id, content: content(a), trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId: a.channel } });
      return true;
    });
  },

  // Stops a scheduled notification from firing.
  cancel(id: string): Promise<void> {
    return safely(undefined, (N) => N.cancelScheduledNotificationAsync(id));
  },

  // Ids of the notifications in the tray now, or null when the phone can't say.
  presentedIds(): Promise<string[] | null> {
    return safely<string[] | null>(null, async (N) => (await N.getPresentedNotificationsAsync()).map((n) => n.request.identifier));
  },

  // Takes a shown notification out of the tray.
  dismiss(id: string): Promise<void> {
    return safely(undefined, (N) => N.dismissNotificationAsync(id));
  },
};
