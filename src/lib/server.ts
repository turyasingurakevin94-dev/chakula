import Constants from 'expo-constants';

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
  payMethod: 'mtn' | 'airtel' | 'cash';
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

// Kept in memory: signing in again after the app restarts. Saving it on the phone needs a
// secure storage module, which comes with the next APK.
let token: string | null = null;
export const getToken = () => token;
export const setToken = (t: string | null) => {
  token = t;
};

export async function api<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ServerError(0, 'No connection. Check your data and try again.');
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
