import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { createAuth, type AppName, type Role, type User } from './auth.ts';
import type { Config } from './config.ts';
import { openDb } from './db.ts';
import { HttpError } from './errors.ts';
import { createLive } from './live.ts';
import { createNotify } from './notify.ts';
import { createOrders, placeOrderInput, viewOrder, type OrderEvent } from './orders.ts';
import { createPayments, type PaymentProvider } from './providers/payments.ts';
import { createPush } from './providers/push.ts';
import { createSms } from './providers/sms.ts';
import { seed } from './seed.ts';

type Env = { Variables: { user: User; token: string } };

export async function createServer(config: Config) {
  const db = await openDb({ url: config.databaseUrl, dataDir: config.dataDir });
  if (config.seed && (await seed(db))) console.log('[seed] sample kitchens, menus and dev logins added');

  const sms = createSms(config);
  const push = createPush(config);
  const auth = createAuth(db, sms, { revealCodes: config.sms === 'log' });
  const live = createLive(auth);
  const notify = createNotify(db, push, sms);
  let payments: PaymentProvider;
  const orders = createOrders(db, {
    payments: () => payments,
    onEvent: (e: OrderEvent) => {
      live.order(e);
      notify(e).catch((err) => console.error('[notify]', err));
    },
  });
  payments = createPayments(config, (o) => orders.settle(o));

  const app = new Hono<Env>();
  // The apps' web previews call from another origin. Phones don't need it.
  app.use('*', cors());

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 400);
    console.error(err);
    return c.json({ error: 'Something went wrong on our side.' }, 500);
  });

  async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, `Bad request: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    return parsed.data;
  }

  // Routes after this need "Authorization: Bearer <token>" from /auth/verify.
  const signedIn = (...roles: Role[]) =>
    async (c: Context<Env>, next: () => Promise<void>) => {
      const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
      const user = await auth.userForToken(token);
      if (!user || !token) throw new HttpError(401, 'Please sign in again.');
      if (roles.length && !roles.includes(user.role) && user.role !== 'admin') throw new HttpError(403, 'This account can’t do that.');
      c.set('user', user);
      c.set('token', token);
      await next();
    };

  const app_ = z.enum(['student', 'kitchen', 'rider']);
  const me = (u: User) => ({ id: u.id, phone: u.phone, role: u.role, name: u.name, kitchenId: u.kitchen_id, dropPointId: u.drop_point_id });

  app.get('/health', (c) => c.json({ ok: true, payments: payments.name, sms: config.sms, push: config.push }));

  // ---- Sign in ----
  app.post('/auth/code', async (c) => {
    const { phone, app: name } = await body(c, z.object({ phone: z.string(), app: app_.default('student') }));
    return c.json(await auth.requestCode(phone, name as AppName));
  });
  app.post('/auth/verify', async (c) => {
    const { phone, code, app: name } = await body(c, z.object({ phone: z.string(), code: z.string().regex(/^\s*\d{6}\s*$/), app: app_.default('student') }));
    const { token, user, isNew } = await auth.verifyCode(phone, code, name as AppName);
    return c.json({ token, user: me(user), isNew });
  });
  app.post('/auth/sign-out', signedIn(), async (c) => {
    await auth.signOut(c.get('token'));
    return c.json({ ok: true });
  });

  app.get('/me', signedIn(), (c) => c.json(me(c.get('user'))));
  app.patch('/me', signedIn(), async (c) => {
    const input = await body(c, z.object({ name: z.string().trim().min(1).max(60).optional(), dropPointId: z.string().optional() }));
    const [user] = await db.query<User>(
      'update users set name = coalesce($2, name), drop_point_id = coalesce($3, drop_point_id) where id = $1 returning *',
      [c.get('user').id, input.name ?? null, input.dropPointId ?? null],
    );
    return c.json(me(user!));
  });

  app.post('/push-tokens', signedIn(), async (c) => {
    const { token, app: name } = await body(c, z.object({ token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/), app: app_ }));
    await db.query(
      'insert into push_tokens (token, user_id, app) values ($1, $2, $3) on conflict (token) do update set user_id = excluded.user_id, app = excluded.app, updated_at = now()',
      [token, c.get('user').id, name],
    );
    return c.json({ ok: true });
  });

  // ---- Menus (anyone can look) ----
  app.get('/drop-points', async (c) => c.json(await db.query('select id, name, kind from drop_points order by kind, name')));

  app.get('/kitchens', async (c) => {
    const kitchens = await db.query<Record<string, unknown> & { id: string }>('select * from kitchens order by sort, name');
    const dishes = await db.query<Record<string, unknown> & { kitchen_id: string; id: string }>('select * from dishes order by sort, name');
    const extras = await db.query<Record<string, unknown> & { kitchen_id: string; dish_id: string }>('select * from dish_extras order by sort, name');
    return c.json(
      kitchens.map((k) => ({
        id: k.id, name: k.name, cuisine: k.cuisine, tags: k.tags, photo: k.photo, deliveryFee: k.delivery_fee, minutes: k.minutes,
        open: k.open, opensAt: k.opens_at, rating: k.rating, ratingCount: k.rating_count,
        menu: dishes
          .filter((d) => d.kitchen_id === k.id)
          .map((d) => ({
            id: d.id, name: d.name, description: d.description, category: d.category, price: d.price, prepMinutes: d.prep_minutes,
            pepper: d.pepper, photo: d.photo, soldOut: d.sold_out,
            extras: extras.filter((e) => e.kitchen_id === k.id && e.dish_id === d.id).map((e) => ({ id: e.id, name: e.name, price: e.price, soldOut: e.sold_out })),
          })),
      })),
    );
  });

  // ---- Students ----
  app.post('/orders', signedIn('student'), async (c) => {
    const user = c.get('user');
    const { order, lines, payment } = await orders.place(user, await body(c, placeOrderInput), { returnUrl: `${publicOrigin(c)}/payments/done` });
    return c.json({ order: viewOrder(order, lines, user), payment }, 201);
  });
  app.get('/orders', signedIn(), async (c) => {
    const user = c.get('user');
    return c.json((await orders.forStudent(user)).map(({ order, lines }) => viewOrder(order, lines, user)));
  });
  app.get('/orders/:id', signedIn(), async (c) => {
    const user = c.get('user');
    const { order, lines } = await orders.mine(user, c.req.param('id')!);
    const [loc] = order.rider_id && ['picked_up', 'at_gate'].includes(order.status)
      ? await db.query('select lat, lng, at from rider_locations where rider_id = $1', [order.rider_id])
      : [];
    return c.json({ ...viewOrder(order, lines, user), riderLocation: loc ?? null });
  });
  app.post('/orders/:id/cancel', signedIn('student'), async (c) => {
    const user = c.get('user');
    const { order, lines } = await orders.cancel(user, c.req.param('id')!);
    return c.json(viewOrder(order, lines, user));
  });

  // ---- Payment provider callbacks ----
  // Flutterwave's page lands here when the student is done. The app's in-app browser closes when it
  // sees the chakula:// address; anywhere else this page just says to go back to the app.
  app.get('/payments/done', (c) =>
    c.html(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chakula</title>' +
        '<body style="font-family:sans-serif;background:#FFF8F0;color:#1B4332;text-align:center;padding:48px 24px">' +
        '<p>All done. Going back to Chakula…</p><p><a href="chakula://payment-done" style="color:#1B4332">Open Chakula</a></p>' +
        '<script>location.replace("chakula://payment-done")</script>',
    ),
  );
  app.post('/payments/:provider/webhook', async (c) => {
    if (c.req.param('provider') !== payments.name || !payments.webhook) throw new HttpError(404, 'Not found.');
    let outcome;
    try {
      outcome = await payments.webhook(c.req.raw.headers, await c.req.json(), async (paymentId) => {
        const [p] = await db.query<{ amount: number }>('select amount from payments where id = $1 and provider = $2', [paymentId, payments.name]);
        return p ?? null;
      });
    } catch (e) {
      console.error('[payments] webhook refused:', e instanceof Error ? e.message : e);
      return c.json({ ok: false }, 401);
    }
    if (outcome) await orders.settle(outcome);
    return c.json({ ok: true });
  });

  // ---- Kitchens ----
  app.get('/kitchen/orders', signedIn('kitchen'), async (c) => {
    const user = c.get('user');
    return c.json((await orders.forKitchen(user)).map(({ order, lines }) => viewOrder(order, lines, user)));
  });
  app.post('/kitchen/orders/:id/ready', signedIn('kitchen'), async (c) => {
    const user = c.get('user');
    const { order, lines } = await orders.markReady(user, c.req.param('id')!);
    return c.json(viewOrder(order, lines, user));
  });
  app.patch('/kitchen', signedIn('kitchen'), async (c) => {
    const { open } = await body(c, z.object({ open: z.boolean() }));
    await db.query('update kitchens set open = $2 where id = $1', [c.get('user').kitchen_id, open]);
    return c.json({ ok: true, open });
  });
  app.patch('/kitchen/dishes/:dishId', signedIn('kitchen'), async (c) => {
    const { soldOut } = await body(c, z.object({ soldOut: z.boolean() }));
    const rows = await db.query('update dishes set sold_out = $3 where kitchen_id = $1 and id = $2 returning id', [c.get('user').kitchen_id, c.req.param('dishId')!, soldOut]);
    if (!rows.length) throw new HttpError(404, 'No such dish.');
    return c.json({ ok: true, soldOut });
  });
  app.patch('/kitchen/dishes/:dishId/extras/:extraId', signedIn('kitchen'), async (c) => {
    const { soldOut } = await body(c, z.object({ soldOut: z.boolean() }));
    const rows = await db.query('update dish_extras set sold_out = $4 where kitchen_id = $1 and dish_id = $2 and id = $3 returning id', [c.get('user').kitchen_id, c.req.param('dishId')!, c.req.param('extraId')!, soldOut]);
    if (!rows.length) throw new HttpError(404, 'No such extra.');
    return c.json({ ok: true, soldOut });
  });

  // ---- Riders ----
  const riderStep = (step: (u: User, id: string) => ReturnType<typeof orders.take>) =>
    async (c: Context<Env>) => {
      const user = c.get('user');
      const { order, lines } = await step(user, c.req.param('id')!);
      return c.json(viewOrder(order, lines, user));
    };
  app.get('/rider/runs', signedIn('rider'), async (c) => {
    const user = c.get('user');
    return c.json((await orders.forRider(user)).map(({ order, lines }) => viewOrder(order, lines, user)));
  });
  app.post('/rider/orders/:id/take', signedIn('rider'), riderStep(orders.take));
  app.post('/rider/orders/:id/pick-up', signedIn('rider'), riderStep(orders.pickUp));
  app.post('/rider/orders/:id/at-gate', signedIn('rider'), riderStep(orders.atGate));
  app.post('/rider/orders/:id/deliver', signedIn('rider'), async (c) => {
    const user = c.get('user');
    const { code } = await body(c, z.object({ code: z.string().regex(/^\s*\d{4}\s*$/) }));
    const { order, lines } = await orders.deliver(user, c.req.param('id')!, code);
    return c.json(viewOrder(order, lines, user));
  });
  // The rider app sends its GPS every few seconds while riding. Students carrying an order with
  // this rider see the dot move.
  app.post('/rider/location', signedIn('rider'), async (c) => {
    const { lat, lng } = await body(c, z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }));
    const user = c.get('user');
    const at = new Date();
    await db.query(
      'insert into rider_locations (rider_id, lat, lng, at) values ($1,$2,$3,$4) on conflict (rider_id) do update set lat = excluded.lat, lng = excluded.lng, at = excluded.at',
      [user.id, lat, lng, at],
    );
    const carrying = await db.query<{ id: string; student_id: string }>("select id, student_id from orders where rider_id = $1 and status in ('picked_up', 'at_gate')", [user.id]);
    live.riderLocation(new Map(carrying.map((o) => [o.student_id, o.id])), lat, lng, at);
    return c.json({ ok: true });
  });

  return {
    app,
    db,
    sms,
    push,
    live,
    orders,
    async close() {
      live.close();
      await db.close();
    },
  };
}

// This server's public address as the caller reached it. Railway terminates HTTPS in front of us,
// so the scheme comes from X-Forwarded-Proto.
function publicOrigin(c: Context) {
  const url = new URL(c.req.url);
  const proto = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.replace(':', '');
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || url.host;
  return `${proto}://${host}`;
}
