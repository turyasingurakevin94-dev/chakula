import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { findSpecial, type Extra, type MenuItem } from './data';

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

export type Order = {
  id: string;
  restaurantId: string;
  lines: OrderLine[];
  total: number;
  placedAt: number;
  delivered: boolean;
  rating?: Rating;
};

export type Preorder = { id: string; specialId: string; slot: string };

export type WalletEntry = { id: string; title: string; when: string; amount: number };

// Demo pacing: one "minute" of delivery passes every 4 seconds, so a whole delivery fits in a test run.
export const DEMO_MINUTE_MS = 4000;
export const DELIVERY_MINUTES = 8;

export function minutesLeft(order: Order, now: number) {
  return Math.max(0, DELIVERY_MINUTES - Math.floor((now - order.placedAt) / DEMO_MINUTE_MS));
}

const day = 24 * 60 * 60 * 1000;

function sampleOrders(): Order[] {
  const item = (id: string, name: string, price: number, tint: string): MenuItem => ({ id, name, price, tint, description: '', category: 'Popular' });
  const rated = (stars: number): Rating => ({ stars, tags: [], tip: 0 });
  const now = Date.now();
  return [
    { id: '2041', restaurantId: 'rolex-corner', placedAt: now - day, delivered: true, rating: rated(5), total: 7500, lines: [{ item: item('rolex-classic', 'Classic rolex', 3000, '#FFE4D6'), quantity: 2 }, { item: item('tea', 'African tea', 1500, '#E3EBDD'), quantity: 1 }] },
    { id: '2033', restaurantId: 'green-bowl', placedAt: now - 2 * day, delivered: true, rating: rated(4), total: 19000, lines: [{ item: item('bowl', 'Chicken power bowl', 14000, '#E3EBDD'), quantity: 1 }, { item: item('mango', 'Mango smoothie', 5000, '#F4E7C5'), quantity: 1 }] },
    { id: '2019', restaurantId: 'nakawa-kitchen', placedAt: now - 5 * day, delivered: true, rating: rated(5), total: 12000, lines: [{ item: item('pilau', 'Chicken pilau', 9000, '#F4E7C5'), quantity: 1 }, { item: item('passion', 'Passion juice', 3000, '#FFE4D6'), quantity: 1 }] },
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
  hasToppedUp: boolean;
  orders: Order[];
  activeOrder: Order | null;
  preorders: Preorder[];
  portionsLeft: (specialId: string) => number;
  startSignIn: (phone: string) => void;
  verify: () => void;
  saveProfile: (name: string, place: Place, room: string, note: string) => void;
  signOut: () => void;
  topUp: (amount: number) => void;
  placeOrder: (order: Omit<Order, 'id' | 'placedAt' | 'delivered'>, paidFromWallet: boolean) => void;
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
  const [hasToppedUp, setHasToppedUp] = useState(false);
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
      hasToppedUp,
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
        const bonus = hasToppedUp ? 0 : 2000;
        setBalance((b) => b + amount + bonus);
        setWallet((w) => [
          ...(bonus ? [{ id: `b${Date.now()}`, title: 'First top up bonus', when: 'Just now', amount: bonus }] : []),
          { id: `t${Date.now()}`, title: 'Top up from MTN', when: 'Just now', amount },
          ...w,
        ]);
        setHasToppedUp(true);
      },
      placeOrder: (o, paidFromWallet) => {
        const id = String(2048 + orders.length - 3);
        setOrders((prev) => [{ ...o, id, placedAt: Date.now(), delivered: false }, ...prev.map((p) => ({ ...p, delivered: true }))]);
        if (paidFromWallet) {
          setBalance((b) => b - o.total);
          setWallet((w) => [{ id: `o${id}`, title: `Order #${id}`, when: 'Just now', amount: -o.total }, ...w]);
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
  }, [phone, verified, name, place, room, note, balance, wallet, hasToppedUp, orders, preorders]);

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

export function formatWhen(time: number, now = Date.now()) {
  const days = Math.floor((now - time) / day);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
