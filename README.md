# Chakula student app

The student app for Chakula, a campus food delivery service starting at MUBS Nakawa. "Chakula" is a placeholder name.
It runs on Android and iOS with Expo (React Native) and Expo Router, and uses design direction A ("Warm Editorial").

## Run it
```bash
npm install
npx expo start      # scan the QR code with the Expo Go app on an Android or iPhone
npx expo start --web
npm run typecheck
```

## Layout
- `src/app/`: screens (home, `restaurant/[id]`, checkout, tracking)
- `src/components/ui.tsx`: shared buttons, icons, food image placeholder, quantity stepper
- `src/lib/theme.ts`: colours, fonts and radii from the style guide
- `src/lib/data.ts`: sample restaurants, menus and student profile (placeholder content)
- `src/lib/cart.tsx`: basket state (one restaurant per basket)

Payments, the live map and rider updates are mocked for now.
