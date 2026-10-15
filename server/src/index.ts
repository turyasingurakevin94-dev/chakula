import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { createServer } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const server = await createServer(config);

const http = serve({ fetch: server.app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Chakula server on http://localhost:${info.port} (sms ${config.sms}, payments ${config.payments}, push ${config.push}, db ${config.databaseUrl ? 'postgres' : 'embedded'})`);
}) as Server;
http.on('upgrade', (req, socket, head) => void server.live.upgrade(req, socket, head));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    http.close();
    await server.close();
    process.exit(0);
  });
}
