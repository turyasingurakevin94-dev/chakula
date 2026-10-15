import { photos, type PhotoKey } from './photos';
import { colors } from './theme';

// Sample content for the prototype. Real restaurants, prices and photos come from the vendor app later.
export type Extra = { id: string; name: string; price: number };

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tint: string;
  photo?: PhotoKey;
  extras?: Extra[];
  // Offer a pepper level (none, mild, hot) on the dish sheet.
  pepper?: boolean;
  // Minutes the kitchen needs to cook it, before the rider leaves.
  prepMinutes?: number;
  // Set by the kitchen in the Kitchen app (server only).
  soldOut?: boolean;
};

const rolexExtras: Extra[] = [
  { id: 'egg', name: 'Extra egg', price: 500 },
  { id: 'sausage', name: 'Sausage', price: 1000 },
  { id: 'avocado', name: 'Avocado', price: 1000 },
];

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  tags: string;
  rating: number;
  ratingCount: number;
  minutes: number;
  distance: string;
  deliveryFee: number;
  tint: string;
  photo?: PhotoKey;
  // Set while the kitchen is closed, e.g. "6:00 pm".
  opensAt?: string;
  categories: string[];
  menu: MenuItem[];
};

export const restaurants: Restaurant[] = [
  {
    id: 'nakawa-kitchen',
    name: 'Nakawa Kitchen',
    cuisine: 'Local dishes',
    tags: 'Local · Pilau · Luwombo',
    rating: 4.8,
    ratingCount: 320,
    minutes: 12,
    distance: '400 m',
    deliveryFee: 0,
    tint: colors.peach,
    photo: 'spread',
    categories: ['Popular', 'Mains', 'Rolex', 'Drinks'],
    menu: [
      { id: 'pilau', name: 'Chicken pilau', description: 'Spiced rice, tender chicken, kachumbari on the side', price: 9000, category: 'Popular', tint: colors.sand, photo: 'pilau', prepMinutes: 15, pepper: true, extras: [{ id: 'avocado', name: 'Avocado', price: 1000 }, { id: 'extra-chicken', name: 'Extra chicken', price: 3000 }] },
      { id: 'luwombo', name: 'Beef luwombo', description: 'Slow-steamed in banana leaves, with matooke', price: 12000, category: 'Popular', tint: colors.sage, photo: 'luwombo', prepMinutes: 15 },
      { id: 'rolex', name: 'Special rolex', description: 'Two eggs, cabbage, tomato, rolled in fresh chapati', price: 5000, category: 'Rolex', tint: colors.peach, photo: 'rolex', prepMinutes: 5, pepper: true, extras: rolexExtras },
      { id: 'katogo', name: 'Katogo', description: 'Matooke and offals in a rich stew', price: 7000, category: 'Mains', tint: colors.sand, photo: 'katogo', prepMinutes: 5 },
      { id: 'passion', name: 'Passion juice', description: 'Freshly blended, no added sugar', price: 3000, category: 'Drinks', tint: colors.peach, photo: 'passion', prepMinutes: 2 },
    ],
  },
  {
    id: 'rolex-corner',
    name: 'Rolex Corner',
    cuisine: 'Street food',
    tags: 'Rolex · Chapati · Tea',
    rating: 4.9,
    ratingCount: 210,
    minutes: 8,
    distance: '250 m',
    deliveryFee: 1000,
    tint: colors.sand,
    photo: 'chapati',
    categories: ['Popular', 'Rolex', 'Drinks'],
    menu: [
      { id: 'rolex-classic', name: 'Classic rolex', description: 'One egg, cabbage, tomato', price: 3000, category: 'Popular', tint: colors.peach, photo: 'rolex', prepMinutes: 4, pepper: true, extras: rolexExtras },
      { id: 'rolex-special', name: 'Special rolex', description: 'Two eggs, sausage, veggies', price: 6000, category: 'Rolex', tint: colors.sand, photo: 'rolex-special', prepMinutes: 5, pepper: true, extras: rolexExtras.filter((e) => e.id !== 'sausage') },
      { id: 'tea', name: 'African tea', description: 'Spiced milk tea', price: 1500, category: 'Drinks', tint: colors.sage, photo: 'tea', prepMinutes: 2 },
    ],
  },
  {
    id: 'green-bowl',
    name: 'Green Bowl',
    cuisine: 'Healthy',
    tags: 'Salads · Bowls · Juice',
    rating: 4.7,
    ratingCount: 140,
    minutes: 15,
    distance: '600 m',
    deliveryFee: 1500,
    tint: colors.sage,
    photo: 'bowl-chicken',
    categories: ['Popular', 'Drinks'],
    menu: [
      { id: 'bowl', name: 'Chicken power bowl', description: 'Grilled chicken, rice, avocado, greens', price: 14000, category: 'Popular', tint: colors.sage, photo: 'bowl', prepMinutes: 10, extras: [{ id: 'egg', name: 'Boiled egg', price: 1000 }, { id: 'extra-chicken', name: 'Extra chicken', price: 4000 }] },
      { id: 'mango', name: 'Mango smoothie', description: 'Mango, banana, yoghurt', price: 5000, category: 'Drinks', tint: colors.sand, photo: 'mango', prepMinutes: 3 },
    ],
  },
  {
    id: 'mama-jos',
    name: 'Mama Jo’s Chips',
    cuisine: 'Chicken and chips',
    tags: 'Chicken · Chips · Sausage',
    rating: 4.6,
    ratingCount: 180,
    minutes: 18,
    distance: '900 m',
    deliveryFee: 1000,
    tint: colors.sand,
    photo: 'chicken-basket',
    categories: ['Popular', 'Drinks'],
    menu: [
      { id: 'chips-chicken', name: 'Chips and quarter chicken', description: 'Crispy chips, fried chicken, kachumbari', price: 12000, category: 'Popular', tint: colors.sand, photo: 'chips-chicken', prepMinutes: 12, pepper: true },
      { id: 'chips-sausage', name: 'Chips and sausage', description: 'Two beef sausages on crispy chips', price: 7000, category: 'Popular', tint: colors.peach, photo: 'chips-sausage', prepMinutes: 8, pepper: true },
      { id: 'soda', name: 'Soda', description: '500 ml, cold', price: 2000, category: 'Drinks', tint: colors.sage, photo: 'soda', prepMinutes: 1 },
    ],
  },
  {
    id: 'night-grill',
    name: 'Night Grill',
    cuisine: 'Grill',
    tags: 'Grill · Muchomo',
    rating: 4.5,
    ratingCount: 95,
    minutes: 20,
    distance: '1.1 km',
    deliveryFee: 1500,
    tint: colors.track,
    photo: 'skewers',
    opensAt: '6:00 pm',
    categories: ['Popular'],
    menu: [{ id: 'muchomo', name: 'Goat muchomo', description: 'Grilled goat skewers with gonja', price: 10000, category: 'Popular', tint: colors.sand, photo: 'muchomo', prepMinutes: 20 }],
  },
];

