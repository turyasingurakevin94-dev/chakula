import { serve } from '@hono/node-server';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { createServer } from '../src/app.ts';
import type { Config } from '../src/config.ts';
import { kampalaDay } from '../src/orders.ts';
import { devLogins } from '../src/seed.ts';

// The whole journey on an in-memory database: sign in, order, MoMo, kitchen, rider, handover.

const config: Config = {
  port: 0, databaseUrl: '', dataDir: '', sms: 'log', payments: 'dev', push: 'log', seed: true,
  africasTalking: { username: '', apiKey: '', senderId: '' }, devPayMs: 30,
  flutterwave: { secretKey: '', webhookHash: '', email: '', api: '' },
};

let server: Awaited<ReturnType<typeof createServer>>;
let kitchen = '';
let rider = '';
let rider2 = '';
before(async () => {
  console.log = () => {};
  server = await createServer({ ...config, dataDir: undefined as unknown as string });
  kitchen = await signIn(devLogins.kitchen.phone, 'kitchen');
  rider = await signIn(devLogins.rider.phone, 'rider');
  rider2 = await signIn(devLogins.rider2.phone, 'rider');
});
after(() => server.close());

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await server.app.request(path, {
    method,
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

async function signIn(phone: string, app: 'student' | 'kitchen' | 'rider') {
  const sent = await call('POST', '/auth/code', { body: { phone, app } });
  assert.equal(sent.status, 200, JSON.stringify(sent.json));
  const done = await call('POST', '/auth/verify', { body: { phone, app, code: sent.json.devCode } });
  assert.equal(done.status, 200, JSON.stringify(done.json));
  return done.json.token as string;
}

async function waitFor(fn: () => Promise<boolean>) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await sleep(10);
  }
  throw new Error('timed out');
}

const order = (payMethod: string, payPhone?: string) => ({
  kitchenId: 'nakawa-kitchen',
  dropPointId: 'akamwesi',
  payMethod,
  payPhone,
  lines: [
    { dishId: 'pilau', quantity: 2, extraIds: ['avocado'], pepper: 'Mild' },
    { dishId: 'passion', quantity: 1 },
  ],
});

test('a student order goes from MoMo to the kitchen to the rider to the gate', async () => {
  const student = await signIn('0772 123 456', 'student');
  await call('PATCH', '/me', { token: student, body: { name: 'Brian Kato' } });

  const menu = await call('GET', '/kitchens');
  assert.ok(menu.json.find((k: any) => k.id === 'nakawa-kitchen').menu.some((d: any) => d.id === 'pilau'));

  // Prices come from the server: 2 × (9,000 + 1,000 avocado) + 3,000 juice, free delivery.
  const placed = await call('POST', '/orders', { token: student, body: order('mtn') });
  assert.equal(placed.status, 201, JSON.stringify(placed.json));
  const id = placed.json.order.id;
  assert.equal(placed.json.order.total, 23_000);
  assert.equal(placed.json.order.status, 'awaiting_payment');
  assert.match(placed.json.order.handoverCode, /^\d{4}$/);
  const code = placed.json.order.handoverCode;

  // Unpaid orders don't reach the kitchen.
  assert.equal((await call('GET', '/kitchen/orders', { token: kitchen })).json.length, 0);

  await waitFor(async () => (await call('GET', `/orders/${id}`, { token: student })).json.status === 'cooking');
  const board = await call('GET', '/kitchen/orders', { token: kitchen });
  assert.equal(board.json[0].id, id);
  assert.equal(board.json[0].student.name, 'Brian K.');
  assert.equal(board.json[0].handoverCode, undefined);

  // Two riders tap the same run; one gets it.
  const runs = await call('GET', '/rider/runs', { token: rider });
  assert.ok(runs.json.some((r: any) => r.id === id));
  assert.equal((await call('POST', `/rider/orders/${id}/take`, { token: rider })).status, 200);
  assert.equal((await call('POST', `/rider/orders/${id}/take`, { token: rider2 })).status, 409);

  // The bag can't leave before the kitchen seals it.
  assert.equal((await call('POST', `/rider/orders/${id}/pick-up`, { token: rider })).status, 409);
  assert.equal((await call('POST', `/kitchen/orders/${id}/ready`, { token: kitchen })).status, 200);
  const picked = await call('POST', `/rider/orders/${id}/pick-up`, { token: rider });
  assert.equal(picked.json.status, 'picked_up');
  assert.equal(picked.json.handoverCode, undefined, 'riders never see the code');
  assert.equal(picked.json.student.phone, '+256772123456');

  // No push token on this phone, so the code came by SMS.
  await waitFor(async () => server.sms.outbox.some((m) => m.to === '+256772123456' && m.message.includes(code)));

  await call('POST', '/rider/location', { token: rider, body: { lat: 0.3301, lng: 32.6143 } });
  const tracked = await call('GET', `/orders/${id}`, { token: student });
  assert.equal(tracked.json.riderLocation.lat, 0.3301);
  // The student can call the rider carrying their food; the kitchen can't see the number.
  assert.equal(tracked.json.rider.phone, devLogins.rider.phone);
  assert.equal((await call('GET', '/kitchen/orders', { token: kitchen })).json[0].rider.phone, undefined);

  await call('POST', `/rider/orders/${id}/at-gate`, { token: rider });
  const wrong = await call('POST', `/rider/orders/${id}/deliver`, { token: rider, body: { code: code === '1234' ? '4321' : '1234' } });
  assert.equal(wrong.status, 400);
  const done = await call('POST', `/rider/orders/${id}/deliver`, { token: rider, body: { code } });
  assert.equal(done.json.status, 'delivered');
  assert.equal((await call('GET', `/orders/${id}`, { token: student })).json.rider.phone, undefined, 'the number goes once delivered');
});

