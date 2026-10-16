import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultHears, type Device, type Hears, type RowKey } from './alerts';
import { photoFor } from './photos';
import { available as canPrint, choosePrinter, printOrder, printTest, savedPrinter, type PairedDevice } from './printer';
import { api, connectLive, getToken, loadSession, onServer, saveSession, ServerError, setToken, type ServerOrder, type ServerStatus, type ServerUser } from './server';

// Everything here is sample data held in memory, like the student app. Times are set relative to
// when the app opens, so the board always looks like a lunch rush in progress.
// Built with EXPO_PUBLIC_API_URL (see server.ts), the board, menu and Open switch come from the
// Chakula server instead, on the real clock. On the server each new order prints by itself on
// the counter's Bluetooth printer (printer.ts). POS, swaps, extra time and declining stay on this
// phone until the server has them.

const MIN = 60_000;

// The demo opens at 12:38 today, the moment the design canvas shows, and runs in real time from there.
const opened = new Date();
const CLOCK_OFFSET = new Date(opened.getFullYear(), opened.getMonth(), opened.getDate(), 12, 38).getTime() - opened.getTime();
export function demoNow() {
  return onServer ? Date.now() : Date.now() + CLOCK_OFFSET;
}

export type Item = { qty: number; name: string; extras?: string[]; price: number };
export type Payment = 'MTN MoMo' | 'Airtel Money' | 'Wallet' | 'Cash on delivery';
export type Status = 'incoming' | 'cooking' | 'ready' | 'picked' | 'delivered' | 'declined';

export type Order = {
  // The order number the team calls out, e.g. "4821".
  id: string;
  // The server's id for it, for calls to the server. Only when running on the server.
  serverId?: string;
  student: string;
  place: string;
  items: Item[];
  note?: string;
  paid: Payment;
  inAt: number;
  dueAt: number;
  status: Status;
  // When the accept alert runs out (manual mode only).
  acceptBy?: number;
  readyAt?: number;
  pickedAt?: number;
  deliveredAt?: number;
  rider?: { name: string; arrivesAt: number };
  posSale?: number;
  tag?: string;
  // Arrived while the app was open (not part of the sample board it opens with).
  live?: boolean;
  // The kitchen ticket came out of the printer.
  printed?: boolean;
  // Someone has seen it: the printed ticket counts, or a tap on it.
  seenAt?: number;
  // "Something ran out": the student is choosing a swap, then has chosen.
  swap?: { item: string; askedAt: number; chose?: string };
  // On the server: the order's money, for the Money tab. Subtotal is the food; total adds delivery.
  sale?: { subtotal: number; total: number; payMethod: ServerOrder['payMethod']; paid: boolean };
};

export type Settings = {
  open: boolean;
  autoAccept: boolean;
  printTicket: boolean;
  printSeal: boolean;
  addToPOS: boolean;
};

export type Dish = {
  id: string;
  name: string;
  section: 'Popular' | 'Mains' | 'Drinks';
  price: number;
  minutes: number;
  extras: number;
  hasPhoto: boolean;
  soldOut: boolean;
  backTomorrow?: boolean;
};

// On the server each dish has its own extras; one switch here covers every dish that offers it.
export type Extra = { id: string; name: string; price: number; soldOut: boolean; dishIds?: string[] };

export const RIDERS = ['Moses', 'Sam', 'Joan', 'Eddie'];

