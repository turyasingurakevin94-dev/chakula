import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { unitPrice, type OrderLine } from './account';
import { findRestaurant, student, type MenuItem } from './data';

// The same dish with different extras, pepper or note is a separate line.
export type CartLine = OrderLine & { key: string };

type Options = Pick<OrderLine, 'extras' | 'pepper' | 'note'>;

function lineKey(itemId: string, o: Options = {}) {
  const extras = (o.extras ?? []).map((e) => e.id).sort().join('+');
  return [itemId, extras, o.pepper ?? '', (o.note ?? '').trim().toLowerCase()].join('|');
}

type CartState = {
  restaurantId: string | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  freeDelivery: boolean;
  total: number;
  quantityOf: (itemId: string) => number;
  add: (restaurantId: string, item: MenuItem, options?: Options, quantity?: number) => void;
  remove: (itemId: string) => void;
  clear: () => void;
  refill: (restaurantId: string, lines: OrderLine[]) => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const subtotal = lines.reduce((n, l) => n + l.quantity * unitPrice(l), 0);
    const deliveryFee = restaurantId ? findRestaurant(restaurantId)?.deliveryFee ?? 0 : 0;
    const freeDelivery = student.freeDeliveriesLeft > 0 || deliveryFee === 0;
    return {
      restaurantId,
      lines,
      count,
      subtotal,
      deliveryFee,
      freeDelivery,
      total: subtotal + (freeDelivery ? 0 : deliveryFee),
      quantityOf: (itemId) => lines.filter((l) => l.item.id === itemId).reduce((n, l) => n + l.quantity, 0),
      add: (rid, item, options = {}, quantity = 1) => {
        const line: CartLine = { ...options, item, quantity, key: lineKey(item.id, options) };
        // A basket holds one restaurant's food, so one rider can bring it in one trip.
        if (rid !== restaurantId) {
          setRestaurantId(rid);
          setLines([line]);
          return;
        }
        setLines((prev) => {
          if (!prev.some((l) => l.key === line.key)) return [...prev, line];
          return prev.map((l) => (l.key === line.key ? { ...l, quantity: l.quantity + quantity } : l));
        });
      },
      // Takes one off the most recently added line for this dish.
      remove: (itemId) =>
        setLines((prev) => {
          const i = prev.map((l) => l.item.id).lastIndexOf(itemId);
          if (i < 0) return prev;
          return prev.map((l, j) => (j === i ? { ...l, quantity: l.quantity - 1 } : l)).filter((l) => l.quantity > 0);
        }),
      clear: () => {
        setLines([]);
        setRestaurantId(null);
      },
      refill: (rid, next) => {
        setRestaurantId(rid);
        setLines(next.map((l) => ({ ...l, key: lineKey(l.item.id, l) })));
      },
    };
  }, [lines, restaurantId]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
