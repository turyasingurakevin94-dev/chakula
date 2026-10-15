import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { User } from './auth.ts';
import type { Db } from './db.ts';
import { HttpError } from './errors.ts';
import { normalisePhone } from './phone.ts';
import type { PaymentProvider, PayOutcome } from './providers/payments.ts';

// One order's journey: awaiting_payment → cooking → ready → picked_up → at_gate → delivered.
// Paid orders start cooking the moment MoMo says yes (kitchens auto-accept and print); cash orders
// start straight away. Riders take a run, scan the bag at the kitchen, and finish with the
// student's 4 digit handover code. The server prices everything; the app's numbers are a preview.

export type Status = 'awaiting_payment' | 'cooking' | 'ready' | 'picked_up' | 'at_gate' | 'delivered' | 'cancelled';
const CANCEL_MS = 60_000;
const ACTIVE: Status[] = ['awaiting_payment', 'cooking', 'ready', 'picked_up', 'at_gate'];

export const placeOrderInput = z.object({
  kitchenId: z.string(),
  dropPointId: z.string(),
  lines: z
    .array(
      z.object({
        dishId: z.string(),
        quantity: z.number().int().min(1).max(20),
        extraIds: z.array(z.string()).max(10).default([]),
        pepper: z.enum(['None', 'Mild', 'Hot']).optional(),
        note: z.string().max(140).optional(),
      }),
    )
    .min(1)
    .max(30),
  note: z.string().max(280).optional(),
  payMethod: z.enum(['mtn', 'airtel', 'cash', 'wallet', 'card']),
  // The MoMo number to charge; the student's own number when not given.
  payPhone: z.string().optional(),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInput>;

type OrderRow = {
  id: string; number: number; status: Status; student_id: string; kitchen_id: string; drop_point_id: string;
  pay_method: 'mtn' | 'airtel' | 'cash'; subtotal: number; delivery_fee: number; total: number; handover_code: string;
  note: string | null; rider_id: string | null; created_at: Date; paid_at: Date | null; ready_at: Date | null;
  rider_at: Date | null; picked_at: Date | null; at_gate_at: Date | null; delivered_at: Date | null; cancelled_at: Date | null;
  cancel_reason: string | null; kitchen_name: string; drop_name: string; student_name: string | null; student_phone: string;
  rider_name: string | null;
};
type LineRow = { order_id: string; dish_id: string; name: string; unit_price: number; quantity: number; extras: { id: string; name: string; price: number }[]; pepper: string | null; note: string | null };

export type OrderEvent = { order: OrderRow; lines: LineRow[]; change: Status | 'rider' };

const SELECT = `
  select o.*, k.name as kitchen_name, d.name as drop_name, s.name as student_name, s.phone as student_phone, r.name as rider_name
  from orders o
  join kitchens k on k.id = o.kitchen_id
  join drop_points d on d.id = o.drop_point_id
  join users s on s.id = o.student_id
  left join users r on r.id = o.rider_id`;

// "Aisha Nakato" → "Aisha N.", as kitchens and riders see students.
function shortName(name: string | null) {
  if (!name) return 'Student';
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1]![0]}.` : first!;
}

// What one person may see of an order. Only the student sees the handover code; only the
// rider carrying it sees the student's number.
export function viewOrder(o: OrderRow, lines: LineRow[], viewer: User) {
  const isStudent = viewer.id === o.student_id;
  const isRider = viewer.role === 'rider' && viewer.id === o.rider_id;
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    kitchen: { id: o.kitchen_id, name: o.kitchen_name },
    dropPoint: { id: o.drop_point_id, name: o.drop_name },
    student: { name: isStudent ? o.student_name : shortName(o.student_name), ...(isRider ? { phone: o.student_phone } : {}) },
    lines: lines.map((l) => ({ dishId: l.dish_id, name: l.name, unitPrice: l.unit_price, quantity: l.quantity, extras: typeof l.extras === 'string' ? JSON.parse(l.extras) : l.extras, pepper: l.pepper, note: l.note })),
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    total: o.total,
    payMethod: o.pay_method,
    paid: !!o.paid_at,
    cashToCollect: o.pay_method === 'cash' && o.status !== 'delivered' ? o.total : 0,
    ...(isStudent || viewer.role === 'admin' ? { handoverCode: o.handover_code } : {}),
    note: o.note,
    rider: o.rider_id ? { id: o.rider_id, name: o.rider_name } : null,
    times: {
      placed: o.created_at, paid: o.paid_at, ready: o.ready_at, riderAssigned: o.rider_at, pickedUp: o.picked_at,
      atGate: o.at_gate_at, delivered: o.delivered_at, cancelled: o.cancelled_at,
    },
    cancelReason: o.cancel_reason,
  };
}
export type OrderView = ReturnType<typeof viewOrder>;

export function createOrders(db: Db, deps: { payments: () => PaymentProvider; onEvent: (e: OrderEvent) => void }) {
  async function load(where: string, params: unknown[], limit = 50) {
    const orders = await db.query<OrderRow>(`${SELECT} where ${where} order by o.created_at desc limit ${limit}`, params);
    if (!orders.length) return [];
    const lines = await db.query<LineRow>('select * from order_lines where order_id = any($1) order by line', [orders.map((o) => o.id)]);
    return orders.map((order) => ({ order, lines: lines.filter((l) => l.order_id === order.id) }));
  }

  async function loadOne(id: string) {
    const [found] = await load('o.id = $1', [id], 1);
    if (!found) throw new HttpError(404, 'No such order.');
    return found;
  }

  // Moves an order on, only from the status it's expected to be in, so two taps can't race.
  async function move(id: string, from: Status[], to: Status, set: string, params: unknown[] = []) {
    const rows = await db.query<{ id: string }>(
      `update orders set status = '${to}', ${set} where id = $1 and status = any($2) returning id`,
      [id, from, ...params],
    );
    if (!rows.length) throw new HttpError(409, 'This order has already moved on.');
    const found = await loadOne(id);
    deps.onEvent({ ...found, change: to });
    return found;
  }

  async function mine(user: User, id: string) {
    const found = await loadOne(id);
    const o = found.order;
    const allowed =
      user.role === 'admin' ||
      o.student_id === user.id ||
      (user.role === 'kitchen' && user.kitchen_id === o.kitchen_id) ||
      (user.role === 'rider' && (o.rider_id === user.id || (!o.rider_id && (o.status === 'cooking' || o.status === 'ready'))));
    if (!allowed) throw new HttpError(404, 'No such order.');
    return found;
  }

  // A payment provider's answer. Safe to receive twice: only a pending payment changes.
  async function settle(outcome: PayOutcome) {
    const [p] = await db.query<{ order_id: string }>(
      "update payments set status = $2, provider_ref = coalesce($3, provider_ref), failure = $4, updated_at = now() where id = $1 and status = 'pending' returning order_id",
      [outcome.paymentId, outcome.status, outcome.providerRef ?? null, outcome.failure ?? null],
    );
    if (!p) return;
    if (outcome.status === 'succeeded') {
      // Money arrived for an order the student already cancelled: it must go back to them.
      await move(p.order_id, ['awaiting_payment'], 'cooking', 'paid_at = now()').catch(() =>
        console.error(`[payments] ${outcome.paymentId} paid after its order was cancelled. Refund needed.`),
      );
    }
    else await move(p.order_id, ['awaiting_payment'], 'cancelled', "cancelled_at = now(), cancel_reason = 'Payment didn’t go through'");
  }

  return {
    load,
    loadOne,
    mine,

    async place(student: User, input: PlaceOrderInput, opts: { returnUrl?: string } = {}) {
      if (input.payMethod === 'wallet' || input.payMethod === 'card') throw new HttpError(400, 'Wallet and card payments aren’t switched on yet. Pay with MoMo or cash.');
      const [kitchen] = await db.query<{ id: string; open: boolean; opens_at: string | null; delivery_fee: number; name: string }>('select * from kitchens where id = $1', [input.kitchenId]);
      if (!kitchen) throw new HttpError(400, 'That kitchen isn’t on Chakula.');
      if (!kitchen.open) throw new HttpError(400, `${kitchen.name} is closed${kitchen.opens_at ? ` until ${kitchen.opens_at}` : ''}.`);
      const [drop] = await db.query('select id from drop_points where id = $1', [input.dropPointId]);
      if (!drop) throw new HttpError(400, 'Pick a drop point on the map.');
      const payPhone = input.payMethod === 'cash' ? student.phone : normalisePhone(input.payPhone ?? student.phone);
      if (!payPhone) throw new HttpError(400, 'That MoMo number doesn’t look right.');

      const dishes = await db.query<{ id: string; name: string; price: number; sold_out: boolean }>('select * from dishes where kitchen_id = $1', [kitchen.id]);
      const extras = await db.query<{ dish_id: string; id: string; name: string; price: number; sold_out: boolean }>('select * from dish_extras where kitchen_id = $1', [kitchen.id]);
      const priced = input.lines.map((l) => {
        const dish = dishes.find((d) => d.id === l.dishId);
        if (!dish) throw new HttpError(400, 'Something in your basket is no longer on the menu.');
        if (dish.sold_out) throw new HttpError(409, `${dish.name} just ran out.`);
        const chosen = [...new Set(l.extraIds)].map((eid) => {
          const e = extras.find((x) => x.dish_id === dish.id && x.id === eid);
          if (!e) throw new HttpError(400, `That extra isn’t offered with ${dish.name}.`);
          if (e.sold_out) throw new HttpError(409, `${e.name} just ran out.`);
          return { id: e.id, name: e.name, price: e.price };
        });
        return { dish, quantity: l.quantity, extras: chosen, unit: dish.price + chosen.reduce((n, e) => n + e.price, 0), pepper: l.pepper ?? null, note: l.note?.trim() || null };
      });
      const subtotal = priced.reduce((n, l) => n + l.unit * l.quantity, 0);
      const total = subtotal + kitchen.delivery_fee;
      const id = randomUUID();
      const cash = input.payMethod === 'cash';

      await db.tx(async (t) => {
        await t.query(
          `insert into orders (id, student_id, kitchen_id, drop_point_id, status, pay_method, subtotal, delivery_fee, total, handover_code, note)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [id, student.id, kitchen.id, input.dropPointId, cash ? 'cooking' : 'awaiting_payment', input.payMethod, subtotal, kitchen.delivery_fee, total, String(randomInt(1000, 10000)), input.note?.trim() || null],
        );
        for (const [i, l] of priced.entries()) {
          await t.query(
            'insert into order_lines (order_id, line, dish_id, name, unit_price, quantity, extras, pepper, note) values ($1,$2,$3,$4,$5,$6,$7::text::jsonb,$8,$9)',
            [id, i, l.dish.id, l.dish.name, l.unit, l.quantity, JSON.stringify(l.extras), l.pepper, l.note],
          );
        }
      });

      let payment: { id: string; status: 'pending'; redirectUrl?: string } | null = null;
      if (!cash) {
        const paymentId = randomUUID();
        const provider = deps.payments();
        let redirectUrl: string | undefined;
        await db.query("insert into payments (id, order_id, provider, method, phone, amount, status) values ($1,$2,$3,$4,$5,$6,'pending')", [paymentId, id, provider.name, input.payMethod, payPhone, total]);
        const [{ number }] = (await db.query<{ number: number }>('select number from orders where id = $1', [id])) as [{ number: number }];
        try {
          const started = await provider.start({ paymentId, amount: total, phone: payPhone, method: input.payMethod as 'mtn' | 'airtel', reference: `Chakula ${number}`, name: student.name ?? undefined, returnUrl: opts.returnUrl });
          await db.query('update payments set provider_ref = $2 where id = $1', [paymentId, started.providerRef]);
          redirectUrl = started.redirectUrl;
        } catch (e) {
          console.error('[payments] start failed', e);
          await settle({ paymentId, status: 'failed', failure: 'Couldn’t reach mobile money' });
          throw new HttpError(502, 'Mobile money didn’t answer. Nothing was charged; try again.');
        }
        payment = { id: paymentId, status: 'pending', ...(redirectUrl ? { redirectUrl } : {}) };
      }
      const found = await loadOne(id);
      deps.onEvent({ ...found, change: found.order.status });
      return { ...found, payment };
    },

    settle,

    // Undo: before paying, or a cash order in its first minute (the 5 second Undo on Home).
    async cancel(student: User, id: string) {
      const { order } = await mine(student, id);
      if (order.student_id !== student.id) throw new HttpError(404, 'No such order.');
      if (order.status === 'awaiting_payment') return move(id, ['awaiting_payment'], 'cancelled', "cancelled_at = now(), cancel_reason = 'Cancelled before paying'");
      const fresh = Date.now() - new Date(order.created_at).getTime() < CANCEL_MS;
      if (order.pay_method !== 'cash' || order.rider_id || !fresh) throw new HttpError(409, 'The kitchen has already started on this one.');
      return move(id, ['cooking'], 'cancelled', "cancelled_at = now(), cancel_reason = 'Cancelled by the student'");
    },

    // ---- Students ----
    forStudent: (user: User) => load('o.student_id = $1', [user.id]),

    // ---- Kitchens ----
    forKitchen: (user: User) => load("o.kitchen_id = $1 and (o.paid_at is not null or o.pay_method = 'cash') and o.created_at > now() - interval '1 day'", [user.kitchen_id], 200),

    async markReady(user: User, id: string) {
      const { order } = await mine(user, id);
      if (user.role !== 'admin' && order.kitchen_id !== user.kitchen_id) throw new HttpError(404, 'No such order.');
      return move(id, ['cooking'], 'ready', 'ready_at = now()');
    },

    // ---- Riders ----
    // Runs waiting for a rider, then the rider's own unfinished ones.
    forRider: (user: User) =>
      load("(o.rider_id is null and o.status in ('cooking', 'ready')) or (o.rider_id = $1 and o.status = any($2))", [user.id, ACTIVE], 100),

    async take(rider: User, id: string) {
      const rows = await db.query("update orders set rider_id = $2, rider_at = now() where id = $1 and rider_id is null and status in ('cooking', 'ready') returning id", [id, rider.id]);
      if (!rows.length) throw new HttpError(409, 'Another rider took this run.');
      const found = await loadOne(id);
      deps.onEvent({ ...found, change: 'rider' });
      return found;
    },

    async pickUp(rider: User, id: string) {
      const { order } = await mine(rider, id);
      if (order.rider_id !== rider.id) throw new HttpError(403, 'Take the run first.');
      if (order.status === 'cooking') throw new HttpError(409, 'The kitchen hasn’t sealed this bag yet.');
      return move(id, ['ready'], 'picked_up', 'picked_at = now()');
    },

    async atGate(rider: User, id: string) {
      const { order } = await mine(rider, id);
      if (order.rider_id !== rider.id) throw new HttpError(403, 'This isn’t your run.');
      return move(id, ['picked_up'], 'at_gate', 'at_gate_at = now()');
    },

    async deliver(rider: User, id: string, code: string) {
      const { order } = await mine(rider, id);
      if (order.rider_id !== rider.id) throw new HttpError(403, 'This isn’t your run.');
      if (code.trim() !== order.handover_code) throw new HttpError(400, 'That code doesn’t match. Ask the student to read it from their app.');
      return move(id, ['picked_up', 'at_gate'], 'delivered', 'delivered_at = now()');
    },
  };
}

export type Orders = ReturnType<typeof createOrders>;
