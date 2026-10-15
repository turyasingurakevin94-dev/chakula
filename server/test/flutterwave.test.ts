import assert from 'node:assert/strict';
import { createServer as createHttp, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createServer } from '../src/app.ts';
import type { Config } from '../src/config.ts';

// Flutterwave payments against a pretend Flutterwave that answers like the real API.

type Charge = { tx_ref: string; amount: number; currency: string; network: string; phone_number: string; email: string };
const charges: Charge[] = [];
// What the verify call reports per Flutterwave transaction id.
const txs = new Map<number, { id: number; status: string; amount: number; currency: string; tx_ref: string }>();

let flw: Server;
let server: Awaited<ReturnType<typeof createServer>>;
const HASH = 'test-webhook-hash';

before(async () => {
  console.log = () => {};
  console.error = () => {};
  flw = createHttp((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (req.headers.authorization !== 'Bearer FLWSECK_TEST-x') return res.writeHead(401).end('{"status":"error"}');
      if (req.method === 'POST' && req.url === '/v3/charges?type=mobile_money_uganda') {
        charges.push(JSON.parse(body));
        return res.end(JSON.stringify({ status: 'success', message: 'Charge initiated', meta: { authorization: { redirect: 'https://checkout.example/approve', mode: 'redirect' } } }));
      }
      const m = req.url?.match(/^\/v3\/transactions\/(\d+)\/verify$/);
      const tx = m && txs.get(Number(m[1]));
      if (tx) return res.end(JSON.stringify({ status: 'success', data: tx }));
      res.writeHead(404).end('{"status":"error"}');
    });
  });
  await new Promise<void>((r) => flw.listen(0, r));
  const { port } = flw.address() as AddressInfo;
  const config: Config = {
    port: 0, databaseUrl: '', dataDir: undefined as unknown as string, sms: 'log', payments: 'flutterwave', push: 'log', seed: true,
    africasTalking: { username: '', apiKey: '', senderId: '' }, devPayMs: 0,
    flutterwave: { secretKey: 'FLWSECK_TEST-x', webhookHash: HASH, email: 'payments@chakula.example', api: `http://localhost:${port}` },
  };
  server = await createServer(config);
});
after(async () => {
  await server.close();
  flw.close();
});

async function call(method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const res = await server.app.request(path, {
    method,
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), ...opts.headers },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

async function studentToken(phone: string) {
  const sent = await call('POST', '/auth/code', { body: { phone } });
  return (await call('POST', '/auth/verify', { body: { phone, code: sent.json.devCode } })).json.token as string;
}

const order = (payMethod: string) => ({ kitchenId: 'nakawa-kitchen', dropPointId: 'library', payMethod, lines: [{ dishId: 'pilau', quantity: 1 }] });
const webhook = (id: number, hash = HASH) => call('POST', '/payments/flutterwave/webhook', { headers: { 'verif-hash': hash }, body: { event: 'charge.completed', data: { id } } });

test('an Airtel payment starts on Flutterwave and cooks once the verified webhook arrives', async () => {
  const token = await studentToken('0752 111 222');
  const placed = await call('POST', '/orders', { token, body: order('airtel') });
  assert.equal(placed.status, 201, JSON.stringify(placed.json));
  assert.equal(placed.json.payment.redirectUrl, 'https://checkout.example/approve');
  const charge = charges.at(-1)!;
  assert.deepEqual([charge.network, charge.phone_number, charge.amount, charge.currency], ['AIRTEL', '0752111222', 9000, 'UGX']);

  // A forged webhook changes nothing.
  txs.set(1, { id: 1, status: 'successful', amount: 9000, currency: 'UGX', tx_ref: charge.tx_ref });
  assert.equal((await webhook(1, 'wrong')).status, 401);
  assert.equal((await call('GET', `/orders/${placed.json.order.id}`, { token })).json.status, 'awaiting_payment');

  assert.equal((await webhook(1)).status, 200);
  assert.equal((await call('GET', `/orders/${placed.json.order.id}`, { token })).json.status, 'cooking');
  // Flutterwave retries webhooks; a second one is harmless.
  assert.equal((await webhook(1)).status, 200);
});

test('a short payment or a declined one cancels the order', async () => {
  const token = await studentToken('0772 333 444');
  const short = await call('POST', '/orders', { token, body: order('mtn') });
  txs.set(2, { id: 2, status: 'successful', amount: 500, currency: 'UGX', tx_ref: charges.at(-1)!.tx_ref });
  await webhook(2);
  const s = await call('GET', `/orders/${short.json.order.id}`, { token });
  assert.equal(s.json.status, 'cancelled');

  const declined = await call('POST', '/orders', { token, body: order('mtn') });
  assert.equal(charges.at(-1)!.network, 'MTN');
  txs.set(3, { id: 3, status: 'failed', amount: 9000, currency: 'UGX', tx_ref: charges.at(-1)!.tx_ref });
  await webhook(3);
  assert.equal((await call('GET', `/orders/${declined.json.order.id}`, { token })).json.status, 'cancelled');
});

test('a pending transaction waits for the next webhook', async () => {
  const token = await studentToken('0782 555 666');
  const placed = await call('POST', '/orders', { token, body: order('mtn') });
  txs.set(4, { id: 4, status: 'pending', amount: 9000, currency: 'UGX', tx_ref: charges.at(-1)!.tx_ref });
  assert.equal((await webhook(4)).status, 200);
  assert.equal((await call('GET', `/orders/${placed.json.order.id}`, { token })).json.status, 'awaiting_payment');
});
