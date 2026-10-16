import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { dropPoints, type DropKind, type Pt } from './campus';
import { receiveChat, sendChat, syncChat } from './chat';
import { applyServerMenus, findSpecial, type Extra, type MenuItem, type ServerKitchen } from './data';
import type { PhotoKey } from './photos';
import { findPlanKind, planMeals, planPrice, type PlanKindId, type PlanPeriod } from './plans';
import { getPayDefault } from './payDefault';
import { openPaymentPage } from './payPage';
import { api, connectLive, getToken, onServer, readItem, restoreToken, saveItem, sendCode, setOnSignedOut, setToken, toCampusMetres, verifyCode, type ServerOrder, type ServerStatus, type ServerUser, type ServerWallet, type ServerWalletEntry } from './server';

const PROFILE_KEY = 'chakula.student.profile';

// Account state. On the Chakula server (EXPO_PUBLIC_API_URL set), sign-in, profile, orders and the
// wallet are real; meal plans and specials are still kept in memory until the server has them.

export type Place = { id: string; name: string; detail: string; kind: DropKind };

// The drop points pinned on our campus map. Riders only go to these, so nobody types an address.
export const places: Place[] = dropPoints.map((p) => ({ id: p.id, name: p.name, detail: p.where, kind: p.kind }));

export type Pepper = 'None' | 'Mild' | 'Hot';

export type OrderLine = { item: MenuItem; quantity: number; extras?: Extra[]; pepper?: Pepper; note?: string };

// What one of this line costs, with its extras.
export function unitPrice(line: OrderLine) {
  return line.item.price + (line.extras ?? []).reduce((n, e) => n + e.price, 0);
}

// "Extra egg, avocado · Mild · no onions"
export function lineOptions(line: OrderLine) {
  const extras = (line.extras ?? []).map((e, i) => (i === 0 ? e.name : e.name.toLowerCase())).join(', ');
  return [extras, line.pepper && line.pepper !== 'None' ? `${line.pepper} pepper` : '', line.note ?? ''].filter(Boolean).join(' · ');
}

export type Rating = { stars: number; tags: string[]; tip: number };

export type PayMethod = 'mtn' | 'airtel' | 'wallet' | 'card' | 'cash';

export type Order = {
  id: string;
  restaurantId: string;
  lines: OrderLine[];
  total: number;
  placedAt: number;
  delivered: boolean;
  rating?: Rating;
  // How it was paid, so "Order again" can pay the same way.
  method?: PayMethod;
  // Set when the student picked a delivery time instead of as soon as possible.
  scheduledFor?: number;
  // Said to the rider at the gate, so the food reaches the right person.
  code: string;
  // When the student tapped "I'm coming down" at the gate.
  comingDownAt?: number;
  // Server orders only: its id there, where it is, the real rider and their last GPS point.
  serverId?: string;
  dropPointId?: string;
  status?: ServerStatus;
  riderName?: string;
  // Server orders: the rider's number while they have the food, for Call and Text.
  riderPhone?: string;
  riderAt?: Pt;
  // When each step really happened, from the server (ISO strings, null until it happens).
  times?: ServerOrder['times'];
  // The id the app gave it before the server answered, so Undo still finds it.
  localId?: string;
};

// A 4 digit handover code, never starting with 0 so it reads as a number.
export function newHandoverCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

// What the student wants to hear about. Order updates are always on.
export type AlertPrefs = {
  // Text the handover code if the push isn't seen.
  sms: boolean;
  planReminders: boolean;
  // No reminders from 10 pm to 7 am. Orders still come through.
  quietHours: boolean;
  celebrations: boolean;
  fridaySpecial: boolean;
  // Call a friend if the student misses the rider at the gate.
  callFriend: boolean;
  friendName: string;
  friendPhone: string;
};

