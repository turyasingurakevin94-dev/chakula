import type { Db } from './db.ts';
import type { OrderEvent } from './orders.ts';
import type { Push, PushMessage } from './providers/push.ts';
import type { Sms } from './providers/sms.ts';

// Which order changes make a phone ring, following the notifications design: the student hears
// two per order (picked up with the code, and at the gate); the kitchen hears each new order; the
// rider hears new runs and "bags sealed". A student with no push token gets those two by SMS.

export function createNotify(db: Db, push: Push, sms: Sms) {
  async function tokens(where: string, params: unknown[]) {
    return db.query<{ token: string; user_id: string }>(`select p.token, p.user_id from push_tokens p join users u on u.id = p.user_id where ${where}`, params);
  }

  async function toStudent(studentId: string, phone: string, title: string, body: string, data: Record<string, unknown>, smsText?: string) {
    const ts = await tokens("u.id = $1 and p.app = 'student'", [studentId]);
    if (ts.length) await push.send(ts.map((t) => ({ to: t.token, title, body, data, channel: 'orders' })));
    else if (smsText) await sms.send(phone, smsText);
  }

  return async function onOrderEvent({ order, change }: OrderEvent) {
    const data = { orderId: order.id, number: order.number, status: order.status };
    const rider = order.rider_name ?? 'Your rider';
    switch (change) {
      case 'cooking': {
        const kitchen = await tokens("u.role = 'kitchen' and u.kitchen_id = $1 and p.app = 'kitchen'", [order.kitchen_id]);
        // Riders with no unfinished run hear about it. Offering to one rider at a time comes with dispatch.
        const riders = await tokens(
          "u.role = 'rider' and p.app = 'rider' and not exists (select 1 from orders o where o.rider_id = u.id and o.status in ('cooking','ready','picked_up','at_gate'))",
          [],
        );
        const msgs: PushMessage[] = [
          ...kitchen.map((t) => ({ to: t.token, title: `New order ${order.number}`, body: `For ${order.drop_name}`, data, channel: 'bell' })),
          ...riders.map((t) => ({ to: t.token, title: 'New run', body: `${order.kitchen_name} to ${order.drop_name}`, data, channel: 'runs' })),
        ];
        await push.send(msgs);
        break;
      }
      case 'ready': {
        if (!order.rider_id) break;
        const ts = await tokens("u.id = $1 and p.app = 'rider'", [order.rider_id]);
        await push.send(ts.map((t) => ({ to: t.token, title: 'Bags sealed and waiting', body: `Bag ${order.number} at ${order.kitchen_name}`, data, channel: 'pickup' })));
        break;
      }
      case 'picked_up':
        await toStudent(order.student_id, order.student_phone, `${rider} has your food, code ${order.handover_code}`, `On the way to ${order.drop_name}.`, data,
          `Chakula: ${rider} has your food. Your code is ${order.handover_code}. Say it at ${order.drop_name}.`);
        break;
      case 'at_gate':
        await toStudent(order.student_id, order.student_phone, `${rider} is at ${order.drop_name}`, `Your code is ${order.handover_code}.`, data,
          `Chakula: ${rider} is at ${order.drop_name}. Your code is ${order.handover_code}.`);
        break;
      case 'cancelled':
        if (order.paid_at === null && order.cancel_reason === 'Cancelled by the student') {
          const kitchen = await tokens("u.role = 'kitchen' and u.kitchen_id = $1 and p.app = 'kitchen'", [order.kitchen_id]);
          await push.send(kitchen.map((t) => ({ to: t.token, title: `Order ${order.number} cancelled`, body: 'The student took it back. Don’t cook it.', data, channel: 'bell' })));
        }
        if (order.cancel_reason?.startsWith('Payment')) await toStudent(order.student_id, order.student_phone, 'Payment didn’t go through', 'Nothing was charged. Try again when you’re ready.', data);
        break;
    }
  };
}
