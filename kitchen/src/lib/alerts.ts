import type { AlertKind, Daily } from './notify';

// "Who hears what": each alert, and whether the counter tablet, the kitchen phone and the owner's
// phone hear it. Matches the K-Settings board on the notifications canvas.

export type Device = 'tablet' | 'phone' | 'owner';
export const DEVICES: { key: Device; label: string }[] = [
  { key: 'tablet', label: 'Counter tablet' },
  { key: 'phone', label: 'Kitchen phone' },
  { key: 'owner', label: "Owner's phone" },
];

// on/off: a switch, with its starting value. locked: always on. sms: always on, by text message.
// none: not offered on that device.
export type Cell = 'on' | 'off' | 'locked' | 'sms' | 'none';

export type RowKey = Exclude<AlertKind, 'bell'> | 'offline';

export type Row = { key: RowKey; title: string; detail: string; cells: Record<Device, Cell> };

export const ROWS: Row[] = [
  // The canvas lets the phone turn this off; Kevin asked for the critical ones locked on, since many
  // kitchens have only the phone.
  { key: 'newOrder', title: 'New order', detail: 'Bell once, ticket prints', cells: { tablet: 'locked', phone: 'locked', owner: 'none' } },
  { key: 'notSeen', title: 'Didn’t print', detail: 'Rings until someone taps', cells: { tablet: 'locked', phone: 'locked', owner: 'sms' } },
  { key: 'riderSoon', title: 'Rider 2 min away', detail: 'Names what isn’t ready', cells: { tablet: 'on', phone: 'on', owner: 'none' } },
  { key: 'runningOver', title: 'Ticket running over', detail: 'Soft chime, turns orange', cells: { tablet: 'on', phone: 'off', owner: 'none' } },
  { key: 'swap', title: 'Student chose a swap', detail: 'After "Something ran out"', cells: { tablet: 'on', phone: 'on', owner: 'none' } },
  { key: 'morning', title: 'Morning prep list', detail: '8:00 am', cells: { tablet: 'none', phone: 'on', owner: 'on' } },
  { key: 'payout', title: 'Tonight’s payout', detail: 'About 9:30 pm', cells: { tablet: 'none', phone: 'on', owner: 'locked' } },
  { key: 'offline', title: 'Kitchen went offline', detail: 'Tablet or internet down', cells: { tablet: 'none', phone: 'locked', owner: 'sms' } },
];

export type Hears = Record<RowKey, Record<Device, boolean>>;

export function isLocked(c: Cell) {
  return c === 'locked' || c === 'sms';
}

export function defaultHears(): Hears {
  const out = {} as Hears;
  for (const r of ROWS) {
    out[r.key] = { tablet: false, phone: false, owner: false };
    for (const d of DEVICES) out[r.key][d.key] = r.cells[d.key] === 'on' || isLocked(r.cells[d.key]);
  }
  return out;
}

export function hears(h: Hears, key: RowKey, device: Device) {
  const cell = ROWS.find((r) => r.key === key)?.cells[device];
  if (!cell || cell === 'none') return false;
  return isLocked(cell) || h[key][device];
}

// The two daily reminders. Figures match the Prep and Money tabs' sample data.
export const MORNING: Daily = {
  kind: 'morning',
  hour: 8,
  minute: 0,
  title: 'Good morning, Nakawa Kitchen',
  body: '84 meals are already paid for today: 46 lunches and 38 suppers. Start lunch at 11:00.',
  url: '/prep',
};

export const PAYOUT: Daily = {
  kind: 'payout',
  hour: 21,
  minute: 30,
  title: 'Tonight’s payout: UGX 437,400',
  body: 'Goes to MoMo ••• 418 by 10:00 pm. 56 orders today, 4.8 stars.',
  url: '/money',
};