export const defaultAlertPrefs: AlertPrefs = {
  sms: true,
  planReminders: true,
  quietHours: true,
  celebrations: true,
  fridaySpecial: false,
  callFriend: false,
  friendName: '',
  friendPhone: '',
};

export type Preorder = { id: string; specialId: string; slot: string };

export type WalletEntry = { id: string; title: string; when: string; amount: number };

// A top-up the student started on the server, until MTN or Airtel says yes or no.
export type TopupState = 'pending' | 'succeeded' | 'failed';
export type MomoMethod = 'mtn' | 'airtel';

// Top up more, get more: the bonus credited on top of a top up of at least this amount.
export const topUpBonuses: { amount: number; bonus: number }[] = [
  { amount: 20000, bonus: 500 },
  { amount: 50000, bonus: 2000 },
  { amount: 100000, bonus: 5000 },
];

export function bonusFor(amount: number) {
  return topUpBonuses.reduce((b, t) => (amount >= t.amount ? t.bonus : b), 0);
}

export type MealPlan = {
  kindId: PlanKindId;
  period: PlanPeriod;
  price: number;
  meals: number;
  used: number;
  // Meals skipped and saved for later.
  carried: number;
  paused: boolean;
  startedAt: number;
  // The dish picked for a day's main meal, by day key ("2026-10-14").
  choices: Record<string, string>;
  // Days whose main meal was skipped.
  skipped: string[];
};

// Demo pacing: one "minute" of delivery passes every 4 seconds, so a whole delivery fits in a test run.
export const DEMO_MINUTE_MS = 4000;
export const DELIVERY_MINUTES = 8;

// A scheduled order sets off so it lands at its time; until then it waits.
function deliveryStart(order: Order) {
  return order.scheduledFor ? order.scheduledFor - DELIVERY_MINUTES * DEMO_MINUTE_MS : order.placedAt;
}

export function deliveryStartsAt(order: Order) {
  return deliveryStart(order);
}

export function isWaiting(order: Order, now: number) {
  return now < deliveryStart(order);
}

export function minutesLeft(order: Order, now: number) {
  return Math.min(DELIVERY_MINUTES, Math.max(0, DELIVERY_MINUTES - Math.floor((now - deliveryStart(order)) / DEMO_MINUTE_MS)));
}

const day = 24 * 60 * 60 * 1000;

function sampleOrders(): Order[] {
  const item = (id: string, name: string, price: number, tint: string, photo: PhotoKey): MenuItem => ({ id, name, price, tint, photo, description: '', category: 'Popular' });
  const rated = (stars: number): Rating => ({ stars, tags: [], tip: 0 });
  // daysAgo at a clock time, so "Your usual" has a breakfast, a lunch and a supper habit to find.
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(Date.now() - daysAgo * day);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  };
  const rolexAndTea = () => [{ item: item('rolex-classic', 'Classic rolex', 3000, '#FFE4D6', 'rolex'), quantity: 2 }, { item: item('tea', 'African tea', 1500, '#E3EBDD', 'tea'), quantity: 1 }];
  const pilauAndJuice = () => [{ item: item('pilau', 'Chicken pilau', 9000, '#F4E7C5', 'pilau'), quantity: 1 }, { item: item('passion', 'Passion juice', 3000, '#FFE4D6', 'passion'), quantity: 1 }];
  return [
    { id: '2041', code: '5208', restaurantId: 'rolex-corner', placedAt: at(1, 8, 10), delivered: true, total: 7500, method: 'mtn', lines: rolexAndTea() },
    { id: '2037', code: '3961', restaurantId: 'nakawa-kitchen', placedAt: at(2, 19, 30), delivered: true, rating: rated(5), total: 12000, method: 'mtn', lines: pilauAndJuice() },
    { id: '2033', code: '8147', restaurantId: 'green-bowl', placedAt: at(2, 13, 15), delivered: true, rating: rated(4), total: 19000, method: 'mtn', lines: [{ item: item('bowl', 'Chicken power bowl', 14000, '#E3EBDD', 'bowl'), quantity: 1 }, { item: item('mango', 'Mango smoothie', 5000, '#F4E7C5', 'mango'), quantity: 1 }] },
    { id: '2026', code: '2730', restaurantId: 'rolex-corner', placedAt: at(3, 7, 50), delivered: true, rating: rated(5), total: 7500, method: 'mtn', lines: rolexAndTea() },
    { id: '2019', code: '6493', restaurantId: 'nakawa-kitchen', placedAt: at(5, 20, 5), delivered: true, rating: rated(5), total: 12000, method: 'mtn', lines: pilauAndJuice() },
  ];
}

