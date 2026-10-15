import { readFile } from 'node:fs/promises';

// One small interface over two Postgres drivers: PGlite (Postgres in-process, for dev and tests,
// no install needed) and postgres.js (a real server in production). Same SQL on both.

export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  // Runs fn in one transaction; everything it writes lands together or not at all.
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};

export async function openDb(opts: { url?: string; dataDir?: string }): Promise<Db> {
  const db = opts.url ? await openPostgres(opts.url) : await openPglite(opts.dataDir);
  await migrate(db);
  return db;
}

async function openPglite(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  type Q = { query: typeof pg.query; exec: typeof pg.exec };
  const wrap = (q: Q, root: boolean): Db => ({
    async query<T>(sql: string, params: unknown[] = []) {
      if (!params.length && sql.includes(';')) {
        await q.exec(sql);
        return [] as T[];
      }
      return (await q.query<T>(sql, params)).rows;
    },
    tx: (fn) => (root ? pg.transaction((t) => fn(wrap(t as unknown as Q, false))) : fn(wrap(q, false))),
    close: () => (root ? pg.close() : Promise.resolve()),
  });
  return wrap(pg, true);
}

async function openPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import('postgres');
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  type S = Pick<typeof sql, 'unsafe'>;
  const wrap = (s: S, root: boolean): Db => ({
    query: async <T>(text: string, params: unknown[] = []) => (await s.unsafe(text, params as never[])) as unknown as T[],
    tx: async (fn) => (root ? ((await sql.begin((t) => fn(wrap(t as unknown as S, false)))) as never) : fn(wrap(s, false))),
    close: () => (root ? sql.end() : Promise.resolve()),
  });
  return wrap(sql, true);
}

async function migrate(db: Db) {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await db.query(schema);
}
