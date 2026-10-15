import { router, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { AlertBanner, type BannerAlert } from '../components/alert-banner';
import type { IconName } from '../components/ui';
import { formatClock, useAccount, useNow, type Order } from './account';
import { findRestaurant, specials } from './data';
import { notify, type Alert, type PermissionState } from './notify';
import { findPlanKind, mealName, mealTimes } from './plans';
import { onServer, registerPush } from './server';
import { arriveBy, blockName, isLoudStage, rider, riderFor, stageOf, stageStartsAt, type Stage } from './stages';

// Alerts while the app is open become a quiet banner at the top. While it is closed they go to the
// phone through `notify`, if the phone can show them. With no backend, order alerts are worked out
// here from the demo timer.

// `orderKey`: the server order a banner is about, so it can be taken down once that order is done.
type Show = (alert: Omit<BannerAlert, 'key'> & { orderKey?: string }) => void;

type AlertsState = {
  // 'checking' until the phone answers.
  permission: PermissionState | 'checking';
  show: Show;
  // Asks the phone. Resolves true when alerts are allowed.
  requestPermission: () => Promise<boolean>;
  sendTest: () => void;
};

const AlertsContext = createContext<AlertsState | null>(null);

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used inside AlertsProvider');
  return ctx;
}

// Meal plan reminder time, and the quiet hours it must stay out of.
const REMINDER = { hour: 13, minute: 30 };
const FRIDAY = { weekday: 6, hour: 12, minute: 0 };

export function isQuietHour(hour: number) {
  return hour >= 22 || hour < 7;
}

function toIcon(name: string | undefined): IconName {
  return (name || 'bell') as IconName;
}