type AccountState = {
  phone: string | null;
  verified: boolean;
  name: string;
  place: Place | null;
  room: string;
  note: string;
  ready: boolean;
  // On the server, while the saved sign-in is being checked at start. Screens wait for it.
  restoring: boolean;
  ordersLoaded: boolean;
  initials: string;
  firstName: string;
  maskedPhone: string;
  address: string;
  balance: number;
  wallet: WalletEntry[];
  // Top up bonuses credited so far.
  bonusEarned: number;
  plan: MealPlan | null;
  orders: Order[];
  activeOrder: Order | null;
  preorders: Preorder[];
  alertPrefs: AlertPrefs;
  // The "turn on alerts" screen has been shown, or wasn't needed.
  alertsPrimed: boolean;
  portionsLeft: (specialId: string) => number;
  // In dev the server sends the code back instead of texting it.
  devCode: string | null;
  // Resolves once the code is on its way; throws the server's message if not.
  startSignIn: (phone: string) => Promise<void>;
  // Resolves to an error message, or null when signed in.
  verify: (code: string) => Promise<string | null>;
  saveProfile: (name: string, place: Place, room: string, note: string) => void;
  signOut: () => void;
  // Sample mode: credits the amount plus any bonus, and returns the bonus.
  topUp: (amount: number) => number;
  // Server mode: asks the student's phone to approve a top-up and opens the MoMo page. Resolves
  // with the top-up's id once it has started; throws the server's message if it can't.
  startTopUp: (amount: number, method: MomoMethod) => Promise<string>;
  // Server mode: where each top-up started on this phone has got to.
  topups: Record<string, TopupState>;
  // Server mode: the balance and activity have come back from the server at least once.
  walletLoaded: boolean;
  refreshWallet: () => void;
  // Server mode: asks where one top-up has got to, in case a live message was missed.
  checkTopUp: (id: string) => void;
  withdraw: (amount: number) => void;
  startPlan: (kindId: PlanKindId, period: PlanPeriod) => void;
  togglePlanPause: () => void;
  chooseMeal: (day: string, dishId: string) => void;
  skipMeal: (day: string) => void;
  unskipMeal: (day: string) => void;
  // Returns the new order's id. Wallet orders are charged straight away.
  placeOrder: (order: Omit<Order, 'id' | 'placedAt' | 'delivered' | 'code'>) => string;
  // Takes back an order placed by mistake and refunds a wallet charge.
  cancelOrder: (id: string) => void;
  markDelivered: (id: string) => void;
  // "I'm coming down": tells the rider at the gate the student has seen the alert.
  comingDown: (id: string) => void;
  setAlertPrefs: (change: Partial<AlertPrefs>) => void;
  primeAlerts: () => void;
  rateOrder: (id: string, rating: Rating) => void;
  preorder: (specialId: string, slot: string) => void;
  cancelPreorder: (id: string) => void;
};

