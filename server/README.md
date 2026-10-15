# Chakula server

One backend for the student, Kitchen and Rider apps: SMS sign-in, menus, orders, mobile money,
live order updates and rider tracking, and push notifications.

It runs with **no accounts and no keys**: the database is embedded (PGlite, real Postgres inside
Node), SMS codes print to the console, and a pretend MoMo approves payments after 4 seconds. Each
real service switches on with an environment variable once its account exists (see `.env.example`).

## Run it

Needs Node 22.18 or newer (it runs the TypeScript directly, no build step).

```bash
cd server
npm install
npm run dev        # http://localhost:4000, restarts on changes
npm test           # the whole order journey on an in-memory database
npm run typecheck
```

Data lives in `server/.data/` (delete it to start fresh). On an empty database it adds the sample
kitchens and menus from the student app, the 17 campus drop points, and dev logins:

| App | Phone | Account |
|---|---|---|
| Kitchen | 0700 000 001 | Nakawa Kitchen counter |
| Rider | 0700 000 011 | Moses |
| Rider | 0700 000 012 | Sam |
| Student | any Ugandan mobile number | signs up on first sign-in |

In dev mode `/auth/code` returns the code as `devCode`. A MoMo number ending in `000` is declined.

## How an order moves

```
awaiting_payment ─MoMo approved─► cooking ─kitchen taps Ready─► ready ─rider scans bag─► picked_up ─► at_gate ─code─► delivered
       └─declined or cancelled─► cancelled          (cash orders start at cooking)
```

- The server prices every order from the menu; the app's total is only a preview.
- Kitchens auto-accept: a paid order goes straight onto the board as cooking.
- A rider takes a run while it cooks or once it's ready; the first tap wins.
- Only the student sees the 4 digit handover code. The rider types what the student says.

## API

All bodies are JSON. Signed-in calls send `Authorization: Bearer <token>`.

| Who | Call | What |
|---|---|---|
| Anyone | `POST /auth/code` `{phone, app}` | Texts a 6 digit code. `app` is student, kitchen or rider |
| Anyone | `POST /auth/verify` `{phone, code, app}` | Returns `{token, user, isNew}` |
| Anyone | `GET /kitchens`, `GET /drop-points` | Menus with extras and sold out flags; the map's drop points |
| Signed in | `GET/PATCH /me`, `POST /push-tokens` `{token, app}`, `POST /auth/sign-out` | Profile, Expo push token |
| Student | `POST /orders` | `{kitchenId, dropPointId, lines:[{dishId, quantity, extraIds, pepper, note}], payMethod: mtn/airtel/cash, payPhone?}` |
| Student | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` | `GET /orders/:id` includes `riderLocation` while on the way |
| Kitchen | `GET /kitchen/orders`, `POST /kitchen/orders/:id/ready` | Today's board; seal the bag |
| Kitchen | `PATCH /kitchen` `{open}`, `PATCH /kitchen/dishes/:id` `{soldOut}`, `PATCH /kitchen/dishes/:id/extras/:id` `{soldOut}` | Open or close, sold out |
| Rider | `GET /rider/runs`, `POST /rider/orders/:id/take`, `/pick-up`, `/at-gate`, `/deliver` `{code}` | Run offers and steps |
| Rider | `POST /rider/location` `{lat, lng}` | Every few seconds while riding |
| Flutterwave | `POST /payments/flutterwave/webhook` | Payment outcome; checked before use |
| Apps | `GET /live?token=` (WebSocket) | Pushes `order`, `run-taken` and `rider-location` messages |

## Code map

- `src/app.ts` routes; `src/orders.ts` the order journey; `src/auth.ts` SMS sign-in and sessions
- `src/notify.ts` who hears what; `src/live.ts` WebSocket updates
- `src/providers/` SMS (console or Africa's Talking), push (console or Expo), payments (dev for now)
- `src/schema.sql` tables; `src/seed.ts` sample data; `src/db.ts` PGlite or Postgres

## Payments (Flutterwave)

`PAYMENT_PROVIDER=flutterwave` charges MTN and Airtel MoMo through Flutterwave
(`/v3/charges?type=mobile_money_uganda`). The student's app opens Flutterwave's waiting page while
they approve on their phone. Flutterwave then calls `POST /payments/flutterwave/webhook`; the
server checks the `verif-hash` header, re-reads the transaction from Flutterwave and only cooks
the order if the status, amount, currency and reference all match. Needs `FLW_SECRET_KEY`,
`FLW_WEBHOOK_HASH` and `FLW_EMAIL` (see `.env.example`), and the webhook URL plus the same secret
hash set in the Flutterwave dashboard. Use the test keys first: test payments approve themselves.

## Using it from the apps

All three apps use this server when started or built with `EXPO_PUBLIC_API_URL`; without it they
run on their sample data as before. On a phone use the computer's address on the same Wi-Fi:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npx expo start --clear   # in the repo root, kitchen/ or rider/
```

Use `--clear` whenever the address changes, or Metro may keep the old one.

## Not built yet

Card and wallet, refunds (a short or late payment is logged for a manual refund), cancelling
MoMo orders nobody approved, ordering for later, offering a run to one rider at a time, SMS backup when a push isn't
seen in 60 seconds, meal plans, ratings and tips, rider pay, an admin screen, staying signed in
after the app restarts (needs secure storage in a new APK), and phone GPS for riders (needs
expo-location in a new APK).
