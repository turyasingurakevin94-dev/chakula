import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// expo-camera, loaded only when this APK has its native code. APKs built before it was added still
// run the newest JavaScript from updates; there the pickup screen falls back to a confirm button.
type CameraModule = typeof import('expo-camera');
let cached: CameraModule | null | undefined;

export function loadCamera(): CameraModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoCamera')) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-camera') as CameraModule;
  } catch {
    cached = null;
  }
  return cached;
}

// A bag's QR, shown on the kitchen's screen (and printed on the seal once printing works):
// "chakula:bag:<order id>". Returns the order id, or null for any other code.
export function parseBagCode(data: string) {
  return /^chakula:bag:([\w-]+)$/.exec(data.trim())?.[1] ?? null;
}
