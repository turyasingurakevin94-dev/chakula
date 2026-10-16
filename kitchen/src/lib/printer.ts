import { PermissionsAndroid, Platform } from 'react-native';
import Printer, { type PairedDevice } from '../../modules/chakula-printer/src/ChakulaPrinterModule';
import { bagCode } from '../components/qr';
import { columns, Receipt, wrap } from './escpos';
import { clock, type Order } from './kitchen';
import { readSetting, saveSetting } from './server';

// Printing to the counter's Bluetooth receipt printer (58 mm, ESC/POS). The printer is paired once
// in the phone's Bluetooth settings, then picked in Printer and POS. Kitchen APKs built before
// printing came have no printer code: `available` is false there and nothing prints.

export type { PairedDevice };
export const available = !!Printer;
const KEY = 'chakula.kitchen.printer';

let chosen: PairedDevice | null = null;
let loaded = false;

export async function savedPrinter(): Promise<PairedDevice | null> {
  if (loaded) return chosen;
  loaded = true;
  try {
    const raw = await readSetting(KEY);
    const p = raw ? (JSON.parse(raw) as PairedDevice) : null;
    chosen = p && typeof p.address === 'string' ? p : null;
  } catch {
    chosen = null;
  }
  return chosen;
}

export async function choosePrinter(p: PairedDevice | null) {
  chosen = p;
  loaded = true;
  await Printer?.disconnectAsync().catch(() => {});
  await saveSetting(KEY, p ? JSON.stringify(p) : null);
}

// Android 12+ asks for "Nearby devices" before the app may talk to Bluetooth.
async function allowed() {
  if (Platform.OS !== 'android' || Platform.Version < 31) return true;
  const r = await PermissionsAndroid.request('android.permission.BLUETOOTH_CONNECT' as never);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

const words = (e: unknown) => (e instanceof Error ? e.message : 'The printer didn’t answer.');

export async function pairedPrinters(): Promise<PairedDevice[]> {
  if (!Printer) throw new Error('This app version can’t print. Install the latest Chakula Kitchen app.');
  if (!(await allowed())) throw new Error('Allow Nearby devices so the app can find your printer.');
  try {
    return await Printer.pairedDevicesAsync();
  } catch (e) {
    throw new Error(words(e));
  }
}

async function send(data: Uint8Array) {
  const p = await savedPrinter();
  if (!Printer) throw new Error('This app version can’t print. Install the latest Chakula Kitchen app.');
  if (!p) throw new Error('No printer chosen yet. Pick one in Printer and POS.');
  if (!(await allowed())) throw new Error('Allow Nearby devices so the app can reach your printer.');
  try {
    await Printer.printAsync(p.address, data);
  } catch (e) {
    throw new Error(words(e));
  }
}

const n = (v: number) => v.toLocaleString('en-US');

export function testPage(kitchen: string) {
  const r = new Receipt().align('center').size(2).bold(true).line('Chakula').size(1).bold(false).line(kitchen).line('Printer is working.').line(clock(Date.now()));
  return r.qr(bagCode('test'), 5).line('Riders scan codes like this.').cut().build();
}

// The cook's ticket: big number, what to make, extras in black bars, the note boxed.
function ticket(r: Receipt, o: Order) {
  r.align('left').invert(true).size(2).bold(true).line(` ${o.id} `).invert(false).size(1);
  r.line(`DUE ${clock(o.dueAt)}`).bold(false);
  r.lines(wrap(`${o.student.split(' ')[0]} - ${o.place.split(',')[0]}`.toUpperCase())).rule('=');
  for (const i of o.items) {
    r.bold(true).size(2).line(`${i.qty}`).size(1);
    r.lines(wrap(i.name.toUpperCase())).bold(false);
    for (const e of i.extras ?? []) r.invert(true).bold(true).line(` ${e.startsWith('No ') ? e.toUpperCase() : `+ ${e.toUpperCase()}`} `).invert(false).bold(false);
    r.line();
  }
  if (o.note) r.rule('*').bold(true).line('NOTE').bold(false).lines(wrap(o.note)).rule('*');
  return r.line(`PRINTED ${clock(Date.now())}`).cut();
}

// The bag seal: the rider scans its QR to pick the bag up.
function seal(r: Receipt, o: Order, kitchen: string) {
  r.align('center').bold(true).line('SEALED FOR').size(2).lines(wrap(o.student, 16)).size(1).line(o.place).bold(false).rule();
  if (o.serverId) r.qr(bagCode(o.serverId));
  r.size(2).bold(true).line(o.id).size(1).bold(false).line('Rider scans to pick up').rule();
  return r.lines(wrap(`Sealed at ${kitchen}. If this seal is broken, tell us in the app.`)).cut();
}

// The student's receipt.
function receipt(r: Receipt, o: Order, kitchen: string) {
  const d = new Date(o.inAt);
  r.align('center').size(2).bold(true).line('Chakula').size(1).bold(false).line('Campus dining, done properly.').align('left').rule();
  r.lines(columns('Kitchen', kitchen)).lines(columns('Order', o.id)).lines(columns('Date', `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${clock(o.inAt)}`)).lines(columns('Paid', o.paid)).rule();
  for (const i of o.items) {
    r.lines(columns(`${i.qty} ${i.name}`, n(i.price * i.qty)));
    for (const e of i.extras ?? []) r.line(`  ${e}`);
  }
  r.rule();
  const delivery = o.sale ? o.sale.total - o.sale.subtotal : 0;
  if (delivery > 0) r.lines(columns('Delivery', n(delivery)));
  r.bold(true).lines(columns('TOTAL UGX', n(o.sale?.total ?? o.items.reduce((s, i) => s + i.price * i.qty, 0)))).bold(false).rule();
  return r.align('center').line(`Thank you, ${o.student.split(' ')[0]}.`).line('Rate your meal in the Chakula app').cut();
}

export type Pieces = { ticket: boolean; seal: boolean };

// One print run for an order: the ticket, then the bag seal and the receipt.
export async function printOrder(o: Order, kitchen: string, pieces: Pieces = { ticket: true, seal: true }) {
  const r = new Receipt();
  if (pieces.ticket) ticket(r, o);
  if (pieces.seal) {
    seal(r, o, kitchen);
    receipt(r, o, kitchen);
  }
  await send(r.build());
}

export async function printTest(kitchen: string) {
  await send(testPage(kitchen));
}
