# Chakula Rider

The app Chakula's delivery riders use. It is a separate Expo app from the student app at the repo root, with its own packages, like the kitchen app in `kitchen/`.

## What's in it

A run takes three actions: scan each bag seal at the kitchen hatch, ride the stops in order, and type the student's 4-digit code. The last digit completes the drop.

- **Run** (Today): the next run as a ticket with the hatch slot and stops, tonight's pay and the cash you hold. Tap Online to go offline.
- **Pick up**: scan each seal in loading order. The last scan starts the route.
- **Riding mode**: turn-by-turn card, voice switch, the stop and minutes left. The handover opens by itself on arrival.
- **Hand over**: the student's note, cash to collect first, and the code boxes.
- **Something wrong**: a 5-minute wait timer for a student who isn't answering (then take the bag back, still paid), other problems and the accident button.
- **Start your shift**: Gold Rider card and a three-tap check before going online.
- **Shift**: today's drops as a timeline.
- **Money**: tonight's pay, the week so far and today's tips.
- **Cash**: cash held against the limit, the hand-in code and receipts.

Everything is sample data in `src/lib/rider.tsx`: two runs (Library then Block B, then the after-lectures drop). The scanner reads each seal by itself after two seconds and the ride "arrives" after nine; there is no camera, GPS, voice or backend yet. Sample codes: Grace 3390, Brian 7415, Aisha 2208, Peter 5061, Joan 9134, Daniel 6627.

## Run it

```bash
cd rider
npm ci
npx expo start
```

## Build and update

- **Build Rider app** (`.github/workflows/rider-apk.yml`) builds an installable APK. Run it by hand from the Actions tab.
- **Publish rider update** (`.github/workflows/rider-update.yml`) runs on every merge to main that changes `rider/src`. Changes to packages, `app.json` or the icons in `rider/assets` need a new APK instead.

Both workflows need the `EXPO_TOKEN` secret. The first run creates the `chakula-rider` project on Expo.
