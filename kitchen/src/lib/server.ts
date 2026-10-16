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

let token: string | null = null;
export const getToken = () => token;
export const setToken = (t: string | null) => {
  token = t;
};

// ---- Staying signed in ----
// The sign-in is saved on the phone (expo-secure-store; localStorage on the web), so the counter
// opens straight onto the board. The APK that is already installed was built without the secure
// store's native code and gets this JavaScript over the air, so the module is only required after
// checking its native half exists, inside try/catch. Without it the sign-in stays in memory only,
// as before, and the counter signs in again after a restart.

const SAVED_KEY = 'chakula.kitchen.session';
type SecureStore = typeof import('expo-secure-store');
let secure: SecureStore | null | undefined;

function secureStore(): SecureStore | null {
  if (secure !== undefined) return secure;
  secure = null;
  if (Platform.OS === 'web') return secure;
  try {
    if (!requireOptionalNativeModule('ExpoSecureStore')) return secure;
    // A lazy require on purpose: an import would load the package on builds without its native code.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secure = require('expo-secure-store') as SecureStore;
  } catch {
    secure = null;
  }
  return secure;
}

function webStorage(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

// Never let a slow or stuck store hold the app on a blank screen.
function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      },
    );
  });
}

export type SavedSession = { token: string; user: ServerUser | null };

async function readSaved(): Promise<string | null> {
  const web = webStorage();
  if (web) {
    try {
      return web.getItem(SAVED_KEY);
    } catch {
      return null;
    }
  }
  const store = secureStore();
  if (!store) return null;
  return within(store.getItemAsync(SAVED_KEY), 3000, null);
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const raw = await readSaved();
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedSession>;
    if (typeof saved.token !== 'string' || !saved.token) return null;
    return { token: saved.token, user: saved.user && typeof saved.user === 'object' ? saved.user : null };
  } catch {
    return null;
  }
}

export async function saveSession(session: SavedSession | null) {
  const raw = session ? JSON.stringify(session) : null;
  const web = webStorage();
  if (web) {
    try {
      if (raw) web.setItem(SAVED_KEY, raw);
      else web.removeItem(SAVED_KEY);
    } catch {
      // Private mode or storage blocked: memory only.
    }
    return;
  }
  const store = secureStore();
  if (!store) return;
  try {
    if (raw) await store.setItemAsync(SAVED_KEY, raw);
    else await store.deleteItemAsync(SAVED_KEY);
  } catch {
    // Memory only.
  }
}

export async function api<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, timeoutMs = 20_000): Promise<T> {
  let res: Response;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abort.signal,
    });
  } catch {
    throw new ServerError(0, 'No connection. Check your data and try again.');
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
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

// A small value kept on this phone (the chosen printer), in the same store as the sign-in.
export async function readSetting(key: string): Promise<string | null> {
  const web = webStorage();
  if (web) {
    try {
      return web.getItem(key);
    } catch {
      return null;
    }
  }
  const store = secureStore();
  return store ? within(store.getItemAsync(key).catch(() => null), 3000, null) : null;
}

export async function saveSetting(key: string, value: string | null) {
  const web = webStorage();
  try {
    if (web) {
      if (value === null) web.removeItem(key);
      else web.setItem(key, value);
      return;
    }
    const store = secureStore();
    if (!store) return;
    if (value === null) await store.deleteItemAsync(key);
    else await store.setItemAsync(key, value);
  } catch {
    // Memory only: the printer is picked again after a restart.
  }
}
