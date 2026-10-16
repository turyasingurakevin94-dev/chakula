import type { Db } from './db.ts';
import { RETURNED, type OrderEvent } from './orders.ts';
import type { Push, PushMessage } from './providers/push.ts';
import type { Sms } from './providers/sms.ts';

// Which order changes make a phone ring, following the notifications design: the student hears
// two per order (picked up with the code, and at the gate), plus silent "accepted" and "packed"
// lines; the kitchen hears each new order; the rider hears new runs and "bags sealed".
// A student with no push token gets the two loud ones by SMS.

export function createNotify(db: Db, push: Push, sms: Sms) {
  async function tokens(where: string, params: unknown[]) {
    return db.query<{ token: string; user_id: string }>(`select p.token, p.user_id from push_tokens p join users u on u.id = p.user_id where ${where}`, params);
  }

  async function toStudent(studentId: string, phone: string, title: string, body: string, data: Record<string, unknown>, smsText?: string, channel = 'orders') {
    const ts = await tokens("u.id = $1 and p.app = 'student'", [studentId]);
    if (ts.length) await push.send(ts.map((t) => ({ to: t.token, title, body, data, channel, ...(channel === 'updates' ? { quiet: true } : {}) })));
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
        // Kitchens accept every order they're sent, so this is the student's "accepted".
        await toStudent(order.student_id, order.student_phone, `${order.kitchen_name} accepted your order`, `They’re cooking it now. Your code is ${order.handover_code}.`, data, undefined, 'updates');
        break;
      }
      case 'ready': {
        // A silent line in the student's tray; the in-app banner covers it while the app is open.
        await toStudent(order.student_id, order.student_phone, 'Your food is packed', order.rider_name ? `${order.rider_name} is collecting it from ${order.kitchen_name}.` : `Sealed at ${order.kitchen_name}. A rider is on the way to collect it.`, data, undefined, 'updates');
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
        // Cash and wallet orders the student took back in their first minute: stop the kitchen.
        if (order.cancel_reason === 'Cancelled by the student') {
          const kitchen = await tokens("u.role = 'kitchen' and u.kitchen_id = $1 and p.app = 'kitchen'", [order.kitchen_id]);
          await push.send(kitchen.map((t) => ({ to: t.token, title: `Order ${order.number} cancelled`, body: 'The student took it back. Don’t cook it.', data, channel: 'bell' })));
        }
        if (order.cancel_reason === RETURNED) {
          const kitchen = await tokens("u.role = 'kitchen' and u.kitchen_id = $1 and p.app = 'kitchen'", [order.kitchen_id]);
          await push.send(kitchen.map((t) => ({ to: t.token, title: `Bag ${order.number} is coming back`, body: `${rider} couldn’t hand it over at ${order.drop_name}.`, data, channel: 'bell' })));
          const refund = order.pay_method === 'wallet' ? ' Your money is back in your wallet.' : order.pay_method === 'cash' ? '' : ' Chakula will refund your MoMo.';
          await toStudent(order.student_id, order.student_phone, 'Your order went back to the kitchen', `${rider} couldn’t reach you at ${order.drop_name}.${refund}`, data,
            `Chakula: ${rider} couldn't reach you at ${order.drop_name}, so order ${order.number} went back to the kitchen.${refund}`);
        }
        if (order.cancel_reason?.startsWith('Payment')) await toStudent(order.student_id, order.student_phone, 'Payment didn’t go through', 'Nothing was charged. Try again when you’re ready.', data);
        break;
    }
  };
}
