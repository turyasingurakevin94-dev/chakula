import { useSyncExternalStore } from 'react';
import { api, type ChatMessage } from './server';

// Chat with the rider carrying an order. Messages come from GET /orders/:id/messages when the chat
// opens, then over the live connection (account.tsx hands them to receiveChat). Unread counts what
// the rider sent while the chat wasn't on screen.

type State = { byOrder: Record<string, ChatMessage[]>; unread: Record<string, number>; open: string | null };
let state: State = { byOrder: {}, unread: {}, open: null };
const listeners = new Set<() => void>();
const incoming = new Set<(m: ChatMessage) => void>();

function set(next: State) {
  state = next;
  for (const l of listeners) l();
}

function add(m: ChatMessage) {
  const list = state.byOrder[m.orderId] ?? [];
  if (list.some((x) => x.id === m.id)) return false;
  set({ ...state, byOrder: { ...state.byOrder, [m.orderId]: [...list, m] } });
  return true;
}

export function receiveChat(m: ChatMessage) {
  if (!add(m) || m.from !== 'rider' || state.open === m.orderId) return;
  set({ ...state, unread: { ...state.unread, [m.orderId]: (state.unread[m.orderId] ?? 0) + 1 } });
  for (const fn of incoming) fn(m);
}

// After the live connection drops and comes back: fetches the chat and counts anything new that
// arrived meanwhile. Messages seen in an earlier load don't count again.
export async function syncChat(orderId: string) {
  const known = new Set((state.byOrder[orderId] ?? []).map((m) => m.id));
  const first = !state.byOrder[orderId];
  const list = await api<ChatMessage[]>('GET', `/orders/${orderId}/messages`);
  const fresh = list.filter((m) => !known.has(m.id) && m.from === 'rider');
  set({ ...state, byOrder: { ...state.byOrder, [orderId]: mergeById(list, state.byOrder[orderId] ?? []) } });
  // On the first load (the app just opened) it can't tell old from new, so nothing counts as new;
  // anything sent while the app was closed came as a phone notification.
  if (first || !fresh.length || state.open === orderId) return;
  set({ ...state, unread: { ...state.unread, [orderId]: (state.unread[orderId] ?? 0) + fresh.length } });
  for (const m of fresh) for (const fn of incoming) fn(m);
}

function mergeById(list: ChatMessage[], extra: ChatMessage[]) {
  const ids = new Set(list.map((m) => m.id));
  return [...list, ...extra.filter((m) => !ids.has(m.id))];
}

// For the in-app banner: a rider message that arrived while its chat wasn't open.
export function onRiderMessage(fn: (m: ChatMessage) => void) {
  incoming.add(fn);
  return () => void incoming.delete(fn);
}

export function chatOpen(orderId: string | null) {
  set({ ...state, open: orderId, unread: orderId ? { ...state.unread, [orderId]: 0 } : state.unread });
}

export const isChatOpen = (orderId: string) => state.open === orderId;

export async function loadChat(orderId: string) {
  const list = await api<ChatMessage[]>('GET', `/orders/${orderId}/messages`);
  // Keep anything that arrived live while the list was loading.
  set({ ...state, byOrder: { ...state.byOrder, [orderId]: mergeById(list, state.byOrder[orderId] ?? []) } });
}

export async function sendChat(orderId: string, body: string) {
  add(await api<ChatMessage>('POST', `/orders/${orderId}/messages`, { body }));
}

// A sample order has no server: the chat stays on the phone and the sample rider answers.
export function sendSampleChat(orderId: string, body: string) {
  const at = new Date().toISOString();
  add({ id: `local-${Date.now()}`, orderId, from: 'student', body, at });
  setTimeout(() => receiveChat({ id: `local-${Date.now()}-r`, orderId, from: 'rider', body: 'Okay, see you soon.', at: new Date().toISOString() }), 2500);
}

export function useChat(orderId: string | undefined) {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => state,
  );
  return { messages: (orderId && s.byOrder[orderId]) || [], unread: (orderId && s.unread[orderId]) || 0 };
}