export type Special = {
  id: string;
  day: string;
  name: string;
  vendor: string;
  description: string;
  price: number;
  slots: string[];
  // Portions left, out of capacity.
  portions: number;
  capacity: number;
  tint: string;
  photo?: PhotoKey;
};

// Weekly dishes from cooks beyond campus, ordered ahead.
export const specials: Special[] = [
  { id: 'luwombo', day: 'Sunday', name: 'Chicken luwombo', vendor: 'Mama Rose’s, Ntinda', description: 'Steamed in banana leaves, with matooke and rice', price: 15000, slots: ['12:00 pm', '1:00 pm', '6:30 pm'], portions: 12, capacity: 40, tint: colors.peach, photo: 'chicken-luwombo' },
  { id: 'pizza', day: 'Friday', name: 'Pizza night', vendor: 'Pizza Point, Kololo', description: 'Medium pizza, chicken tikka or margherita', price: 18000, slots: ['7:00 pm', '8:00 pm'], portions: 25, capacity: 30, tint: colors.sand, photo: 'pizza' },
  { id: 'tilapia', day: 'Saturday', name: 'Whole tilapia & chips', vendor: 'Ggaba Fish Spot', description: 'Fried whole tilapia, chips, kachumbari', price: 20000, slots: ['1:00 pm', '7:00 pm'], portions: 18, capacity: 20, tint: colors.sage, photo: 'tilapia' },
];

