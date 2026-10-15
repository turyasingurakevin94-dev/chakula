import { Linking, Platform, TurboModuleRegistry } from 'react-native';

// Opens Flutterwave's MoMo page inside Chakula. APKs with react-native-webview show it on our own
// pay sheet (see PaySheet), so the student never sees a browser. Older APKs don't have WebView's
// native code, and OTA updates still run this JavaScript on them: there it opens in an in-app
// browser tab (expo-web-browser), or the phone's browser on the oldest ones, as before.
//
// When Flutterwave sends the student back to the server's /payments/done page (which points at
// chakula://payment-done), the sheet or tab closes by itself.

export const DONE_SCHEME = 'chakula://payment-done';

export type PayPage = { url: string; orderId?: string };

let listener: ((page: PayPage | null) => void) | null = null;
// The pay sheet registers here while it is on screen.
export function setPaySheetListener(fn: ((page: PayPage | null) => void) | null) {
  listener = fn;
}

// True when this APK has WebView's native code (checked without loading the JS, which would throw).
export function hasWebView() {
  if (Platform.OS === 'web') return false;
  try {
    return TurboModuleRegistry.get('RNCWebViewModule') != null;
  } catch {
    return false;
  }
}

type WebBrowser = typeof import('expo-web-browser');

let mod: WebBrowser | null | undefined;

function loadBrowser(): WebBrowser | null {
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

export async function openPaymentPage(url: string, orderId?: string) {
  if (listener && hasWebView()) {
    listener({ url, orderId });
    return;
  }
  const browser = loadBrowser();
  if (!browser) {
    await Linking.openURL(url).catch(() => {});
    return;
  }
  try {
    await browser.openAuthSessionAsync(url, DONE_SCHEME, { showTitle: true, enableBarCollapsing: true });
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}