export function orderTotal(o: Order) {
  return o.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function clock(ms: number) {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function minutesUntil(ms: number, now: number) {
  return Math.round((ms - now) / MIN);
}

// The next after-lectures drop: the next whole hour at least 20 minutes away.
export function nextDrop(now: number) {
  const d = new Date(now + 20 * MIN);
  d.setMinutes(0, 0, 0);
  return d.getTime() + 60 * MIN;
}

export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
}

function seed(start: number): Order[] {
  const at = (m: number) => start + m * MIN;
  return [
    {
      id: '4819', student: 'Aisha N.', place: 'Library', paid: 'MTN MoMo', inAt: at(-12), dueAt: at(3), status: 'cooking', posSale: 1091,
      items: [{ qty: 1, name: 'Chicken pilau', extras: ['Avocado'], price: 10000 }, { qty: 1, name: 'Soda', price: 2000 }],
      rider: { name: 'Sam', arrivesAt: at(3) },
    },
    {
      id: '4818', student: 'Peter O.', place: 'Main gate', paid: 'Wallet', inAt: at(-4), dueAt: at(11), status: 'cooking', posSale: 1092,
      items: [{ qty: 1, name: 'Katogo', price: 7000 }, { qty: 2, name: 'Special rolex', price: 5000 }],
    },
    {
      id: '4821', student: 'Brian K.', place: 'Block B, Room 12', paid: 'MTN MoMo', inAt: at(0), dueAt: at(15), status: 'cooking', posSale: 1093,
      items: [{ qty: 2, name: 'Special rolex', extras: ['Extra egg', 'No pepper'], price: 5500 }, { qty: 1, name: 'Passion juice', price: 3000 }],
      note: 'Not too much cabbage, please.',
      rider: { name: 'Moses', arrivesAt: at(17) },
    },
    {
      id: '4823', student: 'Grace A.', place: 'Library', paid: 'Wallet', inAt: at(0), dueAt: at(16), status: 'cooking', posSale: 1094, tag: 'Meal plan',
      items: [{ qty: 2, name: 'Chicken pilau', price: 9000 }, { qty: 2, name: 'Passion juice', price: 3000 }],
    },
    {
      id: '4817', student: 'Daniel M.', place: 'Block A', paid: 'Cash on delivery', inAt: at(-19), dueAt: at(-4), status: 'ready', readyAt: at(-5), posSale: 1089,
      items: [{ qty: 1, name: 'Beef stew & matooke', price: 9000 }],
      rider: { name: 'Moses', arrivesAt: at(0) },
    },
    {
      id: '4816', student: 'Joan M.', place: 'Block C', paid: 'MTN MoMo', inAt: at(-20), dueAt: at(-5), status: 'ready', readyAt: at(-3), posSale: 1088,
      items: [{ qty: 1, name: 'Special rolex', price: 5000 }, { qty: 1, name: 'Passion juice', price: 3000 }],
      rider: { name: 'Joan', arrivesAt: at(4) },
    },
    {
      id: '4815', student: 'Ivan S.', place: 'Block C', paid: 'Airtel Money', inAt: at(-24), dueAt: at(-8), status: 'picked', readyAt: at(-9), pickedAt: at(-7), posSale: 1087,
      items: [{ qty: 1, name: 'Chicken pilau', price: 9000 }],
      rider: { name: 'Eddie', arrivesAt: at(-7) },
    },
    {
      id: '4814', student: 'Ruth K.', place: 'Library', paid: 'Wallet', inAt: at(-30), dueAt: at(-14), status: 'delivered', readyAt: at(-15), pickedAt: at(-13), deliveredAt: at(-4), posSale: 1086,
      items: [{ qty: 1, name: 'Katogo', price: 7000 }],
      rider: { name: 'Sam', arrivesAt: at(-13) },
    },
  ];
}

// Orders that arrive while the app is open, one at a time.
const ARRIVALS: Omit<Order, 'inAt' | 'dueAt' | 'status'>[] = [
  { id: '4824', student: 'Mark T.', place: 'Block A', paid: 'MTN MoMo', items: [{ qty: 1, name: 'Chicken pilau', extras: ['Avocado'], price: 10000 }, { qty: 1, name: 'Soda', price: 2000 }] },
  { id: '4825', student: 'Esther N.', place: 'Main gate', paid: 'Cash on delivery', items: [{ qty: 2, name: 'Special rolex', extras: ['Extra egg'], price: 5500 }], note: 'Please cut them in half.' },
  { id: '4826', student: 'Paul W.', place: 'Block B, Room 4', paid: 'Wallet', items: [{ qty: 1, name: 'Katogo', price: 7000 }, { qty: 1, name: 'Passion juice', price: 3000 }] },
  { id: '4827', student: 'Lydia A.', place: 'Library', paid: 'Airtel Money', items: [{ qty: 1, name: 'Chicken pilau', price: 9000 }] },
];

// The demo printer doesn't answer for this one, so it shows the "Didn't print" alarm a minute in.
// (The canvas uses 4827; 4825 is the second arrival, about three minutes after opening.)
const PRINT_FAILS = new Set(['4825']);

// What a student picks when the kitchen runs out of something.
const SWAPS: Record<string, string> = { 'Chicken pilau': 'Katogo', Katogo: 'Chicken pilau', 'Special rolex': 'Katogo', 'Passion juice': 'Soda', Soda: 'Passion juice' };
const SWAP_ANSWER = 20_000;

const DISHES: Dish[] = [
  { id: 'pilau', name: 'Chicken pilau', section: 'Popular', price: 9000, minutes: 15, extras: 2, hasPhoto: true, soldOut: false },
  { id: 'luwombo', name: 'Beef luwombo', section: 'Popular', price: 12000, minutes: 25, extras: 0, hasPhoto: true, soldOut: true, backTomorrow: true },
  { id: 'rolex', name: 'Special rolex', section: 'Popular', price: 5000, minutes: 5, extras: 3, hasPhoto: true, soldOut: false },
  { id: 'katogo', name: 'Katogo', section: 'Mains', price: 7000, minutes: 5, extras: 0, hasPhoto: false, soldOut: false },
];

const EXTRAS: Extra[] = [
  { id: 'egg', name: 'Extra egg', price: 500, soldOut: false },
  { id: 'avocado', name: 'Avocado', price: 1000, soldOut: false },
  { id: 'sausage', name: 'Sausage', price: 1500, soldOut: true },
];

// Orders served earlier today, before the ones on the board. The server's board already has all of today.
export const SERVED_EARLIER = onServer ? 0 : 48;

// ---- The server's board and menu, in this app's shapes ----

type ServerKitchen = {
  id: string;
  name: string;
  open: boolean;
  menu: { id: string; name: string; category: string; price: number; prepMinutes: number; soldOut: boolean; extras: { id: string; name: string; price: number; soldOut: boolean }[] }[];
};

const PAID: Record<ServerOrder['payMethod'], Payment> = { mtn: 'MTN MoMo', airtel: 'Airtel Money', wallet: 'Wallet', cash: 'Cash on delivery' };
// Waiting for MoMo and cancelled orders aren't on the board.
const STATUS: Partial<Record<ServerStatus, Status>> = { cooking: 'cooking', ready: 'ready', picked_up: 'picked', at_gate: 'picked', delivered: 'delivered' };
const SECTIONS: Dish['section'][] = ['Popular', 'Mains', 'Drinks'];

const ms = (t: string | null) => (t ? new Date(t).getTime() : undefined);

// One server order as a board order. What only this phone knows (seen, swap, extra time) carries over.
function fromServer(so: ServerOrder, was?: Order): Order | null {
  const status = STATUS[so.status];
  if (!status) return null;
  const inAt = ms(so.times.paid) ?? ms(so.times.placed) ?? Date.now();
  const dueAt = was?.dueAt ?? inAt + 15 * MIN;
  const pickedAt = ms(so.times.pickedUp);
  const notes = [so.note, ...so.lines.filter((l) => l.note).map((l) => `${l.name}: ${l.note}`)].filter(Boolean);
  return {
    ...was,
    id: String(so.number),
    serverId: so.id,
    student: so.student.name ?? 'Student',
    place: so.dropPoint.name,
    items: so.lines.map((l) => {
      const extras = [...l.extras.map((e) => e.name), ...(l.pepper ? [l.pepper === 'None' ? 'No pepper' : `${l.pepper} pepper`] : [])];
      return { qty: l.quantity, name: l.name, price: l.unitPrice, ...(extras.length ? { extras } : {}) };
    }),
    note: notes.length ? notes.join(' ') : undefined,
    paid: PAID[so.payMethod],
    inAt,
    dueAt,
    status,
    readyAt: ms(so.times.ready),
    pickedAt,
    deliveredAt: ms(so.times.delivered),
    // The server doesn't know when the rider reaches the hatch yet, so expect them when the food is due.
    rider: so.rider ? { name: so.rider.name ?? 'Rider', arrivesAt: pickedAt ?? dueAt } : undefined,
    sale: { subtotal: so.subtotal, total: so.total, payMethod: so.payMethod, paid: so.paid },
  };
}

// Adds or updates one order. `arriving` marks a new one as just in, so the bell rings for it.
function upsert(board: Order[], so: ServerOrder, arriving: boolean) {
  const was = board.find((o) => o.serverId === so.id);
  const next = fromServer(so, was);
  if (!next) return board.filter((o) => o !== was);
  if (!was) return [...board, arriving ? { ...next, live: true } : { ...next, seenAt: next.inAt }];
  return board.map((o) => (o === was ? next : o));
}

function menuFromServer(k: ServerKitchen) {
  const dishes: Dish[] = k.menu.map((d) => ({
    id: d.id,
    name: d.name,
    section: SECTIONS.includes(d.category as Dish['section']) ? (d.category as Dish['section']) : 'Mains',
    price: d.price,
    minutes: d.prepMinutes,
    extras: d.extras.length,
    hasPhoto: !!photoFor(d.name),
    soldOut: d.soldOut,
  }));
  const extras = new Map<string, Extra>();
  for (const d of k.menu) {
    for (const e of d.extras) {
      const x = extras.get(e.id) ?? { id: e.id, name: e.name, price: e.price, soldOut: true, dishIds: [] };
      x.dishIds!.push(d.id);
      // On sale if any dish still offers it.
      x.soldOut = x.soldOut && e.soldOut;
      extras.set(e.id, x);
    }
  }
  return { dishes, extras: [...extras.values()] };
}

type Kitchen = {
  // The signed-in counter account. Always null without the server.
  user: ServerUser | null;
  // On the server, while the saved sign-in is being read back at start. Nothing shows meanwhile.
  restoring: boolean;
  signIn: (user: ServerUser) => void;
  signOut: () => void;
  // "Nakawa Kitchen", or the signed-in kitchen's name from the server.
  kitchenName: string;
  // On the server: the last try to load the board couldn't reach it. Always false without the server.
  offline: boolean;
  now: number;
  orders: Order[];
  settings: Settings;
  dishes: Dish[];
  extras: Extra[];
  toast: string | null;
  hears: Hears;
  setHears: (key: RowKey, device: Device, value: boolean) => void;
  markSeen: (id: string) => void;
  // On the server: the counter's Bluetooth printer, if one has been picked, and printing to it.
  printer: PairedDevice | null;
  setPrinter: (p: PairedDevice | null) => void;
  print: (id: string) => void;
  testPrint: () => void;
  askSwap: (id: string, item: string) => void;
  setSetting: (key: keyof Settings, value: boolean) => void;
  markReady: (id: string) => void;
  addTime: (id: string) => void;
  accept: (id: string, minutes: number) => void;
  decline: (id: string) => void;
  toggleDish: (id: string) => void;
  toggleExtra: (id: string) => void;
  notify: (message: string) => void;
};

const KitchenContext = createContext<Kitchen | null>(null);

export function KitchenProvider({ children }: { children: ReactNode }) {
  const [start] = useState(demoNow);
  const [now, setNow] = useState(start);
  const [orders, setOrders] = useState<Order[]>(() => (onServer ? [] : seed(start)));
  const [settings, setSettings] = useState<Settings>({ open: true, autoAccept: true, printTicket: true, printSeal: true, addToPOS: true });
  const [dishes, setDishes] = useState(onServer ? [] : DISHES);
  const [extras, setExtras] = useState(onServer ? [] : EXTRAS);
  const [toast, setToast] = useState<string | null>(null);
  const [hears, setHearsState] = useState<Hears>(defaultHears);
  const [user, setUser] = useState<ServerUser | null>(null);
  const [restoring, setRestoring] = useState(onServer);
  const [kitchenName, setKitchenName] = useState('Nakawa Kitchen');
  const [offline, setOffline] = useState(false);
  const arrived = useRef(0);
  const nextSale = useRef(1095);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const notify = useCallback((message: string) => setToast(message), []);

  // A refused call: show the server's words, or back to sign in when the session has gone.
  const fail = useCallback((e: unknown) => {
    if (e instanceof ServerError && e.status === 401) {
      setToken(null);
      setUser(null);
      void saveSession(null);
    }
    setToast(e instanceof ServerError ? e.message : 'Something went wrong. Try again.');
  }, []);

  // Signed in: kept on the phone so the counter opens straight onto the board next time.
  const signIn = useCallback((u: ServerUser) => {
    setUser(u);
    const t = getToken();
    if (t) void saveSession({ token: t, user: u });
  }, []);

  const signOut = useCallback(() => {
    if (getToken()) void api('POST', '/auth/sign-out', undefined, 5000).catch(() => {});
    setToken(null);
    setUser(null);
    void saveSession(null);
  }, []);

  // At start, on the server: the saved sign-in, if any. With the account saved alongside the token
  // the board shows at once and GET /me checks it in the background; a server that can't be reached
  // never holds the app up (the board retries on its own). 401 means signed out elsewhere.
  useEffect(() => {
    if (!onServer) return;
    let gone = false;
    const restore = async () => {
      const saved = await loadSession();
      if (gone) return;
      if (!saved) {
        setRestoring(false);
        return;
      }
      setToken(saved.token);
      if (saved.user) {
        setUser(saved.user);
        setRestoring(false);
      }
      try {
        const me = await api<ServerUser>('GET', '/me', undefined, 8000);
        if (gone) return;
        if (me.role !== 'kitchen') throw new ServerError(401, 'Sign in with the kitchen’s number.');
        setUser((u) => (u && u.id === me.id && u.kitchenId === me.kitchenId && u.name === me.name ? u : me));
        void saveSession({ token: saved.token, user: me });
      } catch (e) {
        if (gone) return;
        if (e instanceof ServerError && e.status === 401) {
          setToken(null);
          setUser(null);
          void saveSession(null);
        }
        // Unreachable with no saved account: back to sign in rather than wait.
      } finally {
        if (!gone) setRestoring(false);
      }
    };
    void restore();
    return () => {
      gone = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // On the server: today's board, then each change as it happens. A reconnect reloads the whole
  // board in case something changed while the signal was gone.
  useEffect(() => {
    if (!onServer || !user) return;
    let loaded = false;
    let menuLoaded = false;
    let gone = false;
    // The menu and the Open switch, until they've loaded once (they may not at a start with no signal).
    const loadKitchen = () =>
      api<ServerKitchen[]>('GET', '/kitchens')
        .then((all) => {
          const mine = all.find((k) => k.id === user.kitchenId);
          if (!mine || gone) return;
          menuLoaded = true;
          if (mine.name) setKitchenName(mine.name);
          const menu = menuFromServer(mine);
          setDishes(menu.dishes);
          setExtras(menu.extras);
          setSettings((s) => ({ ...s, open: mine.open }));
        })
        .catch((e) => {
          // No signal shows on the board already (see reload).
          if (!gone && !(e instanceof ServerError && e.status === 0)) fail(e);
        });
    const reload = async () => {
      if (!menuLoaded) void loadKitchen();
      try {
        const list = await api<ServerOrder[]>('GET', '/kitchen/orders');
        if (gone) return;
        setOffline(false);
        const arriving = loaded;
        loaded = true;
        setOrders((board) => {
          const kept = board.filter((o) => list.some((so) => so.id === o.serverId));
          return list.reduce((b, so) => upsert(b, so, arriving), kept);
        });
      } catch (e) {
        if (gone) return;
        if (e instanceof ServerError && e.status === 0) {
          // Shown on the board instead of a toast; the live connection retries and reloads.
          setOffline(true);
          if (!retry) retry = setTimeout(() => {
            retry = null;
            void reload();
          }, 15_000);
          return;
        }
        fail(e);
      }
    };
    let retry: ReturnType<typeof setTimeout> | null = null;
    void reload();
    // A safety net under the live connection: phone networks can drop a quiet socket without
    // either side noticing, and a missed order is the worst thing that can happen at a counter.
    const poll = setInterval(() => void reload(), 30_000);
    const stop = connectLive((m) => {
      if (m.type === 'hello') void reload();
      if (m.type !== 'order' || m.order.kitchen.id !== user.kitchenId) return;
      const so = m.order;
      setOrders((board) => {
        const was = board.find((o) => o.serverId === so.id);
        if (so.status === 'cancelled' && was && (was.status === 'cooking' || was.status === 'ready')) setToast(`Order ${was.id} was cancelled. Don’t send it.`);
        return upsert(board, so, true);
      });
    });
    return () => {
      gone = true;
      if (retry) clearTimeout(retry);
      clearInterval(poll);
      stop();
      setOrders([]);
      setOffline(false);
    };
  }, [user, fail]);

  // The clock, plus what riders and new orders do on their own. On the server only the clock:
  // riders and students move orders on for real.
  useEffect(() => {
    const tick = setInterval(() => {
      const t = demoNow();
      setNow(t);
      if (onServer) return;
      setOrders((list) =>
        list.map((o) => {
          if (o.status === 'incoming' && o.acceptBy && t > o.acceptBy) return { ...o, status: 'declined' };
          // The rider scans the bag seal when they arrive, so the kitchen never taps "Picked up".
          if (o.status === 'ready' && o.rider && t >= o.rider.arrivesAt + 2 * MIN) return { ...o, status: 'picked', pickedAt: t };
          if (o.status === 'picked' && o.pickedAt && t >= o.pickedAt + 6 * MIN) return { ...o, status: 'delivered', deliveredAt: t };
          if (o.swap && !o.swap.chose && t >= o.swap.askedAt + SWAP_ANSWER) return { ...o, swap: { ...o.swap, chose: SWAPS[o.swap.item] ?? 'Katogo' } };
          return o;
        }),
      );
    }, 5000);
    return () => clearInterval(tick);
  }, []);

  // Sample orders arriving, only without the server.
  useEffect(() => {
    if (onServer) return;
    const arrive = () => {
      if (!settingsRef.current.open || arrived.current >= ARRIVALS.length) return;
      const next = ARRIVALS[arrived.current++];
      const t = demoNow();
      const auto = settingsRef.current.autoAccept;
      const printed = auto && settingsRef.current.printTicket && !PRINT_FAILS.has(next.id);
      const order: Order = {
        ...next,
        inAt: t,
        dueAt: t + 15 * MIN,
        status: auto ? 'cooking' : 'incoming',
        acceptBy: auto ? undefined : t + 2 * MIN,
        posSale: auto && settingsRef.current.addToPOS ? nextSale.current++ : undefined,
        live: true,
        printed,
        // The printed ticket is the confirmation. No print means someone has to tap it.
        seenAt: printed ? t : undefined,
      };
      // The bell, the Just in card and the counter toast announce it (see components/alerts.tsx).
      setOrders((list) => [...list, order]);
    };
    const first = setTimeout(arrive, 25_000);
    const every = setInterval(arrive, 90_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);

  const update = useCallback((id: string, change: (o: Order) => Order) => setOrders((list) => list.map((o) => (o.id === id ? change(o) : o))), []);

  // ---- Printing (server only) ----
  const [printer, setPrinterState] = useState<PairedDevice | null>(null);
  useEffect(() => {
    if (onServer && canPrint) void savedPrinter().then(setPrinterState);
  }, []);
  // The printed ticket is the confirmation, like the sample: it stops the new-order bell.
  const runPrint = useCallback(
    async (o: Order, pieces: { ticket: boolean; seal: boolean }) => {
      try {
        await printOrder(o, kitchenName, pieces);
        update(o.id, (x) => ({ ...x, printed: true, seenAt: x.seenAt ?? demoNow() }));
        return true;
      } catch (e) {
        update(o.id, (x) => ({ ...x, printed: false }));
        setToast(`Order ${o.id} didn’t print. ${e instanceof Error ? e.message : ''}`.trim());
        return false;
      }
    },
    [kitchenName, update],
  );
  // Each order that arrives while the app is open prints once, as it comes in.
  const queued = useRef(new Set<string>());
  useEffect(() => {
    if (!onServer || !printer) return;
    const pieces = { ticket: settings.printTicket, seal: settings.printSeal };
    if (!pieces.ticket && !pieces.seal) return;
    for (const o of orders) {
      if (!o.live || o.printed !== undefined || o.status !== 'cooking' || queued.current.has(o.id)) continue;
      queued.current.add(o.id);
      void runPrint(o, pieces);
    }
  }, [orders, printer, settings.printTicket, settings.printSeal, runPrint]);

  // Server calls change the screen first and put it back if the server says no.
  const send = useCallback(
    (path: string, body: unknown, undo: () => void) =>
      api('PATCH', path, body).catch((e) => {
        undo();
        fail(e);
      }),
    [fail],
  );

  const value = useMemo<Kitchen>(
    () => ({
      user,
      restoring,
      signIn,
      signOut,
      kitchenName,
      offline,
      now,
      orders,
      settings,
      dishes,
      extras,
      toast,
      notify,
      hears,
      setHears: (key, device, v) => setHearsState((h) => ({ ...h, [key]: { ...h[key], [device]: v } })),
      markSeen: (id) => {
        const t = demoNow();
        update(id, (o) => (o.seenAt ? o : { ...o, seenAt: t }));
      },
      printer,
      setPrinter: (p) => {
        setPrinterState(p);
        void choosePrinter(p);
      },
      print: (id) => {
        const o = orders.find((x) => x.id === id);
        if (o) void runPrint(o, { ticket: true, seal: true }).then((ok) => ok && setToast(`Order ${o.id} printed again`));
      },
      testPrint: () => {
        printTest(kitchenName).then(
          () => setToast('Test page sent to the printer'),
          (e: unknown) => setToast(e instanceof Error ? e.message : 'The printer didn’t answer.'),
        );
      },
      askSwap: (id, item) => update(id, (o) => ({ ...o, swap: { item, askedAt: demoNow() } })),
      setSetting: (key, v) => {
        setSettings((s) => ({ ...s, [key]: v }));
        // Only Open reaches the server; printing and POS are this phone's for now.
        if (onServer && key === 'open') void send('/kitchen', { open: v }, () => setSettings((s) => ({ ...s, open: !v })));
      },
      markReady: (id) => {
        const t = demoNow();
        if (onServer) {
          const was = orders.find((o) => o.id === id);
          if (!was?.serverId || was.status !== 'cooking') return;
          update(id, (o) => ({ ...o, status: 'ready', readyAt: t }));
          api<ServerOrder>('POST', `/kitchen/orders/${was.serverId}/ready`)
            .then((so) => setOrders((board) => upsert(board, so, false)))
            .catch((e) => {
              update(id, (o) => ({ ...o, status: was.status, readyAt: was.readyAt }));
              fail(e);
            });
          return;
        }
        update(id, (o) => ({ ...o, status: 'ready', readyAt: t, rider: o.rider ?? { name: RIDERS[Number(o.id) % RIDERS.length], arrivesAt: t + 3 * MIN } }));
      },
      addTime: (id) => update(id, (o) => ({ ...o, dueAt: o.dueAt + 5 * MIN })),
      accept: (id, minutes) => {
        const t = demoNow();
        update(id, (o) => ({ ...o, status: 'cooking', inAt: t, dueAt: t + minutes * MIN, acceptBy: undefined, seenAt: t, printed: settingsRef.current.printTicket, posSale: settingsRef.current.addToPOS ? nextSale.current++ : undefined }));
      },
      decline: (id) => update(id, (o) => ({ ...o, status: 'declined' })),
      toggleDish: (id) => {
        const flip = () => setDishes((list) => list.map((d) => (d.id === id ? { ...d, soldOut: !d.soldOut, backTomorrow: false } : d)));
        flip();
        const d = dishes.find((x) => x.id === id);
        if (onServer && d) void send(`/kitchen/dishes/${encodeURIComponent(id)}`, { soldOut: !d.soldOut }, flip);
      },
      toggleExtra: (id) => {
        const flip = () => setExtras((list) => list.map((e) => (e.id === id ? { ...e, soldOut: !e.soldOut } : e)));
        flip();
        const e = extras.find((x) => x.id === id);
        if (!onServer || !e) return;
        // Every dish that offers it, all or nothing as far as the screen goes.
        let undone = false;
        const undo = () => {
          if (undone) return;
          undone = true;
          flip();
        };
        for (const dishId of e.dishIds ?? []) void send(`/kitchen/dishes/${encodeURIComponent(dishId)}/extras/${encodeURIComponent(id)}`, { soldOut: !e.soldOut }, undo);
      },
    }),
    [user, restoring, signIn, signOut, kitchenName, offline, now, orders, settings, dishes, extras, toast, notify, update, hears, send, fail, printer, runPrint],
  );

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>;
}

export function useKitchen() {
  const k = useContext(KitchenContext);
  if (!k) throw new Error('useKitchen must be used inside KitchenProvider');
  return k;
}

// Riders reaching the hatch within `within` ms, each with the bags they collect.
export function ridersDue(orders: Order[], now: number, within = 2 * MIN) {
  // The server doesn't say when a rider reaches the hatch yet, so there's nothing to count down to.
  if (onServer) return [];
  const runs = new Map<string, { name: string; arrivesAt: number; orders: Order[] }>();
  for (const o of orders) {
    if (!o.rider || (o.status !== 'cooking' && o.status !== 'ready')) continue;
    const left = o.rider.arrivesAt - now;
    if (left <= 0 || left > within) continue;
    const key = `${o.rider.name}-${o.rider.arrivesAt}`;
    const run = runs.get(key) ?? { name: o.rider.name, arrivesAt: o.rider.arrivesAt, orders: [] };
    run.orders.push(o);
    runs.set(key, run);
  }
  return [...runs.entries()].map(([key, r]) => ({ key, ...r, unready: r.orders.filter((o) => o.status !== 'ready') })).sort((a, b) => a.arrivesAt - b.arrivesAt);
}

// Cooking orders in the order to cook them: first in, first out.
export function cookingQueue(orders: Order[]) {
  return orders.filter((o) => o.status === 'cooking').sort((a, b) => a.inAt - b.inAt || a.dueAt - b.dueAt);
}

// Cook now names on the phone, where space is tight.
const SHORT: Record<string, string> = { 'Special rolex': 'Rolex', 'Chicken pilau': 'Pilau', 'Passion juice': 'Juice' };
export function shortName(name: string) {
  return SHORT[name] ?? name;
}

// The order the cook-now strip lists dishes in, as on the canvas.
const COOK_ORDER = ['Special rolex', 'Chicken pilau', 'Katogo', 'Passion juice', 'Soda'];
const cookRank = (name: string) => (COOK_ORDER.includes(name) ? COOK_ORDER.indexOf(name) : COOK_ORDER.length);

// "4 Special rolex" totals across everything being cooked, with extras counted per dish.
export function cookNow(orders: Order[]) {
  const totals = new Map<string, { qty: number; extras: Map<string, number> }>();
  for (const o of cookingQueue(orders)) {
    for (const i of o.items) {
      const row = totals.get(i.name) ?? { qty: 0, extras: new Map() };
      row.qty += i.qty;
      for (const e of i.extras ?? []) if (!e.startsWith('No ')) row.extras.set(e, (row.extras.get(e) ?? 0) + i.qty);
      totals.set(i.name, row);
    }
  }
  return [...totals.entries()].sort((a, b) => cookRank(a[0]) - cookRank(b[0])).map(([name, r]) => ({ name, qty: r.qty, extras: [...r.extras.entries()].map(([e, n]) => `${n} ${e.toLowerCase()}`) }));
}