function openHref(href: string) {
  router.push(href as Href);
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { alertsPrimed, primeAlerts, activeOrder, orders } = useAccount();
  const [banner, setBanner] = useState<(BannerAlert & { orderKey?: string }) | null>(null);
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState<PermissionState | 'checking'>(() => (notify.available ? 'checking' : 'unavailable'));

  const show = useCallback<Show>((a) => {
    setBanner({ ...a, key: Date.now() + Math.random() });
    setVisible(true);
  }, []);
  const hide = useCallback(() => setVisible(false), []);

  // A banner about a server order ("Moses is at the gate, code 3227") goes once that order is
  // delivered or cancelled, so it never sits stale over the tracking or rate screens.
  const orderKey = banner?.orderKey;
  const stale = !!orderKey && !orders.some((o) => o.serverId === orderKey && !o.delivered);
  useEffect(() => {
    if (!stale) return;
    // It slides away at once (see `visible` below); once it has, it is dropped altogether.
    const t = setTimeout(() => {
      setVisible(false);
      setBanner((b) => (b?.orderKey === orderKey ? null : b));
    }, 300);
    return () => clearTimeout(t);
  }, [orderKey, stale]);

  const refresh = useCallback(() => notify.permission().then(setPermission), []);

  // Check on open, and again on return, in case alerts were turned on in the phone's settings.
  useEffect(() => {
    if (!notify.available) return;
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(
    () =>
      notify.init({
        onForeground: (n) => {
          if (!n.quiet) show({ title: n.title, body: n.body, icon: toIcon(n.icon), href: n.href, orderKey: n.orderId });
        },
        onOpen: openHref,
      }),
    [show],
  );

  // The "Turn on alerts" screen is only worth showing if the phone can still ask.
  useEffect(() => {
    if (!alertsPrimed && (permission === 'unavailable' || permission === 'granted' || permission === 'blocked')) primeAlerts();
  }, [permission, alertsPrimed, primeAlerts]);

  const requestPermission = useCallback(async () => {
    const ok = await notify.requestPermission();
    await refresh();
    return ok;
  }, [refresh]);

  const code = activeOrder?.code ?? '7415';
  const sendTest = useCallback(() => {
    const test: Alert = { id: 'test-alert', title: `${rider.name} has your food`, body: `This is a test. Show code ${code} at the gate.`, channel: 'orders', href: '/notifications', icon: 'check' };
    void (async () => {
      if (permission === 'granted' && (await notify.scheduleIn(test, 5))) {
        show({ title: 'Test alert in 5 seconds', body: 'Lock your phone to hear it the way a real order sounds.', icon: 'volume-2' });
      } else {
        show({ title: test.title, body: notify.available ? 'This is a test. Phone alerts are off, so they show here while the app is open.' : 'This is a test. Alerts show here while the app is open.', icon: 'check' });
      }
    })();
  }, [permission, code, show]);

  const value = useMemo<AlertsState>(() => ({ permission, show, requestPermission, sendTest }), [permission, show, requestPermission, sendTest]);

  return (
    <AlertsContext.Provider value={value}>
      {children}
      <OrderAlerts />
      <PlanReminders />
      <AlertBanner
        alert={banner}
        visible={visible && !stale}
        onDone={hide}
        onPress={(a) => {
          setVisible(false);
          if (a.href) openHref(a.href);
        }}
      />
    </AlertsContext.Provider>
  );
}

// One notification per order in the tray: early stages share one id, the gate and after share another.
function alertId(order: Order, stage: Stage) {
  return stage >= 3 ? `order-${order.id}-gate` : `order-${order.id}`;
}

function orderAlert(order: Order, stage: Stage, place: { block: string; firstName: string }): Alert & { icon: IconName } {
  const kitchen = findRestaurant(order.restaurantId)?.name ?? 'The kitchen';
  const id = alertId(order, stage);
  // The sample rider until the server names the real one.
  const rider = order.serverId ? { name: 'Your rider' } : riderFor(order);
  switch (stage) {
    case 2:
      return { id, channel: 'orders', href: '/tracking', icon: 'check', title: `${order.riderName ?? rider.name} has your food`, body: `Sealed at ${kitchen}. Show code ${order.code} at the gate.` };
    case 3:
      return { id, channel: 'orders', href: '/tracking', icon: 'map-pin', title: `${order.riderName ?? rider.name} is at ${place.block}`, body: order.serverId ? `Code ${order.code}.` : `Code ${order.code}. Red helmet, UBF 412K.` };
    case 4:
      return { id, channel: 'updates', href: '/tracking', icon: 'smile', title: `Enjoy your food${place.firstName ? `, ${place.firstName}` : ''}`, body: `Rate ${kitchen} when you’re ready.` };
    default:
      return { id, channel: 'updates', href: '/tracking', icon: 'clock', title: `${kitchen} is cooking your order`, body: `${order.lines[0]?.item.name ?? 'Your food'} · arriving by ${formatClock(arriveBy(order))}. Code ${order.code}.` };
  }
}

type Scheduled = { orderId: string; stage: Stage; at: number; id: string };

// Watches the latest order on the demo timer. Two sounds per order: picked up, and at the gate.
// Every other stage updates quietly: the live card in the app, a silent notification on the phone.
function OrderAlerts() {
  const account = useAccount();
  const { show, permission } = useAlerts();
  const now = useNow();
  const order = account.activeOrder ?? account.orders[0];
  const stage = order ? stageOf(order, !order.delivered, now) : 4;
  const place = { block: blockName(account.place?.name), firstName: account.firstName };

  // The stage last seen, so each change is told once.
  const last = useRef<{ id: string; stage: Stage } | null>(null);
  // Alerts handed to the phone while the app is in the background, so they ring even if it sleeps.
  const scheduled = useRef<Scheduled[]>([]);
  // The latest values, for the app state listener.
  const latest = useRef({ order, place, phone: permission === 'granted' });
  useEffect(() => {
    latest.current = { order, place, phone: permission === 'granted' };
  });

  // On the server: once alerts are allowed, give it this phone's push token.
  const signedIn = account.verified;
  useEffect(() => {
    if (onServer && signedIn && permission === 'granted') void registerPush('student');
  }, [signedIn, permission]);

  // The order is done when the rider is at the room, wherever the student is in the app.
  const { markDelivered } = account;
  useEffect(() => {
    if (order && !order.delivered && stage === 4) markDelivered(order.id);
  }, [order, stage, markDelivered]);

  useEffect(() => {
    if (!order) return;
    const prev = last.current;
    last.current = { id: order.id, stage };
    // A new order, or the first look: nothing has changed yet.
    if (!prev || prev.id !== order.id || stage <= prev.stage) return;

    const alert = orderAlert(order, stage, latest.current.place);
    const phoneHasIt = scheduled.current.some((s) => s.orderId === order.id && s.stage === stage);
    if (AppState.currentState === 'active') {
      // Open: the loud ones become the banner, with no second sound. The rest just move the live card.
      if (isLoudStage(stage) && !phoneHasIt) show({ title: alert.title, body: alert.body, icon: alert.icon, href: alert.href, orderKey: order.serverId });
      return;
    }
    // Server orders: the server's push already rang the phone.
    if (phoneHasIt || !latest.current.phone || order.serverId) return;
    void notify.present(alert);
    if (stage === 4) void notify.dismiss(alertId(order, 2));
  }, [order, stage, show]);

  // Going to the background hands the coming loud alerts to the phone; coming back takes them back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const { order: o, place: p, phone } = latest.current;
      if (state === 'background') {
        if (!o || o.delivered || !phone || o.serverId) return;
        for (const st of [2, 3] as const) {
          const at = stageStartsAt(o, st);
          if (at <= Date.now() || scheduled.current.some((s) => s.orderId === o.id && s.stage === st)) continue;
          const alert = orderAlert(o, st, p);
          void notify.scheduleAt(alert, at).then((ok) => {
            if (!ok) return;
            // Back in the app before the phone took it: take it back now.
            if (AppState.currentState === 'active') return void notify.cancel(alert.id);
            // Recorded only once the phone has it, so a failed schedule still leaves the in-app alert.
            if (!scheduled.current.some((s) => s.orderId === o.id && s.stage === st)) scheduled.current.push({ orderId: o.id, stage: st, at, id: alert.id });
          });
        }
      } else if (state === 'active') {
        let rang: Scheduled | undefined;
        for (const s of scheduled.current) {
          if (s.at > Date.now()) {
            void notify.cancel(s.id);
          } else {
            if (last.current?.id === s.orderId && last.current.stage < s.stage) last.current = { id: s.orderId, stage: s.stage };
            if (!rang || s.stage > rang.stage) rang = s;
          }
        }
        scheduled.current = [];
        // Its time passing doesn't mean the phone showed it (Android can hold back alarms without exact
        // timing). Unless it is in the tray, show it here, while it is still the order's stage.
        if (rang) {
          const s = rang;
          void notify.presentedIds().then((ids) => {
            const { order: cur, place: where } = latest.current;
            if (ids?.includes(s.id) || !cur || cur.id !== s.orderId || stageOf(cur, !cur.delivered, Date.now()) !== s.stage) return;
            const alert = orderAlert(cur, s.stage, where);
            show({ title: alert.title, body: alert.body, icon: alert.icon, href: alert.href });
          });
        }
      }
    });
    return () => sub.remove();
  }, [show]);

  return null;
}

