import { requireOptionalNativeModule } from 'expo';
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
  rider: { id: string; name: string | null } | null;
  times: Record<'placed' | 'paid' | 'ready' | 'riderAssigned' | 'pickedUp' | 'atGate' | 'delivered' | 'cancelled', string | null>;
  cancelReason: string | null;
};
export type LiveMessage =
  | { type: 'hello'; userId: string; role: string }
  | { type: 'order'; order: ServerOrder }
  | { type: 'run-taken'; orderId: string }
  | { type: 'rider-location'; orderId: string; lat: number; lng: number; at: string };

// The server's own words ("Chicken pilau just ran out."), ready to show.
export class ServerError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// The session: the token and who it belongs to. Kept on the phone (expo-secure-store) so the rider
// stays signed in when the app restarts. APKs built before secure-store was added don't have its
// native module, and OTA updates still run this code there, so it is loaded lazily and those phones
// fall back to memory only (signing in each time, as before). The web preview uses localStorage.
const SESSION_KEY = 'chakula-rider-session';
let token: string | null = null;
export const getToken = () => token;

type SecureStoreModule = typeof import('expo-secure-store');
let secureStore: SecureStoreModule | null | undefined;
function loadSecureStore(): SecureStoreModule | null {
  if (secureStore !== undefined) return secureStore;
  secureStore = null;
  if (Platform.OS === 'web') return secureStore;
  try {
    // Check the native side first: the JS package throws on import without it.
    if (!requireOptionalNativeModule('ExpoSecureStore')) return secureStore;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secureStore = require('expo-secure-store') as SecureStoreModule;
  } catch {
    secureStore = null;
  }
  return secureStore;
}

function webStorage(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

type Saved = { token: string; user: ServerUser };

function save(saved: Saved | null) {
  const value = saved ? JSON.stringify(saved) : null;
  const web = webStorage();
  if (web) {
    try {
      if (value) web.setItem(SESSION_KEY, value);
      else web.removeItem(SESSION_KEY);
    } catch {
      // Private mode or blocked storage: memory only.
    }
    return;
  }
  const store = loadSecureStore();
  if (!store) return;
  try {
    (value ? store.setItemAsync(SESSION_KEY, value) : store.deleteItemAsync(SESSION_KEY)).catch(() => {});
  } catch {
    // Memory only.
  }
}

async function load(): Promise<Saved | null> {
  let raw: string | null = null;
  const web = webStorage();
  if (web) {
    try {
      raw = web.getItem(SESSION_KEY);
    } catch {
      raw = null;
    }
  } else {
    const store = loadSecureStore();
    if (store) raw = await withTimeout(store.getItemAsync(SESSION_KEY), 3000).catch(() => null);
  }
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Saved;
    return typeof saved?.token === 'string' && saved.user?.id ? saved : null;
  } catch {
    return null;
  }
}

export function setSession(t: string, user: ServerUser) {
  token = t;
  save({ token: t, user });
}

function clearSession() {
  token = null;
  save(null);
}

// Told when the server refuses the token (signed out elsewhere, or it ran out).
let signedOutHandler: (() => void) | null = null;
export function whenSignedOut(fn: (() => void) | null) {
  signedOutHandler = fn;
}

// On start: the saved session, checked with GET /me. Null when there is none or the server refused
// it. When the server can't be reached in time the saved rider is used, so a weak signal never
// keeps the app on a blank screen; the live socket catches up once the signal is back.
export async function restoreSession(timeoutMs = 6000): Promise<ServerUser | null> {
  const saved = await load();
  if (!saved) return null;
  token = saved.token;
  try {
    const user = await withTimeout(api<ServerUser>('GET', '/me'), timeoutMs);
    if (user.role !== 'rider' && user.role !== 'admin') {
      clearSession();
      return null;
    }
    setSession(saved.token, user);
    return user;
  } catch (e) {
    if (e instanceof ServerError && (e.status === 401 || e.status === 403)) {
      clearSession();
      return null;
    }
    return saved.user;
  }
}

export async function signOut() {
  const had = token;
  clearSession();
  if (had) await withTimeout(fetch(`${SERVER_URL}/auth/sign-out`, { method: 'POST', headers: { Authorization: `Bearer ${had}` } }), 4000).catch(() => {});
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new ServerError(0, 'No connection. Check your data and try again.')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

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
  // A refused token: forget it and go back to sign in.
  if (res.status === 401 && sent && token === sent) {
    clearSession();
    signedOutHandler?.();
  }
  if (!res.ok) throw new ServerError(res.status, json.error ?? 'Something went wrong. Try again.');
  return json as T;
}

export const sendCode = (phone: string, app: AppName) => api<{ phone: string; devCode?: string }>('POST', '/auth/code', { phone, app });

export async function verifyCode(phone: string, code: string, app: AppName) {
  const res = await api<{ token: string; user: ServerUser; isNew: boolean }>('POST', '/auth/verify', { phone, code, app });
  setSession(res.token, res.user);
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
