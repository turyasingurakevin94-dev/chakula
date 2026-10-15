import { Linking, Platform } from 'react-native';

// Opens Flutterwave's MoMo page over the app (an in-app browser sheet) instead of leaving for the
// phone's browser. When Flutterwave sends the student back to the server's /payments/done page,
// that page points at chakula://payment-done and the sheet closes by itself.
//
// expo-web-browser is loaded lazily, inside try/catch: APKs built before it was added don't contain
// its native code, and OTA updates still run this JavaScript on them. There it falls back to the
// phone's browser, as before.

type WebBrowser = typeof import('expo-web-browser');

let mod: WebBrowser | null | undefined;

function load(): WebBrowser | null {
  if (mod !== undefined) return mod;
  mod = null;
  if (Platform.OS === 'web') return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-web-browser') as WebBrowser;
  } catch {
    mod = null;
  }
  return mod;
}

export async function openPaymentPage(url: string) {
  const browser = load();
  if (!browser) {
    await Linking.openURL(url).catch(() => {});
    return;
  }
  try {
    await browser.openAuthSessionAsync(url, 'chakula://payment-done', { showTitle: true, enableBarCollapsing: true });
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}
