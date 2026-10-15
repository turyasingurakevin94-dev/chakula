import { useCallback, useEffect, useRef, useState } from 'react';
import { api, connectLive, ServerError, type ServerOrder, type ServerUser } from './server';

// The rider's side of the Chakula server: run offers and the rider's own orders, kept current over
// the live socket, and the phone's position while carrying food. Only used when onServer is true.

// How often the phone's position goes up while the rider carries food.
const GPS_MS = 5000;

export type OrderEvents = {
  // An order the rider can see changed. `before` is how we last saw it (undefined when new).
  onChange?: (order: ServerOrder, before: ServerOrder | undefined) => void;
  // A cancelled run offer, or one another rider took.
  onGone?: (orderId: string, why: 'taken' | 'cancelled') => void;
};

export function useServerOrders(user: ServerUser | null, events: OrderEvents) {
  // The ref is the truth (live messages read it straight away); the state re-renders the app.
  const store = useRef<Record<string, ServerOrder>>({});
  const [orders, setOrders] = useState<Record<string, ServerOrder>>({});
  const handlers = useRef(events);
  useEffect(() => {
    handlers.current = events;
  });

  const save = useCallback((next: Record<string, ServerOrder>) => {
    store.current = next;
    setOrders(next);
  }, []);

  // Keeps the server's latest copy of an order. Cancelled ones disappear.
  const put = useCallback(
    (o: ServerOrder) => {
      const before = store.current[o.id];
      const next = { ...store.current };
      if (o.status === 'cancelled') delete next[o.id];
      else next[o.id] = o;
      save(next);
      return before;
    },
    [save],
  );

  const remove = useCallback(
    (id: string) => {
      if (!store.current[id]) return;
      const next = { ...store.current };
      delete next[id];
      save(next);
    },
    [save],
  );

  // Offers and our unfinished orders. Delivered ones stay so the run in progress keeps its stops.
  const load = useCallback(async () => {
    try {
      const list = await api<ServerOrder[]>('GET', '/rider/runs');
      const next: Record<string, ServerOrder> = {};
      for (const o of Object.values(store.current)) if (o.status === 'delivered') next[o.id] = o;
      for (const o of list) next[o.id] = o;
      save(next);
    } catch {
      // The socket reopens and loads again.
    }
  }, [save]);

  useEffect(() => {
    if (!user) return;
    // "hello" comes on every (re)connect, so anything missed while the signal was gone is loaded again.
    return connectLive((m) => {
      if (m.type === 'hello') void load();
      if (m.type === 'order') {
        const before = put(m.order);
        if (m.order.status !== 'cancelled') handlers.current.onChange?.(m.order, before);
        else if (before) handlers.current.onGone?.(m.order.id, 'cancelled');
      }
      if (m.type === 'run-taken') {
        remove(m.orderId);
        handlers.current.onGone?.(m.orderId, 'taken');
      }
    });
  }, [user, load, put, remove]);

  // GPS while carrying food, so the student sees the dot move.
  const carrying = !!user && Object.values(orders).some((o) => o.rider?.id === user.id && (o.status === 'picked_up' || o.status === 'at_gate'));
  useEffect(() => {
    if (!carrying) return;
    const geo = gps();
    if (!geo) return;
    const send = () =>
      geo.getCurrentPosition(
        (p) => void api('POST', '/rider/location', { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {}),
        () => {},
        { enableHighAccuracy: true, maximumAge: GPS_MS, timeout: GPS_MS },
      );
    send();
    const t = setInterval(send, GPS_MS);
    return () => clearInterval(t);
  }, [carrying]);

  return { orders, put, remove };
}

type Geo = {
  getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void, fail: () => void, options: object) => void;
};

// The browser's GPS. The APK has no location module yet (that needs a new APK), so phones skip it.
function gps(): Geo | null {
  const nav = (globalThis as { navigator?: { geolocation?: Geo } }).navigator;
  return nav?.geolocation?.getCurrentPosition ? nav.geolocation : null;
}

// The server's words, or a plain fallback.
export function errorText(e: unknown) {
  return e instanceof ServerError ? e.message : 'Something went wrong. Try again.';
}
