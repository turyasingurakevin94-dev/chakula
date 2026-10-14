import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

// Everything here is sample data held in memory, like the student app. Times are set relative to
// when the app opens, so the board always looks like a lunch rush in progress.

const MIN = 60_000;

// The demo opens at 12:38 today, the moment the design canvas shows, and runs in real time from there.
const opened = new Date();
const CLOCK_OFFSET = new Date(opened.getFullYear(), opened.getMonth(), opened.getDate(), 12, 38).getTime() - opened.getTime();
export function demoNow() {
  return Date.now() + CLOCK_OFFSET;
}

export type Item = { qty: number; name: string; extras?: string[]; price: number };
export type Payment = 'MTN MoMo' | 'Airtel Money' | 'Wallet' | 'Cash on delivery';
export type Status = 'incoming' | 'cooking' | 'ready' | 'picked' | 'delivered' | 'declined';

export type Order = {
  id: string;
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

export type Extra = { id: string; name: string; price: number; soldOut: boolean };

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

// Orders served earlier today, before the ones on the board.
export const SERVED_EARLIER = 48;

type Kitchen = {
  now: number;
  orders: Order[];
  settings: Settings;
  dishes: Dish[];
  extras: Extra[];
  toast: string | null;
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
  const [orders, setOrders] = useState<Order[]>(() => seed(start));
  const [settings, setSettings] = useState<Settings>({ open: true, autoAccept: true, printTicket: true, printSeal: true, addToPOS: true });
  const [dishes, setDishes] = useState(DISHES);
  const [extras, setExtras] = useState(EXTRAS);
  const [toast, setToast] = useState<string | null>(null);
  const arrived = useRef(0);
  const nextSale = useRef(1095);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // The clock, plus what riders and new orders do on their own.
  useEffect(() => {
    const tick = setInterval(() => {
      const t = demoNow();
      setNow(t);
      setOrders((list) =>
        list.map((o) => {
          if (o.status === 'incoming' && o.acceptBy && t > o.acceptBy) return { ...o, status: 'declined' };
          // The rider scans the bag seal when they arrive, so the kitchen never taps "Picked up".
          if (o.status === 'ready' && o.rider && t >= o.rider.arrivesAt + 2 * MIN) return { ...o, status: 'picked', pickedAt: t };
          if (o.status === 'picked' && o.pickedAt && t >= o.pickedAt + 6 * MIN) return { ...o, status: 'delivered', deliveredAt: t };
          return o;
        }),
      );
    }, 5000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const arrive = () => {
      if (!settingsRef.current.open || arrived.current >= ARRIVALS.length) return;
      const next = ARRIVALS[arrived.current++];
      const t = demoNow();
      const auto = settingsRef.current.autoAccept;
      const order: Order = {
        ...next,
        inAt: t,
        dueAt: t + 15 * MIN,
        status: auto ? 'cooking' : 'incoming',
        acceptBy: auto ? undefined : t + 2 * MIN,
        posSale: auto && settingsRef.current.addToPOS ? nextSale.current++ : undefined,
      };
      setOrders((list) => [...list, order]);
      if (auto) setToast(`New order ${order.id} accepted${settingsRef.current.printTicket ? ' and printed' : ''}`);
    };
    const first = setTimeout(arrive, 25_000);
    const every = setInterval(arrive, 90_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);

  const update = useCallback((id: string, change: (o: Order) => Order) => setOrders((list) => list.map((o) => (o.id === id ? change(o) : o))), []);

  const value = useMemo<Kitchen>(
    () => ({
      now,
      orders,
      settings,
      dishes,
      extras,
      toast,
      notify,
      setSetting: (key, v) => setSettings((s) => ({ ...s, [key]: v })),
      markReady: (id) => {
        const t = demoNow();
        update(id, (o) => ({ ...o, status: 'ready', readyAt: t, rider: o.rider ?? { name: RIDERS[Number(o.id) % RIDERS.length], arrivesAt: t + 3 * MIN } }));
      },
      addTime: (id) => update(id, (o) => ({ ...o, dueAt: o.dueAt + 5 * MIN })),
      accept: (id, minutes) => {
        const t = demoNow();
        update(id, (o) => ({ ...o, status: 'cooking', inAt: t, dueAt: t + minutes * MIN, acceptBy: undefined, posSale: settingsRef.current.addToPOS ? nextSale.current++ : undefined }));
      },
      decline: (id) => update(id, (o) => ({ ...o, status: 'declined' })),
      toggleDish: (id) => setDishes((list) => list.map((d) => (d.id === id ? { ...d, soldOut: !d.soldOut, backTomorrow: false } : d))),
      toggleExtra: (id) => setExtras((list) => list.map((e) => (e.id === id ? { ...e, soldOut: !e.soldOut } : e))),
    }),
    [now, orders, settings, dishes, extras, toast, notify, update],
  );

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>;
}

export function useKitchen() {
  const k = useContext(KitchenContext);
  if (!k) throw new Error('useKitchen must be used inside KitchenProvider');
  return k;
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