// Photo chips on Home. Each one narrows "Popular tonight".
export const foodCategories: { id: string; label: string; tint: string; photo?: PhotoKey; test: (r: Restaurant, m: MenuItem) => boolean }[] = [
  { id: 'rolex', label: 'Rolex', tint: colors.peach, photo: 'rolex', test: (_r, m) => m.id.startsWith('rolex') },
  { id: 'local', label: 'Local', tint: colors.sand, photo: 'katogo', test: (r) => r.id === 'nakawa-kitchen' },
  { id: 'chicken', label: 'Chicken', tint: colors.sand, photo: 'chips-chicken', test: (_r, m) => /chicken/i.test(m.name) },
  { id: 'juice', label: 'Juice', tint: colors.peach, photo: 'passion', test: (_r, m) => m.category === 'Drinks' },
  { id: 'bowls', label: 'Bowls', tint: colors.sage, photo: 'bowl', test: (r) => r.id === 'green-bowl' },
];

// Main dishes from open kitchens, most liked kitchens first. Drinks only show under the Juice chip.
export function popularDishes(category?: string) {
  const chip = foodCategories.find((c) => c.id === category);
  return restaurants
    .filter((r) => !r.opensAt)
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .flatMap((r) => r.menu.map((item) => ({ restaurant: r, item })))
    .filter(({ restaurant, item }) => (chip ? chip.test(restaurant, item) : item.category !== 'Drinks'));
}

// Tonight's featured dish on Home.
export const chefsPick = { restaurantId: 'nakawa-kitchen', itemId: 'pilau' };

// WhatsApp number for support, in international format without "+". Not set up yet.
export const supportWhatsApp: string | null = null;

export const student = {
  firstName: 'Kevin',
  initials: 'KK',
  hostel: 'Akamwesi Hostel, Room 12',
  deliveryNote: 'Call me at the gate',
  walletBalance: 4500,
  momoNumber: '0772 ••• 456',
  freeDeliveriesLeft: 3,
};

// A kitchen as the server sends it (GET /kitchens).
export type ServerKitchen = {
  id: string;
  name: string;
  cuisine: string;
  tags: string;
  photo: string | null;
  deliveryFee: number;
  minutes: number;
  open: boolean;
  opensAt: string | null;
  rating: number;
  ratingCount: number;
  menu: { id: string; name: string; description: string; category: string; price: number; prepMinutes: number; pepper: boolean; photo: string | null; soldOut: boolean; extras: { id: string; name: string; price: number; soldOut: boolean }[] }[];
};

// A photo the app carries, or none (kitchen uploads come later).
const photoKey = (key: string | null) => (key && key in photos ? (key as PhotoKey) : undefined);

// Puts the kitchens' real menus in place of the samples. The lists are updated where they are,
// so every screen reading them sees the new prices; tints and photos stay where the server has none.
export function applyServerMenus(kitchens: ServerKitchen[]) {
  const next = kitchens.map((k): Restaurant => {
    const old = findRestaurant(k.id);
    const menu = k.menu.map((d): MenuItem => {
      const was = old?.menu.find((m) => m.id === d.id);
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        price: d.price,
        category: d.category,
        tint: was?.tint ?? colors.sand,
        photo: photoKey(d.photo) ?? was?.photo,
        prepMinutes: d.prepMinutes,
        pepper: d.pepper,
        soldOut: d.soldOut,
        extras: d.extras.filter((e) => !e.soldOut).map((e) => ({ id: e.id, name: e.name, price: e.price })),
      };
    });
    return {
      id: k.id,
      name: k.name,
      cuisine: k.cuisine,
      tags: k.tags,
      rating: k.rating,
      ratingCount: k.ratingCount,
      minutes: k.minutes,
      distance: old?.distance ?? '',
      deliveryFee: k.deliveryFee,
      tint: old?.tint ?? colors.sand,
      photo: photoKey(k.photo) ?? old?.photo,
      ...(k.open ? {} : { opensAt: k.opensAt ?? 'later' }),
      categories: [...new Set(menu.map((m) => m.category))],
      // Sold out dishes leave the menu until the kitchen brings them back.
      menu: menu.filter((m) => !m.soldOut),
    };
  });
  restaurants.splice(0, restaurants.length, ...next);
}

export function findRestaurant(id: string) {
  return restaurants.find((r) => r.id === id);
}

export function findSpecial(id: string) {
  return specials.find((s) => s.id === id);
}
