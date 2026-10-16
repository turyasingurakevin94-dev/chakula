import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { User } from './auth.ts';
import type { Db } from './db.ts';
import { HttpError } from './errors.ts';
import { RIDER_REACHABLE, type createOrders } from './orders.ts';
import type { Push } from './providers/push.ts';

// In-app chat between a student and the rider carrying their order, so neither needs the other's
// airtime. Only those two can read it; they can write while the rider is on the order.

export const sendMessageInput = z.object({ body: z.string().trim().min(1).max(500) });

export type ChatMessage = { id: string; orderId: string; from: 'student' | 'rider'; body: string; at: string };
type Row = { id: string; order_id: string; sender_role: 'student' | 'rider'; body: string; created_at: Date | string };

const view = (m: Row): ChatMessage => ({ id: m.id, orderId: m.order_id, from: m.sender_role, body: m.body, at: new Date(m.created_at).toISOString() });

export function createChat(
  db: Db,
  deps: { orders: ReturnType<typeof createOrders>; push: Push; onMessage: (to: string[], message: ChatMessage) => void },
) {
  // The order, if this user is its student or its rider.
  async function party(user: User, orderId: string) {
    const { order } = await deps.orders.mine(user, orderId);
    const side = order.student_id === user.id ? 'student' : order.rider_id && order.rider_id === user.id ? 'rider' : null;
    if (!side) throw new HttpError(404, 'No such order.');
    return { order, side } as const;
  }

  return {
    async list(user: User, orderId: string) {
      await party(user, orderId);
      // The latest 300, oldest first.
      const rows = await db.query<Row>('select * from messages where order_id = $1 order by created_at desc, id desc limit 300', [orderId]);
      return rows.reverse().map(view);
    },

    async send(user: User, orderId: string, body: string) {
      const { order, side } = await party(user, orderId);
      if (!order.rider_id || !RIDER_REACHABLE.includes(order.status)) throw new HttpError(409, 'This chat has closed.');
      const [row] = await db.query<Row>(
        'insert into messages (id, order_id, sender_id, sender_role, body) values ($1, $2, $3, $4, $5) returning *',
        [randomUUID(), orderId, user.id, side, body],
      );
      const message = view(row!);
      deps.onMessage([order.student_id, order.rider_id], message);

      // The other side hears it on their phone too.
      const to = side === 'student' ? order.rider_id : order.student_id;
      const app = side === 'student' ? 'rider' : 'student';
      // Tapping it opens the chat: the student app reads href, the rider app url (with the order).
      const open = app === 'rider' ? { url: `/chat?id=${orderId}` } : { href: '/chat' };
      const tokens = await db.query<{ token: string }>('select token from push_tokens where user_id = $1 and app = $2', [to, app]);
      const from = side === 'student' ? (order.student_name?.split(' ')[0] ?? 'Your student') : (order.rider_name ?? 'Your rider');
      await deps.push
        .send(tokens.map((t) => ({ to: t.token, title: from, body, data: { orderId, number: order.number, chat: true, ...open }, channel: app === 'rider' ? 'pickup' : 'orders' })))
        .catch((err) => console.error('[chat push]', err));
      return message;
    },
  };
}