const AccountContext = createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [room, setRoom] = useState('');
  const [note, setNote] = useState('');
  // On the server the wallet starts empty and comes from GET /wallet; the welcome credit is the prototype's.
  const [balance, setBalance] = useState(onServer ? 0 : 4500);
  const [wallet, setWallet] = useState<WalletEntry[]>(onServer ? [] : [{ id: 'w1', title: 'Welcome credit', when: 'When you joined', amount: 4500 }]);
  const [walletLoaded, setWalletLoaded] = useState(!onServer);
  const [topups, setTopups] = useState<Record<string, TopupState>>({});
  const [bonusEarned, setBonusEarned] = useState(0);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  // On the server a new student starts with no orders; the samples are for the prototype.
  const [orders, setOrders] = useState<Order[]>(onServer ? [] : sampleOrders);
  // The latest orders, for the live connection's reconnect.
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  const [devCode, setDevCode] = useState<string | null>(null);
  // Bumped when menus arrive from the server, so screens reading them redraw.
  const [menuVersion, setMenuVersion] = useState(0);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [alertPrefs, setAlertPrefsState] = useState<AlertPrefs>(defaultAlertPrefs);
  const [alertsPrimed, setAlertsPrimed] = useState(false);
  // On the server, false until the student's orders have come back, so a screen opened straight
  // to an order (a reload, a tapped notification) waits for it instead of leaving.
  const [ordersLoaded, setOrdersLoaded] = useState(!onServer);
  // Only on the server: a saved sign-in is checked before any screen shows.
  const [restoring, setRestoring] = useState(onServer);

  // The balance and activity from the server. Each answer replaces the last.
  // Stable, so screens can ask for a refresh when they open.
  const loadWallet = useCallback(() => {
    if (!onServer || !getToken()) return;
    api<ServerWallet>('GET', '/wallet')
      .then((w) => {
        setBalance(w.balance);
        setWallet(w.entries.map(walletEntry));
        setWalletLoaded(true);
      })
      .catch(() => {
        // Keep what's shown; the next change or visit tries again.
      });
  }, []);

  function clearWallet() {
    setBalance(0);
    setWallet([]);
    setWalletLoaded(false);
    setTopups({});
  }

  // Fills the account from the server's record of the student.
  const applyUser = (user: ServerUser) => {
    setPhone(user.phone.replace(/^\+256/, ''));
    if (user.name) setName(user.name);
    const saved = places.find((pl) => pl.id === user.dropPointId);
    if (saved) setPlace(saved);
    setVerified(true);
  };

  // Stay signed in: put back the saved token and ask the server who it belongs to. If the server
  // can't be reached quickly, show sign-in but keep the token; a late answer still signs them in.
  useEffect(() => {
    if (!onServer) return;
    let done = false;
    const finish = () => {
      if (!done) setRestoring(false);
      done = true;
    };
    const timer = setTimeout(finish, 6000);
    setOnSignedOut(() => {
      setVerified(false);
      setPhone(null);
      setOrders([]);
      setOrdersLoaded(false);
      clearWallet();
    });
    void (async () => {
      const token = await restoreToken();
      if (!token) return finish();
      const extras = await readItem(PROFILE_KEY);
      try {
        const user = await api<ServerUser>('GET', '/me');
        // Signed in another way meanwhile: leave that alone.
        if (getToken() !== token) return finish();
        applyUser(user);
        try {
          // Only this student's: another student may have used the phone before.
          const { room: r, note: n, phone: p } = JSON.parse(extras ?? '{}') as { room?: string; note?: string; phone?: string };
          if (p === user.phone && r) setRoom(r);
          if (p === user.phone && n) setNote(n);
        } catch {
          // No room or note saved.
        }
      } catch {
        // 401 clears the token in api(); no connection keeps it for next time.
      }
      finish();
    })();
    return () => {
      clearTimeout(timer);
      setOnSignedOut(null);
    };
  }, []);

  // Real menus, prices and sold out dishes from the kitchens.
  useEffect(() => {
    if (!onServer) return;
    api<ServerKitchen[]>('GET', '/kitchens')
      .then((kitchens) => {
        applyServerMenus(kitchens);
        setMenuVersion((v) => v + 1);
      })
      .catch(() => {
        // Keep the menus the app shipped with.
      });
  }, []);

  // Once signed in: the student's orders, then live changes from the kitchen and rider.
  useEffect(() => {
    if (!onServer || !verified || !getToken()) return;
    let stop = () => {};
    api<ServerOrder[]>('GET', '/orders')
      .then((list) => setOrders(list.filter((o) => o.status !== 'cancelled').map((o) => fromServer(o))))
      .catch(() => {})
      .finally(() => setOrdersLoaded(true));
    loadWallet();
    stop = connectLive((m) => {
      if (m.type === 'wallet') {
        setBalance(m.balance);
        const t = m.topup;
        if (t) {
          setTopups((prev) => ({ ...prev, [t.id]: t.status }));
          if (t.status === 'failed') Alert.alert('Top-up didn’t go through', 'Nothing was charged. Try again when you’re ready.');
        }
        loadWallet();
      } else if (m.type === 'order') {
        const o = m.order;
        if (o.status === 'cancelled' && o.cancelReason?.startsWith('Payment')) Alert.alert('Payment didn’t go through', 'Nothing was charged. Try again when you’re ready.');
        if (o.status === 'cancelled' && o.cancelReason === 'Returned to the kitchen') {
          Alert.alert('Your order went back to the kitchen', `${o.rider?.name ?? 'Your rider'} couldn’t reach you at ${o.dropPoint.name}.${o.payMethod === 'wallet' ? ' Your money is back in your wallet.' : o.payMethod === 'cash' ? '' : ' Chakula will refund your MoMo.'}`);
        }
        setOrders((prev) => (o.status === 'cancelled' ? prev.filter((p) => p.serverId !== o.id) : prev.map((p) => (p.serverId === o.id ? fromServer(o, p) : p))));
      } else if (m.type === 'message') {
        receiveChat(m.message);
      } else if (m.type === 'hello') {
        // Back after a drop: catch up on chat messages sent meanwhile.
        for (const o of ordersRef.current) if (o.serverId && o.riderName && !o.delivered) syncChat(o.serverId).catch(() => {});
      } else if (m.type === 'rider-location') {
        const at = toCampusMetres(m.lat, m.lng);
        setOrders((prev) => prev.map((p) => (p.serverId === m.orderId ? { ...p, riderAt: at } : p)));
      }
    });
    return () => stop();
  }, [verified, loadWallet]);

  const value = useMemo<AccountState>(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const activeOrder = orders.find((o) => !o.delivered) ?? null;
    return {
      phone,
      verified,
      name,
      place,
      room,
      note,
      ready: verified && !!place && parts.length > 0,
      restoring,
      ordersLoaded,
      initials: parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?',
      firstName: parts[0] ?? '',
      maskedPhone: phone ? `0${phone.slice(0, 3)} ••• ${phone.slice(-3)}` : '',
      address: place ? [place.name, room].filter(Boolean).join(', ') : '',
      balance,
      wallet,
      bonusEarned,
      plan,
      orders,
      activeOrder,
      preorders,
      alertPrefs,
      alertsPrimed,
      portionsLeft: (sid) => Math.max(0, (findSpecial(sid)?.portions ?? 0) - preorders.filter((p) => p.specialId === sid).length),
      devCode,
      startSignIn: async (p) => {
        setDevCode(null);
        if (onServer) {
          const res = await sendCode(`+256${p}`, 'student');
          setDevCode(res.devCode ?? null);
        }
        setPhone(p);
        setVerified(false);
      },
      verify: async (code) => {
        if (!onServer) {
          // Prototype: any 6 digits are accepted.
          setVerified(true);
          return null;
        }
        try {
          const { user } = await verifyCode(`+256${phone}`, code, 'student');
          applyUser(user);
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : 'That didn’t work. Try again.';
        }
      },
      saveProfile: (n, pl, r, nt) => {
        setName(n.trim());
        setPlace(pl);
        setRoom(r.trim());
        setNote(nt.trim());
        if (onServer) {
          api('PATCH', '/me', { name: n.trim(), dropPointId: pl.id }).catch(() => {});
          // Room and note aren't on the server; kept on the phone for next time.
          void saveItem(PROFILE_KEY, JSON.stringify({ phone: `+256${phone}`, room: r.trim(), note: nt.trim() }));
        }
      },
      signOut: () => {
        if (onServer) {
          api('POST', '/auth/sign-out').catch(() => {});
          setToken(null);
          void saveItem(PROFILE_KEY, null);
          setOrders([]);
          setOrdersLoaded(false);
          clearWallet();
        }
        setPhone(null);
        setVerified(false);
      },
      topUp: (amount) => {
        // Prototype: credits straight away. Real top ups wait for the MTN prompt to clear.
        const bonus = bonusFor(amount);
        setBalance((b) => b + amount + bonus);
        setBonusEarned((n) => n + bonus);
        setWallet((w) => [
          ...(bonus ? [{ id: `b${Date.now()}`, title: 'Top up bonus', when: 'Just now', amount: bonus }] : []),
          { id: `t${Date.now()}`, title: 'Top up from MTN', when: 'Just now', amount },
          ...w,
        ]);
        return bonus;
      },
      startTopUp: async (amount, method) => {
        const res = await api<{ id: string; redirectUrl?: string }>('POST', '/wallet/topups', { amount, method });
        setTopups((prev) => (prev[res.id] ? prev : { ...prev, [res.id]: 'pending' }));
        // Flutterwave's waiting page; the pretend MoMo in dev has none and settles by itself.
        if (res.redirectUrl) void openPaymentPage(res.redirectUrl, { topupId: res.id });
        return res.id;
      },
      topups,
      walletLoaded,
      refreshWallet: loadWallet,
      checkTopUp: (tid) => {
        api<{ status: TopupState }>('GET', `/wallet/topups/${tid}`)
          .then(({ status }) => {
            if (status === 'pending') return;
            setTopups((prev) => (prev[tid] === status ? prev : { ...prev, [tid]: status }));
            loadWallet();
          })
          .catch(() => {});
      },
      withdraw: (amount) => {
        const take = Math.min(amount, balance);
        if (take <= 0) return;
        setBalance((b) => b - take);
        setWallet((w) => [{ id: `wd${Date.now()}`, title: 'Withdrawn to MTN', when: 'Just now', amount: -take }, ...w]);
      },
      startPlan: (kindId, period) => {
        const kind = findPlanKind(kindId);
        if (!kind) return;
        setPlan({ kindId, period, price: planPrice(kind, period), meals: planMeals(kind, period), used: 0, carried: 0, paused: false, startedAt: Date.now(), choices: {}, skipped: [] });
      },
      togglePlanPause: () => setPlan((p) => (p ? { ...p, paused: !p.paused } : p)),
      chooseMeal: (day, dishId) => setPlan((p) => (p ? { ...p, choices: { ...p.choices, [day]: dishId }, skipped: p.skipped.filter((d) => d !== day), carried: p.skipped.includes(day) ? p.carried - 1 : p.carried } : p)),
      skipMeal: (day) => setPlan((p) => (p && !p.skipped.includes(day) ? { ...p, skipped: [...p.skipped, day], carried: p.carried + 1 } : p)),
      unskipMeal: (day) => setPlan((p) => (p && p.skipped.includes(day) ? { ...p, skipped: p.skipped.filter((d) => d !== day), carried: p.carried - 1 } : p)),
      placeOrder: (o) => {
        const id = String(Math.max(2047, ...orders.map((p) => Number(p.id) || 0)) + 1);
        if (onServer) {
          // Shown straight away; the server's number, code and price replace it when it answers.
          // The server cooks as soon as it's paid; ordering for later comes with its own server step.
          const { scheduledFor: _later, ...now } = o;
          setOrders((prev) => [{ ...now, id, localId: id, dropPointId: place?.id, code: '····', placedAt: Date.now(), delivered: false, status: o.method === 'cash' || o.method === 'wallet' ? 'cooking' : 'awaiting_payment' }, ...prev]);
          sendOrder(id, o);
          return id;
        }
        setOrders((prev) => [{ ...o, id, code: newHandoverCode(), placedAt: Date.now(), delivered: false }, ...prev.map((p) => ({ ...p, delivered: true }))]);
        if (o.method === 'wallet') {
          setBalance((b) => b - o.total);
          setWallet((w) => [{ id: `o${id}`, title: `Order #${id}`, when: 'Just now', amount: -o.total }, ...w]);
        }
        return id;
      },
      cancelOrder: (id) => {
        const order = orders.find((p) => p.id === id || p.localId === id);
        if (!order) return;
        if (order.serverId) {
          // A wallet order's refund is the server's to make; the balance follows from it.
          api('POST', `/orders/${order.serverId}/cancel`)
            .catch((e) => Alert.alert('Couldn’t cancel', e instanceof Error ? e.message : ''))
            .finally(() => order.method === 'wallet' && loadWallet());
        }
        setOrders((prev) => prev.filter((p) => p !== order));
        if (order.method === 'wallet' && !onServer) {
          setBalance((b) => b + order.total);
          setWallet((w) => w.filter((e) => e.id !== `o${id}`));
        }
      },
      markDelivered: (id) => setOrders((prev) => (prev.some((p) => p.id === id && !p.delivered) ? prev.map((p) => (p.id === id ? { ...p, delivered: true } : p)) : prev)),
      comingDown: (id) => {
        // On the server the rider hears it as a chat message.
        const mark = () => setOrders((prev) => prev.map((p) => (p.id === id && !p.comingDownAt ? { ...p, comingDownAt: Date.now() } : p)));
        const o = orders.find((p) => p.id === id);
        if (!o?.serverId) return mark();
        if (o.comingDownAt) return;
        // Only says the rider knows once the message really went.
        sendChat(o.serverId, 'I’m coming down').then(mark, (e: unknown) =>
          Alert.alert('Your rider didn’t get that', e instanceof Error ? e.message : 'Check your data and try again.'),
        );
      },
      setAlertPrefs: (change) => setAlertPrefsState((p) => ({ ...p, ...change })),
      primeAlerts: () => setAlertsPrimed(true),
      rateOrder: (id, rating) => {
        setOrders((prev) => prev.map((p) => (p.id === id ? { ...p, rating } : p)));
        // Prototype: tips come out of the wallet. On the server there are no rider payouts yet, so
        // the wallet is never touched for a tip (the rating screen doesn't offer one there).
        if (rating.tip > 0 && !onServer) {
          setBalance((b) => b - rating.tip);
          // The sample rider is Brian; a server order names its real rider.
          const rated = orders.find((p) => p.id === id);
          const riderName = rated?.serverId ? (rated.riderName ?? 'your rider') : 'Brian';
          setWallet((w) => [{ id: `tip${id}`, title: `Tip for ${riderName}, #${id}`, when: 'Just now', amount: -rating.tip }, ...w]);
        }
      },
      preorder: (sid, slot) => setPreorders((prev) => [{ id: `p${Date.now()}`, specialId: sid, slot }, ...prev]),
      cancelPreorder: (id) => setPreorders((prev) => prev.filter((p) => p.id !== id)),
    };
  }, [phone, verified, name, place, room, note, balance, wallet, walletLoaded, topups, bonusEarned, plan, orders, preorders, alertPrefs, alertsPrimed, devCode, menuVersion, restoring, ordersLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Places an order on the server and swaps the stand-in for the real one.
  function sendOrder(localId: string, o: Omit<Order, 'id' | 'placedAt' | 'delivered' | 'code'>) {
    const body = {
      kitchenId: o.restaurantId,
      dropPointId: place?.id,
      payMethod: o.method ?? 'mtn',
      // Another MoMo number from Profile › Payment; the server charges the student's own without it.
      payPhone: (o.method ?? 'mtn') === 'mtn' || o.method === 'airtel' ? getPayDefault().momoPhone || undefined : undefined,
      note: [room, note].filter(Boolean).join(' · ') || undefined,
      lines: o.lines.map((l) => ({ dishId: l.item.id, quantity: l.quantity, extraIds: (l.extras ?? []).map((e) => e.id), pepper: l.pepper, note: l.note || undefined })),
    };
    api<{ order: ServerOrder; payment: { redirectUrl?: string } | null }>('POST', '/orders', body)
      .then(({ order, payment }) => {
        setOrders((prev) => prev.map((p) => (p.localId === localId ? fromServer(order, p) : p)));
        if (order.payMethod === 'wallet') loadWallet();
        // Flutterwave's page that waits with the student while they approve on their phone.
        if (payment?.redirectUrl) void openPaymentPage(payment.redirectUrl, { orderId: order.id });
      })
      .catch((e) => {
        setOrders((prev) => prev.filter((p) => p.localId !== localId));
        Alert.alert('Order not placed', e instanceof Error ? e.message : 'Try again.');
      });
  }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}

