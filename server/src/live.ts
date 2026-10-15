import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Auth, User } from './auth.ts';
import { viewOrder, type OrderEvent } from './orders.ts';

// Live updates over one WebSocket per app (wss://…/live?token=…). The server sends JSON:
//   { type: 'order', order }                       an order you can see changed
//   { type: 'run-taken', orderId }                 riders: another rider took this run
//   { type: 'rider-location', orderId, lat, lng, at } students: your rider moved
//   { type: 'wallet', balance, topup? }            students: your wallet changed (topup: one settled)
// Apps still fetch over HTTP when they open; this only keeps the screen current.

export type Live = ReturnType<typeof createLive>;

export function createLive(auth: Auth) {
  const sockets = new Map<WebSocket, User>();
  const wss = new WebSocketServer({ noServer: true });

  const send = (ws: WebSocket, msg: unknown) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  wss.on('connection', (ws: WebSocket, user: User) => {
    sockets.set(ws, user);
    send(ws, { type: 'hello', userId: user.id, role: user.role });
    ws.on('close', () => sockets.delete(ws));
    ws.on('error', () => sockets.delete(ws));
  });

  // Keeps sockets alive through phone networks that drop quiet connections.
  const ping = setInterval(() => {
    for (const ws of sockets.keys()) ws.ping();
  }, 25_000);
  ping.unref();

  return {
    async upgrade(req: IncomingMessage, socket: import('node:stream').Duplex, head: Buffer) {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const user = url.pathname === '/live' ? await auth.userForToken(url.searchParams.get('token') ?? undefined) : null;
      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, user));
    },

    order({ order, lines, change }: OrderEvent) {
      for (const [ws, user] of sockets) {
        const sees =
          user.id === order.student_id ||
          (user.role === 'kitchen' && user.kitchen_id === order.kitchen_id && order.status !== 'awaiting_payment' && !(order.status === 'cancelled' && !order.paid_at && order.pay_method !== 'cash')) ||
          (user.role === 'rider' && (order.rider_id === user.id || (!order.rider_id && (order.status === 'cooking' || order.status === 'ready')))) ||
          (user.role === 'rider' && change === 'cancelled') ||
          user.role === 'admin';
        if (sees) send(ws, { type: 'order', order: viewOrder(order, lines, user) });
        else if (user.role === 'rider' && change === 'rider') send(ws, { type: 'run-taken', orderId: order.id });
      }
    },

    // Tells every app this student has open that their wallet changed.
    wallet(userId: string, msg: { balance: number; topup?: { id: string; status: 'succeeded' | 'failed'; amount: number } }) {
      for (const [ws, user] of sockets) if (user.id === userId) send(ws, { type: 'wallet', ...msg });
    },

    riderLocation(studentIds: Map<string, string>, lat: number, lng: number, at: Date) {
      for (const [ws, user] of sockets) {
        const orderId = studentIds.get(user.id);
        if (orderId) send(ws, { type: 'rider-location', orderId, lat, lng, at });
      }
    },

    close() {
      clearInterval(ping);
      for (const ws of sockets.keys()) ws.terminate();
      wss.close();
    },
  };
}
