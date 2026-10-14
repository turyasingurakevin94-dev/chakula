import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { findSpecial, type Extra, type MenuItem } from './data';
import { findPlanKind, planMeals, planPrice, type PlanKindId, type PlanPeriod } from './plans';

// Prototype account state, kept in memory. Sign-in, wallet and orders move to the backend later.

export type Place = { id: string; name: string; detail: string };

export const places: Place[] = [
  { id: 'block-b', name: 'Block B Hostel', detail: 'Nakawa · 4 min from most kitchens' },
  { id: 'block-c', name: 'Block C Hostel', detail: 'Nakawa · 6 min from most kitchens' },
  { id: 'campus', name: 'Main campus', detail: 'Library, lecture blocks, sports ground' },
];

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
};

export type Preorder = { id: string; specialId: string; slot: string };

export type WalletEntry = { id: string; title: string; when: string; amount: number };

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

export function isWaiting(order: Order, now: number) {
  return now < deliveryStart(order);
}

export function minutesLeft(order: Order, now: number) {
  return Math.min(DELIVERY_MINUTES, Math.max(0, DELIVERY_MINUTES - Math.floor((now - deliveryStart(order)) / DEMO_MINUTE_MS)));
}

const day = 24 * 60 * 60 * 1000;

function sampleOrders(): Order[] {
  const item = (id: string, name: string, price: number, tint: string): MenuItem => ({ id, name, price, tint, description: '', category: 'Popular' });
  const rated = (stars: number): Rating => ({ stars, tags: [], tip: 0 });
  // daysAgo at a clock time, so "Your usual" has a breakfast, a lunch and a supper habit to find.
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(Date.now() - daysAgo * day);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  };
  const rolexAndTea = () => [{ item: item('rolex-classic', 'Classic rolex', 3000, '#FFE4D6'), quantity: 2 }, { item: item('tea', 'African tea', 1500, '#E3EBDD'), quantity: 1 }];
  const pilauAndJuice = () => [{ item: item('pilau', 'Chicken pilau', 9000, '#F4E7C5'), quantity: 1 }, { item: item('passion', 'Passion juice', 3000, '#FFE4D6'), quantity: 1 }];
  return [
    { id: '2041', restaurantId: 'rolex-corner', placedAt: at(1, 8, 10), delivered: true, total: 7500, method: 'mtn', lines: rolexAndTea() },
    { id: '2037', restaurantId: 'nakawa-kitchen', placedAt: at(2, 19, 30), delivered: true, rating: rated(5), total: 12000, method: 'mtn', lines: pilauAndJuice() },
    { id: '2033', restaurantId: 'green-bowl', placedAt: at(2, 13, 15), delivered: true, rating: rated(4), total: 19000, method: 'mtn', lines: [{ item: item('bowl', 'Chicken power bowl', 14000, '#E3EBDD'), quantity: 1 }, { item: item('mango', 'Mango smoothie', 5000, '#F4E7C5'), quantity: 1 }] },
    { id: '2026', restaurantId: 'rolex-corner', placedAt: at(3, 7, 50), delivered: true, rating: rated(5), total: 7500, method: 'mtn', lines: rolexAndTea() },
    { id: '2019', restaurantId: 'nakawa-kitchen', placedAt: at(5, 20, 5), delivered: true, rating: rated(5), total: 12000, method: 'mtn', lines: pilauAndJuice() },
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
  portionsLeft: (specialId: string) => number;
  startSignIn: (phone: string) => void;
  verify: () => void;
  saveProfile: (name: string, place: Place, room: string, note: string) => void;
  signOut: () => void;
  // Credits the amount plus any bonus, and returns the bonus.
  topUp: (amount: number) => number;
  withdraw: (amount: number) => void;
  startPlan: (kindId: PlanKindId, period: PlanPeriod) => void;
  togglePlanPause: () => void;
  chooseMeal: (day: string, dishId: string) => void;
  skipMeal: (day: string) => void;
  unskipMeal: (day: string) => void;
  // Returns the new order's id. Wallet orders are charged straight away.
  placeOrder: (order: Omit<Order, 'id' | 'placedAt' | 'delivered'>) => string;
  // Takes back an order placed by mistake and refunds a wallet charge.
  cancelOrder: (id: string) => void;
  markDelivered: (id: string) => void;
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
  const [balance, setBalance] = useState(4500);
  const [wallet, setWallet] = useState<WalletEntry[]>([{ id: 'w1', title: 'Welcome credit', when: 'When you joined', amount: 4500 }]);
  const [bonusEarned, setBonusEarned] = useState(0);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [preorders, setPreorders] = useState<Preorder[]>([]);

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
      portionsLeft: (sid) => Math.max(0, (findSpecial(sid)?.portions ?? 0) - preorders.filter((p) => p.specialId === sid).length),
      startSignIn: (p) => {
        setPhone(p);
        setVerified(false);
      },
      verify: () => setVerified(true),
      saveProfile: (n, pl, r, nt) => {
        setName(n.trim());
        setPlace(pl);
        setRoom(r.trim());
        setNote(nt.trim());
      },
      signOut: () => {
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
        const id = String(Math.max(2047, ...orders.map((p) => Number(p.id))) + 1);
        setOrders((prev) => [{ ...o, id, placedAt: Date.now(), delivered: false }, ...prev.map((p) => ({ ...p, delivered: true }))]);
        if (o.method === 'wallet') {
          setBalance((b) => b - o.total);
          setWallet((w) => [{ id: `o${id}`, title: `Order #${id}`, when: 'Just now', amount: -o.total }, ...w]);
        }
        return id;
      },
      cancelOrder: (id) => {
        const order = orders.find((p) => p.id === id);
        if (!order) return;
        setOrders((prev) => prev.filter((p) => p.id !== id));
        if (order.method === 'wallet') {
          setBalance((b) => b + order.total);
          setWallet((w) => w.filter((e) => e.id !== `o${id}`));
        }
      },
      markDelivered: (id) => setOrders((prev) => prev.map((p) => (p.id === id ? { ...p, delivered: true } : p))),
      rateOrder: (id, rating) => {
        setOrders((prev) => prev.map((p) => (p.id === id ? { ...p, rating } : p)));
        // Prototype: tips come out of the wallet. Later the student picks how to pay it.
        if (rating.tip > 0) {
          setBalance((b) => b - rating.tip);
          setWallet((w) => [{ id: `tip${id}`, title: `Tip for Brian, #${id}`, when: 'Just now', amount: -rating.tip }, ...w]);
        }
      },
      preorder: (sid, slot) => setPreorders((prev) => [{ id: `p${Date.now()}`, specialId: sid, slot }, ...prev]),
      cancelPreorder: (id) => setPreorders((prev) => prev.filter((p) => p.id !== id)),
    };
  }, [phone, verified, name, place, room, note, balance, wallet, bonusEarned, plan, orders, preorders]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
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