test('the student hears that the kitchen accepted their order', async () => {
  const student = await signIn('0772 123 999', 'student');
  await call('POST', '/push-tokens', { token: student, body: { token: 'ExponentPushToken[accepted-test]', app: 'student' } });
  await call('POST', '/orders', { token: student, body: order('cash') });
  await waitFor(async () => server.push.sent.some((m) => m.to === 'ExponentPushToken[accepted-test]' && m.title === 'Nakawa Kitchen accepted your order' && m.channel === 'updates'));
});

test('a declined MoMo payment cancels the order', async () => {
  const student = await signIn('0701 555 000', 'student');
  const placed = await call('POST', '/orders', { token: student, body: order('airtel') });
  const id = placed.json.order.id;
  await waitFor(async () => (await call('GET', `/orders/${id}`, { token: student })).json.status === 'cancelled');
});

test('cash orders go straight to the kitchen, and riders see the cash to collect', async () => {
  const student = await signIn('0752 000 111', 'student');
  const placed = await call('POST', '/orders', { token: student, body: order('cash') });
  assert.equal(placed.json.order.status, 'cooking');
  const runs = await call('GET', '/rider/runs', { token: rider2 });
  assert.equal(runs.json.find((r: any) => r.id === placed.json.order.id).cashToCollect, 23_000);
  // Undo on Home: a fresh cash order can be taken back, and leaves the kitchen board as cancelled.
  const undone = await call('POST', `/orders/${placed.json.order.id}/cancel`, { token: student });
  assert.equal(undone.json.status, 'cancelled');
  const board = await call('GET', '/kitchen/orders', { token: kitchen });
  assert.equal(board.json.find((o: any) => o.id === placed.json.order.id).status, 'cancelled');
  // Unpaid MoMo orders that were cancelled never reach the board.
  assert.ok(!board.json.some((o: any) => o.status === 'cancelled' && o.payMethod !== 'cash'));
});

