import { colors } from './theme';

// Meal plans: pay once, then pick a dish for each meal from any kitchen. Prototype catalogue; prices
// and kitchens' plan dishes come from the vendor app later.

export type PlanPeriod = 'weekly' | 'monthly' | 'semester';
export type PlanMeal = 'breakfast' | 'lunch' | 'supper';
export type PlanKindId = 'lunch-supper' | 'all-day' | 'breakfast';

export type PlanKind = {
  id: PlanKindId;
  name: string;
  detail: string;
  meals: PlanMeal[];
  // Meals in a month.
  mealsPerMonth: number;
  // What the plan pays for each meal; dearer dishes cost the difference.
  perMeal: number;
  tint: string;
};

export const planKinds: PlanKind[] = [
  { id: 'lunch-supper', name: 'Lunch and supper', detail: 'Mon to Fri', meals: ['lunch', 'supper'], mealsPerMonth: 44, perMeal: 7000, tint: colors.sand },
  { id: 'all-day', name: 'All day', detail: '3 meals · Mon to Sat', meals: ['breakfast', 'lunch', 'supper'], mealsPerMonth: 78, perMeal: 6200, tint: colors.sage },
  { id: 'breakfast', name: 'Breakfast', detail: 'Rolex or katogo with tea · Mon to Fri', meals: ['breakfast'], mealsPerMonth: 22, perMeal: 4500, tint: colors.peach },
];

export const periods: { id: PlanPeriod; label: string; saving?: string; per: string }[] = [
  { id: 'weekly', label: 'Weekly', per: 'a week' },
  { id: 'monthly', label: 'Monthly', saving: 'save 10%', per: 'a month' },
  { id: 'semester', label: 'Semester', saving: 'save 15%', per: 'a semester' },
];

// A semester is four months of meals.
export function planMeals(kind: PlanKind, period: PlanPeriod) {
  if (period === 'weekly') return Math.round(kind.mealsPerMonth / 4);
  if (period === 'semester') return kind.mealsPerMonth * 4;
  return kind.mealsPerMonth;
}

export function planPrice(kind: PlanKind, period: PlanPeriod) {
  const full = planMeals(kind, period) * kind.perMeal;
  const discount = period === 'monthly' ? 0.9 : period === 'semester' ? 0.85 : 1;
  // Round to the nearest 100 shillings.
  return Math.round((full * discount) / 100) * 100;
}

export function findPlanKind(id: string) {
  return planKinds.find((k) => k.id === id);
}

// When choices close, when the kitchen starts, and when it reaches the student, as [hour, minute].
export const mealTimes: Record<PlanMeal, { closes: [number, number]; cooks: [number, number]; door: [number, number] }> = {
  breakfast: { closes: [6, 0], cooks: [7, 0], door: [7, 30] },
  lunch: { closes: [10, 0], cooks: [12, 15], door: [13, 5] },
  supper: { closes: [15, 0], cooks: [17, 0], door: [19, 0] },
};

export type PlanDish = { id: string; restaurantId: string; kitchen: string; name: string; price: number; minutes: number; tint: string; meal: PlanMeal };

// Kitchens' plan menus. A dish at or under the plan's per-meal amount is covered.
export const planDishes: PlanDish[] = [
  { id: 'pilau', restaurantId: 'nakawa-kitchen', kitchen: 'Nakawa Kitchen', name: 'Chicken pilau', price: 7000, minutes: 12, tint: colors.sand, meal: 'supper' },
  { id: 'chips-chicken', restaurantId: 'mama-jos', kitchen: 'Mama Jo’s', name: 'Chips & chicken', price: 7000, minutes: 10, tint: colors.sand, meal: 'supper' },
  { id: 'bowl', restaurantId: 'green-bowl', kitchen: 'Green Bowl', name: 'Power bowl', price: 6500, minutes: 15, tint: colors.sage, meal: 'supper' },
  { id: 'katogo', restaurantId: 'nakawa-kitchen', kitchen: 'Nakawa Kitchen', name: 'Katogo', price: 6000, minutes: 12, tint: colors.sand, meal: 'supper' },
  { id: 'chips-sausage', restaurantId: 'mama-jos', kitchen: 'Mama Jo’s', name: 'Chips and sausage', price: 6000, minutes: 10, tint: colors.peach, meal: 'supper' },
  { id: 'luwombo', restaurantId: 'nakawa-kitchen', kitchen: 'Nakawa Kitchen', name: 'Beef luwombo', price: 8500, minutes: 12, tint: colors.sage, meal: 'supper' },
  { id: 'muchomo', restaurantId: 'night-grill', kitchen: 'Night Grill', name: 'Goat muchomo', price: 10000, minutes: 20, tint: colors.sand, meal: 'supper' },
  { id: 'rolex-classic', restaurantId: 'rolex-corner', kitchen: 'Rolex Corner', name: 'Rolex and tea', price: 4500, minutes: 8, tint: colors.peach, meal: 'breakfast' },
  { id: 'rolex-special', restaurantId: 'rolex-corner', kitchen: 'Rolex Corner', name: 'Special rolex', price: 6000, minutes: 8, tint: colors.sand, meal: 'breakfast' },
  { id: 'katogo-tea', restaurantId: 'nakawa-kitchen', kitchen: 'Nakawa Kitchen', name: 'Katogo with tea', price: 4500, minutes: 12, tint: colors.sage, meal: 'breakfast' },
];

// Breakfast plans pick from breakfast dishes; lunch and supper share the main menu.
export function dishesFor(meal: PlanMeal) {
  return planDishes.filter((d) => (meal === 'breakfast' ? d.meal === 'breakfast' : d.meal !== 'breakfast'));
}

export function findPlanDish(id: string) {
  return planDishes.find((d) => d.id === id);
}

// What the student pays on top of the plan for this dish.
export function topUpFor(dish: PlanDish, kind: PlanKind) {
  return Math.max(0, dish.price - kind.perMeal);
}

const DAY = 24 * 60 * 60 * 1000;

function at(base: number, [h, m]: [number, number]) {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

// The next time this meal can still be chosen: today if choices are still open, else tomorrow.
export function nextMeal(meal: PlanMeal, now: number) {
  const t = mealTimes[meal];
  let closes = at(now, t.closes);
  if (closes <= now) closes += DAY;
  return { closes, cooks: at(closes, t.cooks), door: at(closes, t.door), day: dayKey(closes) };
}

// Today's run of a meal that is not the one being chosen, e.g. lunch while supper is still open.
export function todaysMeal(meal: PlanMeal, now: number) {
  const t = mealTimes[meal];
  return { closes: at(now, t.closes), cooks: at(now, t.cooks), door: at(now, t.door) };
}

export function dayKey(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// "Today, Tuesday" or "Tomorrow, Wednesday"
export function dayLabel(time: number, now: number) {
  const weekday = new Date(time).toLocaleDateString('en-GB', { weekday: 'long' });
  return `${dayKey(time) === dayKey(now) ? 'Today' : 'Tomorrow'}, ${weekday}`;
}

export const mealName: Record<PlanMeal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', supper: 'Supper' };
