import type { Db } from './db.ts';

// Sample data, copied from the student app's prototype menus (src/lib/data.ts) and the campus map's
// drop points, so the apps show the same food once they read from here. Kitchens will edit their
// own menus in the Kitchen app; this only fills an empty database.

type SeedDish = { id: string; name: string; description: string; category: string; price: number; prep: number; photo: string; pepper?: boolean; extras?: [string, string, number][] };
type SeedKitchen = { id: string; name: string; cuisine: string; tags: string; photo: string; deliveryFee: number; minutes: number; rating: number; ratingCount: number; opensAt?: string; dishes: SeedDish[] };

const rolexExtras: [string, string, number][] = [['egg', 'Extra egg', 500], ['sausage', 'Sausage', 1000], ['avocado', 'Avocado', 1000]];

const kitchens: SeedKitchen[] = [
  {
    id: 'nakawa-kitchen', name: 'Nakawa Kitchen', cuisine: 'Local dishes', tags: 'Local · Pilau · Luwombo', photo: 'spread', deliveryFee: 0, minutes: 12, rating: 4.8, ratingCount: 320,
    dishes: [
      { id: 'pilau', name: 'Chicken pilau', description: 'Spiced rice, tender chicken, kachumbari on the side', category: 'Popular', price: 9000, prep: 15, photo: 'pilau', pepper: true, extras: [['avocado', 'Avocado', 1000], ['extra-chicken', 'Extra chicken', 3000]] },
      { id: 'luwombo', name: 'Beef luwombo', description: 'Slow-steamed in banana leaves, with matooke', category: 'Popular', price: 12000, prep: 15, photo: 'luwombo' },
      { id: 'rolex', name: 'Special rolex', description: 'Two eggs, cabbage, tomato, rolled in fresh chapati', category: 'Rolex', price: 5000, prep: 5, photo: 'rolex', pepper: true, extras: rolexExtras },
      { id: 'katogo', name: 'Katogo', description: 'Matooke and offals in a rich stew', category: 'Mains', price: 7000, prep: 5, photo: 'katogo' },
      { id: 'passion', name: 'Passion juice', description: 'Freshly blended, no added sugar', category: 'Drinks', price: 3000, prep: 2, photo: 'passion' },
    ],
  },
  {
    id: 'rolex-corner', name: 'Rolex Corner', cuisine: 'Street food', tags: 'Rolex · Chapati · Tea', photo: 'chapati', deliveryFee: 1000, minutes: 8, rating: 4.9, ratingCount: 210,
    dishes: [
      { id: 'rolex-classic', name: 'Classic rolex', description: 'One egg, cabbage, tomato', category: 'Popular', price: 3000, prep: 4, photo: 'rolex', pepper: true, extras: rolexExtras },
      { id: 'rolex-special', name: 'Special rolex', description: 'Two eggs, sausage, veggies', category: 'Rolex', price: 6000, prep: 5, photo: 'rolex-special', pepper: true, extras: rolexExtras.filter(([id]) => id !== 'sausage') },
      { id: 'tea', name: 'African tea', description: 'Spiced milk tea', category: 'Drinks', price: 1500, prep: 2, photo: 'tea' },
    ],
  },
  {
    id: 'green-bowl', name: 'Green Bowl', cuisine: 'Healthy', tags: 'Salads · Bowls · Juice', photo: 'bowl-chicken', deliveryFee: 1500, minutes: 15, rating: 4.7, ratingCount: 140,
    dishes: [
      { id: 'bowl', name: 'Chicken power bowl', description: 'Grilled chicken, rice, avocado, greens', category: 'Popular', price: 14000, prep: 10, photo: 'bowl', extras: [['egg', 'Boiled egg', 1000], ['extra-chicken', 'Extra chicken', 4000]] },
      { id: 'mango', name: 'Mango smoothie', description: 'Mango, banana, yoghurt', category: 'Drinks', price: 5000, prep: 3, photo: 'mango' },
    ],
  },
  {
    id: 'mama-jos', name: 'Mama Jo’s Chips', cuisine: 'Chicken and chips', tags: 'Chicken · Chips · Sausage', photo: 'chicken-basket', deliveryFee: 1000, minutes: 18, rating: 4.6, ratingCount: 180,
    dishes: [
      { id: 'chips-chicken', name: 'Chips and quarter chicken', description: 'Crispy chips, fried chicken, kachumbari', category: 'Popular', price: 12000, prep: 12, photo: 'chips-chicken', pepper: true },
      { id: 'chips-sausage', name: 'Chips and sausage', description: 'Two beef sausages on crispy chips', category: 'Popular', price: 7000, prep: 8, photo: 'chips-sausage', pepper: true },
      { id: 'soda', name: 'Soda', description: '500 ml, cold', category: 'Drinks', price: 2000, prep: 1, photo: 'soda' },
    ],
  },
  {
    id: 'night-grill', name: 'Night Grill', cuisine: 'Grill', tags: 'Grill · Muchomo', photo: 'skewers', deliveryFee: 1500, minutes: 20, rating: 4.5, ratingCount: 95, opensAt: '6:00 pm',
    dishes: [{ id: 'muchomo', name: 'Goat muchomo', description: 'Grilled goat skewers with gonja', category: 'Popular', price: 10000, prep: 20, photo: 'muchomo' }],
  },
];

