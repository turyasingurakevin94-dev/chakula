import { timingSafeEqual } from 'node:crypto';
import type { Config } from '../config.ts';

// A mobile money provider asks the payer's phone to approve a charge, then tells us the outcome
// later. "flutterwave" is the real one (MTN and Airtel through one account); "dev" pretends.

export type PayRequest = { paymentId: string; amount: number; phone: string; method: 'mtn' | 'airtel'; reference: string; name?: string };
export type PayOutcome = { paymentId: string; status: 'succeeded' | 'failed'; providerRef?: string; failure?: string };
// What the student's app should open to approve, when the provider has a page for it.
export type PayStart = { providerRef: string; redirectUrl?: string };

export type PaymentProvider = {
  name: string;
  // Starts the charge. The outcome arrives later through onOutcome, never as the return value.
  start(req: PayRequest): Promise<PayStart>;
  // A provider calling us back: the outcome to apply, or null to ignore it. Throws when the call
  // isn't really from the provider.
  webhook?(headers: Headers, body: unknown, expected: (paymentId: string) => Promise<{ amount: number } | null>): Promise<PayOutcome | null>;
};

export function createPayments(config: Config, onOutcome: (o: PayOutcome) => Promise<void>): PaymentProvider {
  return config.payments === 'flutterwave' ? flutterwave(config) : dev(config, onOutcome);
}

// Pretend MoMo: approves after a few seconds, like a student typing their PIN. A number ending
// in 000 declines, so the "payment didn't go through" path can be tried.
function dev(config: Config, onOutcome: (o: PayOutcome) => Promise<void>): PaymentProvider {
  return {
    name: 'dev',
    async start(req) {
      const providerRef = `dev-${req.paymentId.slice(0, 8)}`;
      const declined = req.phone.endsWith('000');
      setTimeout(() => {
        onOutcome({ paymentId: req.paymentId, providerRef, ...(declined ? { status: 'failed', failure: 'Declined on the phone' } : { status: 'succeeded' }) }).catch((e) =>
          console.error('[payments] settling failed', e),
        );
      }, config.devPayMs).unref();
      return { providerRef };
    },
  };
}

// Flutterwave v3 Uganda mobile money (developer.flutterwave.com/v3.0/docs/uganda):
// POST /v3/charges?type=mobile_money_uganda starts it, the student approves on their phone (the
// redirect page waits with them), then a charge.completed webhook arrives. We never trust the
// webhook alone: it must carry our secret hash, and the transaction is re-read from Flutterwave
// and checked for status, amount, currency and reference before the order cooks.
function flutterwave(config: Config): PaymentProvider {
  const { secretKey, webhookHash, email, api } = config.flutterwave;
  if (!secretKey || !webhookHash || !email) throw new Error('PAYMENT_PROVIDER=flutterwave needs FLW_SECRET_KEY, FLW_WEBHOOK_HASH and FLW_EMAIL');
  const headers = { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json', Accept: 'application/json' };

  return {
    name: 'flutterwave',
    async start(req) {
      const res = await fetch(`${api}/v3/charges?type=mobile_money_uganda`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tx_ref: req.paymentId,
          amount: req.amount,
          currency: 'UGX',
          network: req.method === 'airtel' ? 'AIRTEL' : 'MTN',
          // Flutterwave wants 07XXXXXXXX style local numbers in its Uganda examples.
          phone_number: `0${req.phone.slice(4)}`,
          email,
          ...(req.name ? { fullname: req.name } : {}),
          meta: { reference: req.reference },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string; meta?: { authorization?: { redirect?: string } } };
      if (!res.ok || json.status !== 'success') throw new Error(`Flutterwave refused the charge: ${json.message ?? res.status}`);
      return { providerRef: req.paymentId, redirectUrl: json.meta?.authorization?.redirect };
    },

    async webhook(h, body, expected) {
      const given = Buffer.from(h.get('verif-hash') ?? '');
      const want = Buffer.from(webhookHash);
      if (given.length !== want.length || !timingSafeEqual(given, want)) throw new Error('Bad webhook signature');
      const event = body as { event?: string; data?: { id?: number } };
      if (event.event !== 'charge.completed' || !event.data?.id) return null;

      const res = await fetch(`${api}/v3/transactions/${encodeURIComponent(String(event.data.id))}/verify`, { headers });
      const json = (await res.json().catch(() => ({}))) as { status?: string; data?: { id: number; status: string; amount: number; currency: string; tx_ref: string; processor_response?: string } };
      const tx = json.data;
      if (!res.ok || json.status !== 'success' || !tx) throw new Error(`Couldn't verify Flutterwave transaction ${event.data.id}`);
      const ours = await expected(tx.tx_ref);
      if (!ours) return null;
      const providerRef = String(tx.id);
      if (tx.status === 'successful') {
        if (tx.currency !== 'UGX' || tx.amount < ours.amount) return { paymentId: tx.tx_ref, status: 'failed', providerRef, failure: `Paid ${tx.currency} ${tx.amount}, expected UGX ${ours.amount}` };
        return { paymentId: tx.tx_ref, status: 'succeeded', providerRef };
      }
      if (tx.status === 'failed') return { paymentId: tx.tx_ref, status: 'failed', providerRef, failure: tx.processor_response ?? 'Declined' };
      // Still pending: a later webhook settles it.
      return null;
    },
  };
}
