import { DELIVERY_MINUTES, DEMO_MINUTE_MS, deliveryStartsAt, isWaiting, minutesLeft, type Order } from './account';

// The rider the prototype uses everywhere until the rider app assigns real ones.
export const rider = { name: 'Brian', initials: 'BK', detail: 'red helmet · UBF 412K' };

// Where an order is: 0 confirmed, 1 cooking, 2 on the way, 3 at the gate, 4 at the room.
export type Stage = 0 | 1 | 2 | 3 | 4;

// Prototype only: the order moves forward on the demo timer. The rider app will drive this for real.
export function stageOf(order: Order, active: boolean, now: number): Stage {
  if (!active) return 4;
  if (isWaiting(order, now)) return 0;
  const left = minutesLeft(order, now);
  if (left === 0) return 4;
  if (left === 1) return 3;
  if (left > DELIVERY_MINUTES - 2) return 1;
  return 2;
}

// When the demo timer moves an order into a stage, matching stageOf.
export function stageStartsAt(order: Order, stage: Stage) {
  const start = deliveryStartsAt(order);
  const minutes = [0, 0, 2, DELIVERY_MINUTES - 1, DELIVERY_MINUTES][stage] ?? 0;
  return stage === 0 ? order.placedAt : start + minutes * DEMO_MINUTE_MS;
}

// The clock time promised at checkout, counted in real minutes as on the tracking screen.
export function arriveBy(order: Order) {
  return order.scheduledFor ?? order.placedAt + DELIVERY_MINUTES * 60 * 1000;
}

// The two stages that make a sound: picked up, and at the gate.
export function isLoudStage(stage: Stage) {
  return stage === 2 || stage === 3;
}

// "Block B", from "Block B Hostel".
export function blockName(placeName: string | undefined) {
  return placeName?.replace(' Hostel', '') ?? 'your block';
}
