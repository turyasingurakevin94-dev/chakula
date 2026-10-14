# Chakula Kitchen

The app partner kitchens use behind the counter. It is a separate Expo app from the student app at the repo root, with its own packages.

## What's in it

- **Orders**: cooking queue in first-in, first-out order, with one Ready button per order. A Cook now strip adds up every dish on the board. Ready and Done lists sit beside it.
- **New order alert**: only shows when "Accept it for me" is off. Pick 10, 15 or 20 minutes, then accept or decline within two minutes.
- **Order detail**: ready-by time with a +5 min button, offer a swap, print and POS status, and the rider.
- **Prints**: preview of the kitchen ticket, bag seal and student receipt for the 58 mm printer.
- **Prep**: scheduled drops, meal plan suppers and the weekly special.
- **Menu**: sold-out switches for dishes and extras, plus a prompt for missing photos.
- **Money**: tonight's payout, the verified MoMo account and past payouts.
- **Printer and POS**: auto-accept, ticket, seal and POS switches.
- **Counter display**: four lanes for a wall tablet. Works best in landscape.

All orders, riders, printing and money are sample data in `src/lib/kitchen.tsx`. New orders arrive 25 seconds after opening and then every 90 seconds. Nothing is connected to a backend, printer or POS yet.

## Run it

```bash
cd kitchen
npm ci
npx expo start
```

## Build and update

- **Build Kitchen app** (`.github/workflows/kitchen-apk.yml`) builds an installable APK. Run it by hand from the Actions tab.
- **Publish kitchen update** (`.github/workflows/kitchen-update.yml`) runs on every merge to main that touches `kitchen/`.

Both workflows need the `EXPO_TOKEN` secret. The first run creates the `chakula-kitchen` project on Expo.
