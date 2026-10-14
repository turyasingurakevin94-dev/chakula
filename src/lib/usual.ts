import type { Order } from './account';
import { findRestaurant, restaurants, type MenuItem, type Restaurant } from './data';

// Picks for the top of Home: the order a student keeps coming back to, and food that is close and quick.

export type Meal = 'breakfast' | 'lunch' | 'supper';

export function mealAt(time: number): Meal {
  const h = new Date(time).getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  return 'supper';
}

// Two orders are "the same" when they are the same dishes, in the same amounts, from the same kitchen.
function sameOrderKey(order: Order) {
  const lines = order.lines.map((l) => `${l.item.id}x${l.quantity}`).sort();
  return [order.restaurantId, ...lines].join('|');
}

// The most frequent order for this time of day, else the most recent one. Orders come newest first,
// so on a tie the most recent wins.
export function pickUsual(orders: Order[], now: number): Order | null {
  const known = orders.filter((o) => findRestaurant(o.restaurantId));
  const meal = mealAt(now);
  const counts = new Map<string, { order: Order; n: number }>();
  for (const o of known) {
    if (mealAt(o.placedAt) !== meal) continue;
    const key = sameOrderKey(o);
    const seen = counts.get(key);
    if (seen) seen.n += 1;
    else counts.set(key, { order: o, n: 1 });
  }
  let best: { order: Order; n: number } | null = null;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  return best?.order ?? known[0] ?? null;
}

export type QuickDish = { restaurant: Restaurant; item: MenuItem; minutes: number };

// Dishes cooked in 5 minutes or less, from open kitchens 15 minutes away or closer. Quickest first.
export function quickDishes(): QuickDish[] {
  return restaurants
    .filter((r) => !r.opensAt && r.minutes <= 15)
    .flatMap((r) => r.menu.filter((m) => m.prepMinutes !== undefined && m.prepMinutes <= 5).map((item) => ({ restaurant: r, item, minutes: (item.prepMinutes ?? 0) + r.minutes })))
    .sort((a, b) => a.minutes - b.minutes);
}
