import { serve } from '@hono/node-server';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { createServer } from '../src/app.ts';
import type { Config } from '../src/config.ts';
import { devLogins } from '../src/seed.ts';

// The student wallet with the pretend MoMo: top up, pay from the balance, get it back on Undo.

const config: Config = {
  port: 0, databaseUrl: '', dataDir: undefined as unknown as string, sms: 'log', payments: 'dev', push: 'log', seed: true,
  africasTalking: { username: '', apiKey: '', senderId: '' }, devPayMs: 30,
  flutterwave: { secretKey: '', webhookHash: '', email: '', api: '' },
};

let server: Awaited<ReturnType<typeof createServer>>;
let rider = '';
before(async () => {
  console.log = () => {};
  server = await createServer(config);
  rider = await signIn(devLogins.rider.phone, 'rider');
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

async function signIn(phone: string, app: 'student' | 'kitchen' | 'rider' = 'student') {
  const sent = await call('POST', '/auth/code', { body: { phone, app } });
  return (await call('POST', '/auth/verify', { body: { phone, app, code: sent.json.devCode } })).json.token as string;
}

async function waitFor(fn: () => Promise<boolean>) {
  for (let i = 0; i < 200; i++) {
    if (await fn()) return;
    await sleep(10);
  }
  throw new Error('timed out');
}

const balance = async (token: string) => (await call('GET', '/wallet', { token })).json.balance as number;

// 1 × Chicken pilau (9,000) at Nakawa Kitchen, free delivery.
const order = (payMethod: string) => ({ kitchenId: 'nakawa-kitchen', dropPointId: 'library', payMethod, lines: [{ dishId: 'pilau', quantity: 1 }] });

async function topUp(token: string, amount: number, method = 'mtn') {
  const res = await call('POST', '/wallet/topups', { token, body: { amount, method } });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  await waitFor(async () => (await call('GET', `/wallet/topups/${res.json.id}`, { token })).json.status !== 'pending');
  return res.json.id as string;
}

test('a new wallet is empty, and top-ups stay within the limits', async () => {
  const token = await signIn('0772 600 001');
  const empty = await call('GET', '/wallet', { token });
  assert.equal(empty.status, 200);
  assert.equal(empty.json.balance, 0, 'no welcome credit');
  assert.deepEqual(empty.json.entries, []);
  assert.equal((await call('POST', '/wallet/topups', { token, body: { amount: 500, method: 'mtn' } })).status, 400);
  assert.equal((await call('POST', '/wallet/topups', { token, body: { amount: 600_000, method: 'airtel' } })).status, 400);
  assert.equal((await call('POST', '/wallet/topups', { token, body: { amount: 5000, method: 'card' } })).status, 400);
  assert.equal((await call('GET', '/wallet')).status, 401);
  assert.equal((await call('GET', '/wallet', { token: rider })).status, 403);
});

test('a top-up credits the wallet once, however many times the answer comes', async () => {
  const token = await signIn('0772 600 002');
  const started = await call('POST', '/wallet/topups', { token, body: { amount: 5000, method: 'airtel' } });
  assert.equal(started.status, 201);
  assert.equal(started.json.status, 'pending');
  // Not credited until the provider says the money arrived.
  assert.equal(await balance(token), 0);
  assert.equal((await call('GET', '/wallet', { token })).json.pendingTopups[0].id, started.json.id);

  await waitFor(async () => (await balance(token)) === 5000);
  // The provider repeats itself (Flutterwave retries webhooks): nothing more is added.
  await server.wallet.settle({ paymentId: started.json.id, status: 'succeeded' });
  await server.wallet.settle({ paymentId: started.json.id, status: 'succeeded', providerRef: 'again' });
  await server.wallet.settle({ paymentId: started.json.id, status: 'failed' });
  const w = await call('GET', '/wallet', { token });
  assert.equal(w.json.balance, 5000);
  assert.equal(w.json.entries.length, 1);
  assert.deepEqual([w.json.entries[0].kind, w.json.entries[0].amount, w.json.entries[0].method, w.json.entries[0].topupId], ['topup', 5000, 'airtel', started.json.id]);
  assert.equal(w.json.pendingTopups.length, 0);
  assert.equal((await call('GET', `/wallet/topups/${started.json.id}`, { token })).json.status, 'succeeded');

  // Someone else's top-up isn't visible.
  const other = await signIn('0772 600 003');
  assert.equal((await call('GET', `/wallet/topups/${started.json.id}`, { token: other })).status, 404);
});

test('a declined top-up adds nothing', async () => {
  // Numbers ending in 000 are declined by the pretend MoMo.
  const token = await signIn('0772 601 000');
  const id = await topUp(token, 5000);
  assert.equal((await call('GET', `/wallet/topups/${id}`, { token })).json.status, 'failed');
  assert.equal(await balance(token), 0);
});

test('paying from the wallet charges it with the order, and the order cooks straight away', async () => {
  const token = await signIn('0772 600 004');
  await topUp(token, 20_000);
  const placed = await call('POST', '/orders', { token, body: order('wallet') });
  assert.equal(placed.status, 201, JSON.stringify(placed.json));
  assert.equal(placed.json.order.status, 'cooking');
  assert.equal(placed.json.order.payMethod, 'wallet');
  assert.equal(placed.json.order.paid, true);
  assert.equal(placed.json.order.cashToCollect, 0);
  assert.equal(placed.json.payment, null);
  const w = await call('GET', '/wallet', { token });
  assert.equal(w.json.balance, 11_000);
  assert.deepEqual([w.json.entries[0].kind, w.json.entries[0].amount, w.json.entries[0].orderNumber], ['order', -9000, placed.json.order.number]);

  // It reaches the kitchen board like a paid order.
  const kitchen = await signIn(devLogins.kitchen.phone, 'kitchen');
  assert.ok((await call('GET', '/kitchen/orders', { token: kitchen })).json.some((o: any) => o.id === placed.json.order.id));
});

test('too little in the wallet is refused, and nothing is charged or cooked', async () => {
  const token = await signIn('0772 600 005');
  await topUp(token, 5000);
  const before = (await call('GET', '/orders', { token })).json.length;
  const refused = await call('POST', '/orders', { token, body: order('wallet') });
  assert.equal(refused.status, 400);
  assert.match(refused.json.error, /Your wallet has UGX 5,000 and this order is UGX 9,000/);
  assert.equal(await balance(token), 5000);
  assert.equal((await call('GET', '/orders', { token })).json.length, before);
});

test('two orders at once can’t spend the same money', async () => {
  const token = await signIn('0772 600 006');
  await topUp(token, 10_000);
  const [a, b] = await Promise.all([call('POST', '/orders', { token, body: order('wallet') }), call('POST', '/orders', { token, body: order('wallet') })]);
  assert.deepEqual([a.status, b.status].sort(), [201, 400]);
  assert.equal(await balance(token), 1000);
});

test('cancelling a wallet order puts the money back, once', async () => {
  const token = await signIn('0772 600 007');
  await topUp(token, 10_000);
  const placed = await call('POST', '/orders', { token, body: order('wallet') });
  assert.equal(await balance(token), 1000);
  const id = placed.json.order.id;
  const cancelled = await call('POST', `/orders/${id}/cancel`, { token });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
  assert.equal(cancelled.json.status, 'cancelled');
  assert.equal(await balance(token), 10_000);
  // A second tap doesn't refund again.
  assert.equal((await call('POST', `/orders/${id}/cancel`, { token })).status, 409);
  const w = await call('GET', '/wallet', { token });
  assert.equal(w.json.balance, 10_000);
  assert.deepEqual(w.json.entries.map((e: any) => [e.kind, e.amount]), [['refund', 9000], ['order', -9000], ['topup', 10_000]]);

  // Once a rider has it, it can't be taken back.
  const next = await call('POST', '/orders', { token, body: order('wallet') });
  await call('POST', `/rider/orders/${next.json.order.id}/take`, { token: rider });
  assert.equal((await call('POST', `/orders/${next.json.order.id}/cancel`, { token })).status, 409);
  assert.equal(await balance(token), 1000);
});

test('card is still refused', async () => {
  const token = await signIn('0772 600 008');
  const res = await call('POST', '/orders', { token, body: order('card') });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /Card payments/);
});

test('the student hears about wallet changes over the WebSocket', async () => {
  const http = serve({ fetch: server.app.fetch, port: 0 }) as Server;
  http.on('upgrade', (req, socket, head) => void server.live.upgrade(req, socket, head));
  await new Promise((r) => http.once('listening', r));
  const { port } = http.address() as AddressInfo;
  try {
    const token = await signIn('0772 600 009');
    const ws = new WebSocket(`ws://localhost:${port}/live?token=${token}`);
    const seen: any[] = [];
    ws.on('message', (m) => seen.push(JSON.parse(String(m))));
    await new Promise((r) => ws.once('open', r));
    const started = await call('POST', '/wallet/topups', { token, body: { amount: 12_000, method: 'mtn' } });
    await waitFor(async () => seen.some((m) => m.type === 'wallet' && m.topup?.id === started.json.id && m.topup.status === 'succeeded' && m.balance === 12_000));
    await call('POST', '/orders', { token, body: order('wallet') });
    await waitFor(async () => seen.some((m) => m.type === 'wallet' && m.balance === 3000));
    ws.close();
  } finally {
    http.close();
  }
});