// Meal plan reminder at 1:30 pm, and the Friday special for students who turned it on.
function PlanReminders() {
  const { plan, alertPrefs: prefs, firstName } = useAccount();
  const { show, permission } = useAlerts();
  const now = useNow();
  const phone = permission === 'granted';

  const kind = plan ? findPlanKind(plan.kindId) : undefined;
  const meal = kind ? kind.meals[kind.meals.length - 1] : undefined;
  const on = !!plan && !plan.paused && !!meal && prefs.planReminders && !(prefs.quietHours && isQuietHour(REMINDER.hour));
  const [closeHour] = meal ? mealTimes[meal].closes : [15];
  const closes = `${closeHour % 12 || 12} ${closeHour < 12 ? 'am' : 'pm'}`;
  const reminder: Alert = {
    id: 'plan-reminder',
    channel: 'reminders',
    href: '/supper',
    icon: 'calendar',
    title: `What’s for ${meal ? mealName[meal].toLowerCase() : 'supper'}${firstName ? `, ${firstName}` : ''}?`,
    body: closeHour * 60 > REMINDER.hour * 60 + REMINDER.minute ? `Choose by ${closes}. No choice? We’ll keep your usual.` : `Choose tomorrow’s by ${closes}. No choice? We’ll keep your usual.`,
  };
  const { title, body } = reminder;

  useEffect(() => {
    if (on && phone) void notify.scheduleDaily({ ...reminder, title, body }, REMINDER.hour, REMINDER.minute);
    else void notify.cancel(reminder.id);
  }, [on, phone, title, body]); // eslint-disable-line react-hooks/exhaustive-deps

  const friday = specials.find((s) => s.day === 'Friday');
  const fridayOn = prefs.fridaySpecial && phone && !!friday && !(prefs.quietHours && isQuietHour(FRIDAY.hour));
  useEffect(() => {
    if (fridayOn && friday) {
      void notify.scheduleWeekly(
        { id: 'friday-special', channel: 'reminders', href: '/specials', icon: 'star', title: `This Friday only: ${friday.name}`, body: `${friday.vendor} · ${friday.portions} portions. Save one before they go.` },
        FRIDAY.weekday,
        FRIDAY.hour,
        FRIDAY.minute,
      );
    } else void notify.cancel('friday-special');
  }, [fridayOn, friday]);

  // Without phone alerts, the reminder shows in the app if it is open at 1:30.
  const d = new Date(now);
  const due = d.getHours() === REMINDER.hour && d.getMinutes() === REMINDER.minute;
  const today = d.toDateString();
  const shownOn = useRef('');
  useEffect(() => {
    if (!on || phone || !due || shownOn.current === today || AppState.currentState !== 'active') return;
    shownOn.current = today;
    show({ title, body, icon: 'calendar', href: '/supper' });
  }, [on, phone, due, today, title, body, show]);

  return null;
}
