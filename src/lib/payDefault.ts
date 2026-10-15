import { useSyncExternalStore } from 'react';
import { readItem, saveItem } from './server';

// How the student usually pays, and which MoMo number to charge if not their own. Kept on the
// phone; checkout starts on it and the student can still change it per order.
export type DefaultMethod = 'mtn' | 'airtel' | 'wallet' | 'cash';
export type PayDefault = { method: DefaultMethod; momoPhone: string };

const KEY = 'chakula.student.pay';
let current: PayDefault = { method: 'mtn', momoPhone: '' };
const listeners = new Set<() => void>();

void readItem(KEY).then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<PayDefault>;
    current = { method: saved.method ?? current.method, momoPhone: saved.momoPhone ?? '' };
    listeners.forEach((l) => l());
  } catch {
    // A broken value just means the defaults.
  }
});

export function getPayDefault() {
  return current;
}

export function setPayDefault(next: PayDefault) {
  current = next;
  listeners.forEach((l) => l());
  void saveItem(KEY, JSON.stringify(next));
}

export function usePayDefault() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
