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
  if (!add(m) || m.from !== 'rider') return;
  if (state.open !== m.orderId) set({ ...state, unread: { ...state.unread, [m.orderId]: (state.unread[m.orderId] ?? 0) + 1 } });
  for (const fn of incoming) fn(m);
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
  const known = new Set(list.map((m) => m.id));
  // Keep anything that arrived live while the list was loading.
  const extra = (state.byOrder[orderId] ?? []).filter((m) => !known.has(m.id));
  set({ ...state, byOrder: { ...state.byOrder, [orderId]: [...list, ...extra] } });
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