test("a rider's day: drops, cash collected and the delivered list", async () => {
  // Kampala is UTC+3: 22:30 UTC is already the next day there.
  assert.equal(kampalaDay(new Date('2026-03-04T22:30:00Z')).day, '2026-03-05');
  assert.equal(kampalaDay(new Date('2026-03-04T20:59:00Z')).day, '2026-03-04');
  assert.equal(kampalaDay(new Date('2026-03-04T22:30:00Z')).start.toISOString(), '2026-03-04T21:00:00.000Z');

  const before = await call('GET', '/rider/today', { token: rider2 });
  assert.equal(before.status, 200);
  assert.equal(before.json.drops, 0);
  assert.equal(before.json.cashCollected, 0);
  assert.deepEqual(before.json.orders, []);

  const student = await signIn('0772 333 444', 'student');
  const placed = await call('POST', '/orders', { token: student, body: { ...order('cash'), dropPointId: 'library' } });
  const id = placed.json.order.id;
  const code = placed.json.order.handoverCode;
  await call('POST', `/rider/orders/${id}/take`, { token: rider2 });
  await call('POST', `/kitchen/orders/${id}/ready`, { token: kitchen });
  await call('POST', `/rider/orders/${id}/pick-up`, { token: rider2 });
  // Not delivered yet, so not counted.
  assert.equal((await call('GET', '/rider/today', { token: rider2 })).json.drops, 0);
  assert.equal((await call('POST', `/rider/orders/${id}/deliver`, { token: rider2, body: { code } })).json.status, 'delivered');

  const today = await call('GET', '/rider/today', { token: rider2 });
  assert.equal(today.json.drops, 1);
  assert.equal(today.json.cashCollected, 23_000);
  assert.equal(today.json.orders.length, 1);
  const [d] = today.json.orders;
  assert.equal(d.id, id);
  assert.equal(d.number, placed.json.order.number);
  assert.equal(d.kitchen, 'Nakawa Kitchen');
  assert.equal(d.payMethod, 'cash');
  assert.equal(d.total, 23_000);
  assert.ok(d.dropPoint);
  assert.ok(Date.now() - new Date(d.deliveredAt).getTime() < 60_000);

  // The other rider's MoMo delivery from the first test counts for them only, with no cash.
  const other = await call('GET', '/rider/today', { token: rider });
  assert.ok(other.json.drops >= 1);
  assert.ok(!other.json.orders.some((o: any) => o.id === id));
  assert.equal(other.json.cashCollected, 0);

  // Riders only.
  assert.equal((await call('GET', '/rider/today', { token: student })).status, 403);
  assert.equal((await call('GET', '/rider/today')).status, 401);
});

test('sign-in rules', async () => {
  assert.equal((await call('POST', '/auth/code', { body: { phone: '12345' } })).status, 400);
  // Students can't get into the Rider or Kitchen app.
  assert.equal((await call('POST', '/auth/code', { body: { phone: '0772 999 888', app: 'rider' } })).status, 403);
  // Wrong codes run out.
  const sent = await call('POST', '/auth/code', { body: { phone: '0772 999 777' } });
  const wrong = sent.json.devCode === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/auth/verify', { body: { phone: '0772 999 777', code: wrong } })).status, 400);
  assert.equal((await call('POST', '/auth/verify', { body: { phone: '0772 999 777', code: sent.json.devCode } })).status, 429);
  // A second code within 30 seconds is refused.
  assert.equal((await call('POST', '/auth/code', { body: { phone: '0772 999 777' } })).status, 429);
  assert.equal((await call('GET', '/me')).status, 401);
});

test('menus: sold out dishes and closed kitchens are refused', async () => {
  const student = await signIn('0772 444 333', 'student');
  await call('PATCH', '/kitchen/dishes/pilau', { token: kitchen, body: { soldOut: true } });
  const out = await call('POST', '/orders', { token: student, body: order('mtn') });
  assert.equal(out.status, 409);
  assert.match(out.json.error, /Chicken pilau just ran out/);
  await call('PATCH', '/kitchen/dishes/pilau', { token: kitchen, body: { soldOut: false } });
  const closed = await call('POST', '/orders', { token: student, body: { ...order('mtn'), kitchenId: 'night-grill', lines: [{ dishId: 'muchomo', quantity: 1 }] } });
  assert.equal(closed.status, 400);
  assert.match(closed.json.error, /closed until 6:00 pm/);
  const fake = await call('POST', '/orders', { token: student, body: { ...order('mtn'), lines: [{ dishId: 'pilau', quantity: 1, extraIds: ['caviar'] }] } });
  assert.equal(fake.status, 400);
});

test('live updates reach the student over the WebSocket', async () => {
  const http = serve({ fetch: server.app.fetch, port: 0 }) as Server;
  http.on('upgrade', (req, socket, head) => void server.live.upgrade(req, socket, head));
  await new Promise((r) => http.once('listening', r));
  const { port } = http.address() as AddressInfo;
  try {
    const student = await signIn('0772 222 111', 'student');
    const ws = new WebSocket(`ws://localhost:${port}/live?token=${student}`);
    const seen: any[] = [];
    ws.on('message', (m) => seen.push(JSON.parse(String(m))));
    await new Promise((r) => ws.once('open', r));
    const placed = await call('POST', '/orders', { token: student, body: order('mtn') });
    await waitFor(async () => seen.some((m) => m.type === 'order' && m.order.id === placed.json.order.id && m.order.status === 'cooking'));
    ws.close();

    const refused = new WebSocket(`ws://localhost:${port}/live?token=nope`);
    await new Promise((r) => refused.once('error', r));
  } finally {
    http.close();
  }
});
