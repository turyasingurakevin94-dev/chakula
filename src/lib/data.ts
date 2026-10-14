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
  extras?: Extra[];
  // Offer a pepper level (none, mild, hot) on the dish sheet.
  pepper?: boolean;
  // Minutes the kitchen needs to cook it, before the rider leaves.
  prepMinutes?: number;
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
    categories: ['Popular', 'Mains', 'Rolex', 'Drinks'],
    menu: [
      { id: 'pilau', name: 'Chicken pilau', description: 'Spiced rice, tender chicken, kachumbari on the side', price: 9000, category: 'Popular', tint: colors.sand, prepMinutes: 15, pepper: true, extras: [{ id: 'avocado', name: 'Avocado', price: 1000 }, { id: 'extra-chicken', name: 'Extra chicken', price: 3000 }] },
      { id: 'luwombo', name: 'Beef luwombo', description: 'Slow-steamed in banana leaves, with matooke', price: 12000, category: 'Popular', tint: colors.sage, prepMinutes: 15 },
      { id: 'rolex', name: 'Special rolex', description: 'Two eggs, cabbage, tomato, rolled in fresh chapati', price: 5000, category: 'Rolex', tint: colors.peach, prepMinutes: 5, pepper: true, extras: rolexExtras },
      { id: 'katogo', name: 'Katogo', description: 'Matooke and offals in a rich stew', price: 7000, category: 'Mains', tint: colors.sand, prepMinutes: 5 },
      { id: 'passion', name: 'Passion juice', description: 'Freshly blended, no added sugar', price: 3000, category: 'Drinks', tint: colors.peach, prepMinutes: 2 },
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
    categories: ['Popular', 'Rolex', 'Drinks'],
    menu: [
      { id: 'rolex-classic', name: 'Classic rolex', description: 'One egg, cabbage, tomato', price: 3000, category: 'Popular', tint: colors.peach, prepMinutes: 4, pepper: true, extras: rolexExtras },
      { id: 'rolex-special', name: 'Special rolex', description: 'Two eggs, sausage, veggies', price: 6000, category: 'Rolex', tint: colors.sand, prepMinutes: 5, pepper: true, extras: rolexExtras.filter((e) => e.id !== 'sausage') },
      { id: 'tea', name: 'African tea', description: 'Spiced milk tea', price: 1500, category: 'Drinks', tint: colors.sage, prepMinutes: 2 },
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
    categories: ['Popular', 'Drinks'],
    menu: [
      { id: 'bowl', name: 'Chicken power bowl', description: 'Grilled chicken, rice, avocado, greens', price: 14000, category: 'Popular', tint: colors.sage, prepMinutes: 10, extras: [{ id: 'egg', name: 'Boiled egg', price: 1000 }, { id: 'extra-chicken', name: 'Extra chicken', price: 4000 }] },
      { id: 'mango', name: 'Mango smoothie', description: 'Mango, banana, yoghurt', price: 5000, category: 'Drinks', tint: colors.sand, prepMinutes: 3 },
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
    categories: ['Popular', 'Drinks'],
    menu: [
      { id: 'chips-chicken', name: 'Chips and quarter chicken', description: 'Crispy chips, fried chicken, kachumbari', price: 12000, category: 'Popular', tint: colors.sand, prepMinutes: 12, pepper: true },
      { id: 'chips-sausage', name: 'Chips and sausage', description: 'Two beef sausages on crispy chips', price: 7000, category: 'Popular', tint: colors.peach, prepMinutes: 8, pepper: true },
      { id: 'soda', name: 'Soda', description: '500 ml, cold', price: 2000, category: 'Drinks', tint: colors.sage, prepMinutes: 1 },
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
    opensAt: '6:00 pm',
    categories: ['Popular'],
    menu: [{ id: 'muchomo', name: 'Goat muchomo', description: 'Grilled goat skewers with gonja', price: 10000, category: 'Popular', tint: colors.sand, prepMinutes: 20 }],
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
};

// Weekly dishes from cooks beyond campus, ordered ahead.
export const specials: Special[] = [
  { id: 'luwombo', day: 'Sunday', name: 'Chicken luwombo', vendor: 'Mama Rose’s, Ntinda', description: 'Steamed in banana leaves, with matooke and rice', price: 15000, slots: ['12:00 pm', '1:00 pm', '6:30 pm'], portions: 12, capacity: 40, tint: colors.peach },
  { id: 'pizza', day: 'Friday', name: 'Pizza night', vendor: 'Pizza Point, Kololo', description: 'Medium pizza, chicken tikka or margherita', price: 18000, slots: ['7:00 pm', '8:00 pm'], portions: 25, capacity: 30, tint: colors.sand },
  { id: 'tilapia', day: 'Saturday', name: 'Whole tilapia & chips', vendor: 'Ggaba Fish Spot', description: 'Fried whole tilapia, chips, kachumbari', price: 20000, slots: ['1:00 pm', '7:00 pm'], portions: 18, capacity: 20, tint: colors.sage },
];

export const foodCategories = ['All', 'Rolex', 'Local food', 'Chicken & chips', 'Juices'];

export const student = {
  firstName: 'Kevin',
  initials: 'KK',
  hostel: 'Block B, Room 12',
  deliveryNote: 'Call me at the gate',
  walletBalance: 4500,
  momoNumber: '0772 ••• 456',
  freeDeliveriesLeft: 3,
};

export function findRestaurant(id: string) {
  return restaurants.find((r) => r.id === id);
}

export function findSpecial(id: string) {
  return specials.find((s) => s.id === id);
}
