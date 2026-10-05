import { colors } from './theme';

// Sample content for the prototype. Real restaurants, prices and photos come from the vendor app later.
export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tint: string;
};

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
    deliveryFee: 1000,
    tint: colors.peach,
    categories: ['Popular', 'Mains', 'Rolex', 'Drinks'],
    menu: [
      { id: 'pilau', name: 'Chicken pilau', description: 'Spiced rice, tender chicken, kachumbari on the side', price: 9000, category: 'Popular', tint: colors.sand },
      { id: 'luwombo', name: 'Beef luwombo', description: 'Slow-steamed in banana leaves, with matooke', price: 12000, category: 'Popular', tint: colors.sage },
      { id: 'rolex', name: 'Special rolex', description: 'Two eggs, cabbage, tomato, rolled in fresh chapati', price: 5000, category: 'Rolex', tint: colors.peach },
      { id: 'katogo', name: 'Katogo', description: 'Matooke and offals in a rich stew', price: 7000, category: 'Mains', tint: colors.sand },
      { id: 'passion', name: 'Passion juice', description: 'Freshly blended, no added sugar', price: 3000, category: 'Drinks', tint: colors.peach },
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
      { id: 'rolex-classic', name: 'Classic rolex', description: 'One egg, cabbage, tomato', price: 3000, category: 'Popular', tint: colors.peach },
      { id: 'rolex-special', name: 'Special rolex', description: 'Two eggs, sausage, veggies', price: 6000, category: 'Rolex', tint: colors.sand },
      { id: 'tea', name: 'African tea', description: 'Spiced milk tea', price: 1500, category: 'Drinks', tint: colors.sage },
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
      { id: 'bowl', name: 'Chicken power bowl', description: 'Grilled chicken, rice, avocado, greens', price: 14000, category: 'Popular', tint: colors.sage },
      { id: 'mango', name: 'Mango smoothie', description: 'Mango, banana, yoghurt', price: 5000, category: 'Drinks', tint: colors.sand },
    ],
  },
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
