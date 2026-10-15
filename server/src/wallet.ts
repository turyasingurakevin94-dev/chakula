import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { User } from './auth.ts';
import type { Db } from './db.ts';
import { HttpError } from './errors.ts';
import { normalisePhone } from './phone.ts';
import type { PaymentProvider, PayOutcome } from './providers/payments.ts';

// The student wallet: top up with MTN or Airtel, pay for orders from the balance, get cancelled
// wallet orders back. Every change is one row in wallet_entries and the balance is their sum.
// No bonuses, no withdrawals, no welcome credit: money only comes in through a real payment.

export const TOPUP_MIN = 1_000;
export const TOPUP_MAX = 500_000;

export const topUpInput = z.object({
  amount: z.number().int().min(TOPUP_MIN).max(TOPUP_MAX),
  method: z.enum(['mtn', 'airtel']),
});

export type WalletChange = { userId: string; topup?: { id: string; status: 'succeeded' | 'failed'; amount: number } };

export const ugx = (n: number) => `UGX ${n.toLocaleString('en-US')}`;

export async function balanceOf(db: Db, userId: string) {
  const [row] = await db.query<{ balance: number }>('select coalesce(sum(amount), 0)::int as balance from wallet_entries where user_id = $1', [userId]);
  return Number(row?.balance ?? 0);
}

// The balance, with this student's wallet locked until the transaction ends, so two orders placed
// at once can't both spend the same money. Only call inside db.tx.
export async function lockedBalance(t: Db, userId: string) {
  await t.query('select id from users where id = $1 for update', [userId]);
  return balanceOf(t, userId);
}

// Charges or refunds an order. Safe to repeat: an order is charged once and refunded once.
export async function orderEntry(t: Db, userId: string, orderId: string, kind: 'order' | 'refund', amount: number) {
  const rows = await t.query<{ id: string }>(
    'insert into wallet_entries (id, user_id, amount, kind, order_id) values ($1, $2, $3, $4, $5) on conflict do nothing returning id',
    [randomUUID(), userId, kind === 'order' ? -amount : amount, kind, orderId],
  );
  return rows.length > 0;
}

type EntryRow = { id: string; amount: number; kind: 'topup' | 'order' | 'refund'; created_at: Date; order_id: string | null; order_number: number | null; payment_id: string | null; method: string | null };

export function createWallet(db: Db, deps: { payments: () => PaymentProvider; onChange: (c: WalletChange) => void }) {
  // A provider's answer about a top-up. Returns false when the payment isn't a top-up, so the
  // order flow can take it. Safe to receive twice: the payment only leaves pending once, and the
  // ledger accepts one credit per payment.
  async function settle(outcome: PayOutcome): Promise<boolean> {
    const settled = await db.tx(async (t) => {
      const [p] = await t.query<{ id: string; wallet_user_id: string; amount: number }>(
        "update payments set status = $2, provider_ref = coalesce($3, provider_ref), failure = $4, updated_at = now() where id = $1 and status = 'pending' and wallet_user_id is not null returning id, wallet_user_id, amount",
        [outcome.paymentId, outcome.status, outcome.providerRef ?? null, outcome.failure ?? null],
      );
      if (!p) return null;
      if (outcome.status === 'succeeded') {
        await t.query("insert into wallet_entries (id, user_id, amount, kind, payment_id) values ($1, $2, $3, 'topup', $4) on conflict do nothing", [randomUUID(), p.wallet_user_id, p.amount, p.id]);
      }
      return p;
    });
    if (settled) {
      deps.onChange({ userId: settled.wallet_user_id, topup: { id: settled.id, status: outcome.status, amount: settled.amount } });
      return true;
    }
    const [known] = await db.query('select id from payments where id = $1 and wallet_user_id is not null', [outcome.paymentId]);
    return !!known;
  }

  return {
    settle,

    async view(user: User) {
      const entries = await db.query<EntryRow>(
        `select e.id, e.amount, e.kind, e.created_at, e.order_id, o.number as order_number, e.payment_id, p.method
         from wallet_entries e
         left join orders o on o.id = e.order_id
         left join payments p on p.id = e.payment_id
         where e.user_id = $1
         order by e.created_at desc, e.id
         limit 50`,
        [user.id],
      );
      // Top-ups still waiting for the student to approve on their phone.
      const pending = await db.query<{ id: string; amount: number; method: string; created_at: Date }>(
        "select id, amount, method, created_at from payments where wallet_user_id = $1 and status = 'pending' and created_at > now() - interval '15 minutes' order by created_at desc",
        [user.id],
      );
      return {
        balance: await balanceOf(db, user.id),
        entries: entries.map((e) => ({
          id: e.id, amount: e.amount, kind: e.kind, createdAt: e.created_at,
          orderId: e.order_id, orderNumber: e.order_number, topupId: e.payment_id, method: e.method,
        })),
        pendingTopups: pending.map((p) => ({ id: p.id, amount: p.amount, method: p.method, createdAt: p.created_at })),
        limits: { min: TOPUP_MIN, max: TOPUP_MAX },
      };
    },

    async topup(user: User, id: string) {
      const [p] = await db.query<{ id: string; amount: number; method: string; status: string; failure: string | null }>(
        'select id, amount, method, status, failure from payments where id = $1 and wallet_user_id = $2',
        [id, user.id],
      );
      if (!p) throw new HttpError(404, 'No such top-up.');
      return p;
    },

    // Asks the student's own phone to approve the top-up. The wallet is credited only when the
    // provider says the money arrived (settle below).
    async startTopup(user: User, input: z.infer<typeof topUpInput>, opts: { returnUrl?: string } = {}) {
      const phone = normalisePhone(user.phone);
      if (!phone) throw new HttpError(400, 'Your number doesn’t look like a Ugandan mobile number.');
      const provider = deps.payments();
      const id = randomUUID();
      await db.query(
        "insert into payments (id, order_id, wallet_user_id, provider, method, phone, amount, status) values ($1, null, $2, $3, $4, $5, $6, 'pending')",
        [id, user.id, provider.name, input.method, phone, input.amount],
      );
      try {
        const started = await provider.start({ paymentId: id, amount: input.amount, phone, method: input.method, reference: 'Chakula wallet top-up', name: user.name ?? undefined, returnUrl: opts.returnUrl });
        await db.query('update payments set provider_ref = $2 where id = $1', [id, started.providerRef]);
        return { id, amount: input.amount, method: input.method, status: 'pending' as const, ...(started.redirectUrl ? { redirectUrl: started.redirectUrl } : {}) };
      } catch (e) {
        console.error('[payments] top-up start failed', e);
        await settle({ paymentId: id, status: 'failed', failure: 'Couldn’t reach mobile money' });
        throw new HttpError(502, 'Mobile money didn’t answer. Nothing was charged; try again.');
      }
    },

  };
}

export type Wallet = ReturnType<typeof createWallet>;
