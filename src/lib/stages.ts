import { dropPoints } from './campus';
import type { ServerStatus } from './server';
import { DELIVERY_MINUTES, DEMO_MINUTE_MS, deliveryStartsAt, isWaiting, minutesLeft, type Order } from './account';

// The rider the prototype uses everywhere until the rider app assigns real ones.
export const rider = { name: 'Brian', initials: 'BK', detail: 'red helmet · UBF 412K' };

// Where an order is: 0 confirmed, 1 cooking, 2 on the way, 3 at the gate, 4 at the room.
export type Stage = 0 | 1 | 2 | 3 | 4;

// Where a server order is, from what the kitchen and rider app have done.
const serverStages: Record<ServerStatus, Stage> = { awaiting_payment: 0, cooking: 1, ready: 1, picked_up: 2, at_gate: 3, delivered: 4, cancelled: 4 };

// The rider on this order: the real one once the server assigns them, the sample one before.
export function riderFor(order: Order | null | undefined) {
  if (!order?.serverId) return rider;
  // Before a rider takes the run, sentences say "your rider".
  if (!order.riderName) return { name: 'your rider', initials: '', detail: '' };
  const name = order.riderName;
  return { name, initials: name.split(/\s+/).map((p) => p[0]?.toUpperCase()).join('').slice(0, 2), detail: '' };
}

// Server orders move when the kitchen and rider act. Sample orders move on the demo timer.
export function stageOf(order: Order, active: boolean, now: number): Stage {
  if (order.status) return serverStages[order.status];
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
// On the server it is the real delivery time once delivered, and a fresh estimate before.
export function arriveBy(order: Order) {
  return stepTimes(order).times[4];
}

const MIN = 60 * 1000;
// Minutes from the kitchen starting to each tracking step: confirmed, cooked, on the way, at the gate, at the room.
const STEP_MINUTES = [0, 2, 3, DELIVERY_MINUTES - 1, DELIVERY_MINUTES];

// A clock time for each of the five tracking steps, and whether it is when the step really happened.
// Sample orders use the plan from when the order was placed. Server orders use the real times for
// steps that happened, and estimate the steps still ahead from the latest real one.
export function stepTimes(order: Order): { times: number[]; real: boolean[] } {
  const start = order.scheduledFor ? order.scheduledFor - DELIVERY_MINUTES * MIN : order.placedAt;
  const planned = [order.placedAt, start + 2 * MIN, start + 3 * MIN, (order.scheduledFor ?? order.placedAt + DELIVERY_MINUTES * MIN) - MIN, order.scheduledFor ?? order.placedAt + DELIVERY_MINUTES * MIN];
  const t = order.times;
  if (!order.serverId || !t) return { times: planned, real: planned.map(() => false) };
  const parse = (iso: string | null) => (iso ? Date.parse(iso) : NaN);
  const actual = [parse(t.placed), parse(t.ready), parse(t.pickedUp), parse(t.atGate), parse(t.delivered)];
  const times: number[] = [];
  const real: boolean[] = [];
  // The latest step that really happened, to count the rest from.
  let anchor = { at: order.placedAt, minutes: 0 };
  for (let i = 0; i < 5; i++) {
    const at = actual[i]!;
    if (Number.isFinite(at)) {
      times.push(at);
      real.push(true);
      anchor = { at, minutes: STEP_MINUTES[i]! };
    } else {
      times.push(Math.max(planned[i]!, anchor.at + (STEP_MINUTES[i]! - anchor.minutes) * MIN));
      real.push(false);
    }
  }
  return { times, real };
}

// The two stages that make a sound: picked up, and at the gate.
export function isLoudStage(stage: Stage) {
  return stage === 2 || stage === 3;
}

// Where the rider meets the student, said in a sentence: "the Main Gate", "the Akamwesi Hostel gate".
export function blockName(placeName: string | undefined) {
  const point = dropPoints.find((p) => p.name === placeName);
  if (!point) return placeName ? `the ${placeName}` : 'your gate';
  return point.kind === 'hostel' ? `the ${point.name} gate` : `the ${point.name}`;
}