// The 17 drop points on the campus map (tools/campus-map). Riders only deliver to these.
const dropPoints: [string, string, string][] = [
  ['main-gate', 'Main Gate', 'gate'], ['north-gate', 'Jinja Road Gate', 'gate'], ['east-gate', 'URA Side Gate', 'gate'],
  ['main-building', 'Main Building', 'campus'], ['library', 'Digital Library', 'campus'], ['dining', 'MUBS Dining', 'campus'],
  ['mukiibi', 'Mukiibi Lecture Block', 'campus'], ['block-12', 'Lecture Block 12', 'campus'], ['guild', 'Guild Office Block', 'campus'],
  ['sports', 'Sports Ground', 'campus'], ['berlin', 'Berlin Hostel', 'hostel'], ['evelyn', 'Evelyn Hostel', 'hostel'],
  ['akamwesi', 'Akamwesi Hostel', 'hostel'], ['kabs', 'Kabs Hostel', 'hostel'], ['valley-courts', 'Valley Courts Hostel', 'hostel'],
  ['dofre', 'Dofre Hostel', 'hostel'], ['bahesi', 'Bahesi Hostel', 'hostel'],
];

// Dev logins. Kitchens and riders can't sign themselves up; an admin adds them.
export const devLogins = {
  kitchen: { phone: '+256700000001', name: 'Nakawa Kitchen counter', kitchenId: 'nakawa-kitchen' },
  rider: { phone: '+256700000011', name: 'Moses' },
  rider2: { phone: '+256700000012', name: 'Sam' },
};

export async function seed(db: Db) {
  const [{ n }] = (await db.query<{ n: number }>('select count(*)::int as n from kitchens')) as [{ n: number }];
  if (n > 0) return false;
  await db.tx(async (t) => {
    for (const [id, name, kind] of dropPoints) await t.query('insert into drop_points (id, name, kind) values ($1, $2, $3)', [id, name, kind]);
    for (const [ki, k] of kitchens.entries()) {
      await t.query(
        'insert into kitchens (id, name, cuisine, tags, photo, delivery_fee, minutes, open, opens_at, rating, rating_count, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [k.id, k.name, k.cuisine, k.tags, k.photo, k.deliveryFee, k.minutes, !k.opensAt, k.opensAt ?? null, k.rating, k.ratingCount, ki],
      );
      for (const [di, d] of k.dishes.entries()) {
        await t.query(
          'insert into dishes (kitchen_id, id, name, description, category, price, prep_minutes, pepper, photo, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [k.id, d.id, d.name, d.description, d.category, d.price, d.prep, !!d.pepper, d.photo, di],
        );
        for (const [ei, [id, name, price]] of (d.extras ?? []).entries()) {
          await t.query('insert into dish_extras (kitchen_id, dish_id, id, name, price, sort) values ($1,$2,$3,$4,$5,$6)', [k.id, d.id, id, name, price, ei]);
        }
      }
    }
    const { kitchen, rider, rider2 } = devLogins;
    await t.query("insert into users (id, phone, role, name, kitchen_id) values ('dev-kitchen', $1, 'kitchen', $2, $3)", [kitchen.phone, kitchen.name, kitchen.kitchenId]);
    await t.query("insert into users (id, phone, role, name) values ('dev-rider', $1, 'rider', $2)", [rider.phone, rider.name]);
    await t.query("insert into users (id, phone, role, name) values ('dev-rider-2', $1, 'rider', $2)", [rider2.phone, rider2.name]);
  });
  return true;
}
