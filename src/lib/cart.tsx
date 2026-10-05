import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { findRestaurant, student, type MenuItem } from './data';

type CartLine = { item: MenuItem; quantity: number };

type CartState = {
  restaurantId: string | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  freeDelivery: boolean;
  total: number;
  quantityOf: (itemId: string) => number;
  add: (restaurantId: string, item: MenuItem) => void;
  remove: (itemId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const subtotal = lines.reduce((n, l) => n + l.quantity * l.item.price, 0);
    const deliveryFee = restaurantId ? findRestaurant(restaurantId)?.deliveryFee ?? 0 : 0;
    const freeDelivery = student.freeDeliveriesLeft > 0;
    return {
      restaurantId,
      lines,
      count,
      subtotal,
      deliveryFee,
      freeDelivery,
      total: subtotal + (freeDelivery ? 0 : deliveryFee),
      quantityOf: (itemId) => lines.find((l) => l.item.id === itemId)?.quantity ?? 0,
      add: (rid, item) => {
        // A basket holds one restaurant's food, so one rider can bring it in one trip.
        if (rid !== restaurantId) {
          setRestaurantId(rid);
          setLines([{ item, quantity: 1 }]);
          return;
        }
        setLines((prev) => {
          const existing = prev.find((l) => l.item.id === item.id);
          if (!existing) return [...prev, { item, quantity: 1 }];
          return prev.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
        });
      },
      remove: (itemId) =>
        setLines((prev) =>
          prev
            .map((l) => (l.item.id === itemId ? { ...l, quantity: l.quantity - 1 } : l))
            .filter((l) => l.quantity > 0),
        ),
      clear: () => {
        setLines([]);
        setRestaurantId(null);
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
