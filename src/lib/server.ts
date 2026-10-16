import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Talks to the Chakula server (server/ in this repo). It is off until the app is built or
// started with EXPO_PUBLIC_API_URL set, e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:4000, so
// builds without it keep running on the sample data exactly as before.

export const SERVER_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
export const onServer = SERVER_URL.length > 0;

export type AppName = 'student' | 'kitchen' | 'rider';
export type ServerUser = { id: string; phone: string; role: string; name: string | null; kitchenId: string | null; dropPointId: string | null };
export type ServerStatus = 'awaiting_payment' | 'cooking' | 'ready' | 'picked_up' | 'at_gate' | 'delivered' | 'cancelled';
export type ServerOrder = {
  id: string;
  number: number;
  status: ServerStatus;
  kitchen: { id: string; name: string };
  dropPoint: { id: string; name: string };
  student: { name: string | null; phone?: string };
  lines: { dishId: string; name: string; unitPrice: number; quantity: number; extras: { id: string; name: string; price: number }[]; pepper: string | null; note: string | null }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payMethod: 'mtn' | 'airtel' | 'cash' | 'wallet';
  paid: boolean;
  cashToCollect: number;
  // Only on the student's own orders.
  handoverCode?: string;
  note: string | null;
  // phone: only on the student's own order, while the rider has it.
  rider: { id: string; name: string | null; phone?: string } | null;
  times: Record<'placed' | 'paid' | 'ready' | 'riderAssigned' | 'pickedUp' | 'atGate' | 'delivered' | 'cancelled', string | null>;
  cancelReason: string | null;
};
// GET /wallet. Amounts are whole shillings: + money in, − an order.
export type ServerWalletEntry = { id: string; amount: number; kind: 'topup' | 'order' | 'refund'; createdAt: string; orderId: string | null; orderNumber: number | null; topupId: string | null; method: string | null };
export type ServerWallet = {
  balance: number;
  entries: ServerWalletEntry[];
  pendingTopups: { id: string; amount: number; method: string; createdAt: string }[];
  limits: { min: number; max: number };
};
// A chat message between the student and the rider on an order.
export type ChatMessage = { id: string; orderId: string; from: 'student' | 'rider'; body: string; at: string };
export type LiveMessage =
  | { type: 'hello'; userId: string; role: string }
  | { type: 'order'; order: ServerOrder }
  | { type: 'run-taken'; orderId: string }
  | { type: 'rider-location'; orderId: string; lat: number; lng: number; at: string }
  | { type: 'wallet'; balance: number; topup?: { id: string; status: 'succeeded' | 'failed'; amount: number } }
  | { type: 'message'; message: ChatMessage };

// The server's own words ("Chicken pilau just ran out."), ready to show.
export class ServerError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// The session token, kept on the phone so the student stays signed in. On Android and iOS it goes
// in expo-secure-store, loaded lazily inside try/catch: APKs built before it was added lack its native
// code, and OTA updates still run this JavaScript on them, so there it stays in memory only (signing
// in again after the app restarts). On web it goes in localStorage.
const TOKEN_KEY = 'chakula.student.token';
type SecureStore = typeof import('expo-secure-store');
let secure: SecureStore | null | undefined;
function loadSecureStore(): SecureStore | null {
  if (secure !== undefined) return secure;
  secure = null;
  if (Platform.OS === 'web') return secure;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secure = require('expo-secure-store') as SecureStore;
  } catch {
    secure = null;
  }
  return secure;
}

function webStorage(): Storage | null {
  try {
    return Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

// Saved on the phone; quietly does nothing where it can't (old APKs, private browsing).
export async function saveItem(key: string, value: string | null) {
  try {
    const web = webStorage();
    if (web) {
      if (value === null) web.removeItem(key);
      else web.setItem(key, value);
      return;
    }
    const store = loadSecureStore();
    if (!store) return;
    if (value === null) await store.deleteItemAsync(key);
    else await store.setItemAsync(key, value);
  } catch {
    // Not saved: the student signs in again next time, as before.
  }
}

export async function readItem(key: string): Promise<string | null> {
  try {
    const web = webStorage();
    if (web) return web.getItem(key);
    return (await loadSecureStore()?.getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}

let token: string | null = null;
export const getToken = () => token;
export const setToken = (t: string | null) => {
  token = t;
  void saveItem(TOKEN_KEY, t);
};

// The token saved by an earlier session, if any. Also puts it back in memory for api().
export async function restoreToken(): Promise<string | null> {
  const saved = await readItem(TOKEN_KEY);
  if (saved && !token) token = saved;
  return token;
}

// Called when the server says the token is no longer good (401), so the app can go back to sign-in.
let onSignedOut: (() => void) | null = null;
export const setOnSignedOut = (fn: (() => void) | null) => {
  onSignedOut = fn;
};

export async function api<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  let res: Response;
  // The token this request is sent with; a 401 only signs out if it is still the current one.
  const sent = token;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(sent ? { Authorization: `Bearer ${sent}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ServerError(0, 'No connection. Check your data and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && sent && token === sent && !path.startsWith('/auth/')) {
    setToken(null);
    onSignedOut?.();
  }
  if (!res.ok) throw new ServerError(res.status, json.error ?? 'Something went wrong. Try again.');
  return json as T;
}

export const sendCode = (phone: string, app: AppName) => api<{ phone: string; devCode?: string }>('POST', '/auth/code', { phone, app });

export async function verifyCode(phone: string, code: string, app: AppName) {
  const res = await api<{ token: string; user: ServerUser; isNew: boolean }>('POST', '/auth/verify', { phone, code, app });
  setToken(res.token);
  void registerPush(app);
  return res;
}

// Live updates: one WebSocket, reopened after a drop (phones lose signal between buildings).
export function connectLive(onMessage: (m: LiveMessage) => void) {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 1000;
  const open = () => {
    if (closed || !token) return;
    ws = new WebSocket(`${SERVER_URL.replace(/^http/, 'ws')}/live?token=${encodeURIComponent(token)}`);
    ws.onopen = () => {
      retry = 1000;
    };
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(String(e.data)));
      } catch {
        // Ignore anything that isn't ours.
      }
    };
    ws.onclose = () => {
      if (closed) return;
      setTimeout(open, retry);
      retry = Math.min(retry * 2, 30_000);
    };
  };
  open();
  return () => {
    closed = true;
    ws?.close();
  };
}

// Sends this phone's Expo push token, so the server can ring it. Older APKs without the
// notifications module, or a refused permission, just skip it.
export async function registerPush(app: AppName) {
  // Android push tokens come from Firebase, and these APKs have no Firebase set up
  // (google-services.json). Asking anyway closes the app on some phones, so Android skips it
  // until Firebase is added; the in-app live updates and local alerts still work.
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require('expo-notifications') as typeof import('expo-notifications');
    const { status } = await N.getPermissionsAsync();
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api('POST', '/push-tokens', { token: data, app });
  } catch {
    // Push is a nice-to-have here; the in-app live updates still work.
  }
}

// GPS to the campus map's metres (x east, y south of MUBS), the same sum as tools/campus-map/build.py.
const LAT0 = 0.3275;
const LON0 = 32.6165;
export function toCampusMetres(lat: number, lng: number): [number, number] {
  return [(lng - LON0) * 111320 * Math.cos((LAT0 * Math.PI) / 180), -(lat - LAT0) * 110574];
}