// A server order in the app's shape. Keeps what only the app knows (dish photos, the rating).
function fromServer(o: ServerOrder, prev?: Order): Order {
  const lines =
    prev?.lines ??
    o.lines.map((l) => ({
      item: { id: l.dishId, name: l.name, price: l.unitPrice - l.extras.reduce((n, e) => n + e.price, 0), description: '', category: '', tint: '#F4E7C5' } as MenuItem,
      quantity: l.quantity,
      extras: l.extras,
      ...(l.pepper ? { pepper: l.pepper as Pepper } : {}),
      ...(l.note ? { note: l.note } : {}),
    }));
  return {
    ...prev,
    id: String(o.number),
    localId: prev?.localId,
    serverId: o.id,
    status: o.status,
    restaurantId: o.kitchen.id,
    dropPointId: o.dropPoint.id,
    lines,
    total: o.total,
    placedAt: prev?.placedAt ?? (o.times.placed ? Date.parse(o.times.placed) : Date.now()),
    delivered: o.status === 'delivered' || o.status === 'cancelled',
    method: o.payMethod,
    code: o.handoverCode ?? prev?.code ?? '····',
    riderName: o.rider?.name ?? undefined,
    riderPhone: o.rider?.phone,
    riderAt: o.status === 'picked_up' || o.status === 'at_gate' ? prev?.riderAt : undefined,
    times: o.times,
  };
}

// A line of wallet activity as the Activity list shows it.
function walletEntry(e: ServerWalletEntry): WalletEntry {
  const at = Date.parse(e.createdAt);
  const network = e.method === 'airtel' ? 'Airtel' : 'MTN';
  const title = e.kind === 'topup' ? `Top-up from ${network}` : e.kind === 'refund' ? `Refund for order #${e.orderNumber ?? ''}` : `Order #${e.orderNumber ?? ''}`;
  return { id: e.id, title, when: Number.isFinite(at) ? `${formatWhen(at)}, ${formatClock(at, true)}` : '', amount: e.amount };
}

// Re-renders the caller every second, for countdowns.
export function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// "7:42", or "7:42 pm" with the period.
export function formatClock(time: number, period = false) {
  const d = new Date(time);
  const h = d.getHours();
  const clock = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  return period ? `${clock} ${h < 12 ? 'am' : 'pm'}` : clock;
}

export function formatWhen(time: number, now = Date.now()) {
  // Calendar days, so last night's supper reads "Yesterday".
  const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const days = Math.round((midnight(now) - midnight(time)) / day);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
