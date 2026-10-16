import { Linking } from 'react-native';

// The Chakula support line riders call when something goes wrong on a run (Kevin, 2026-10-16).
export const CHAKULA_LINE = '0776974950';

export function callChakula(notify: (message: string) => void) {
  Linking.openURL(`tel:${CHAKULA_LINE}`).catch(() => notify(`Couldn't open the phone app. Chakula: ${CHAKULA_LINE}`));
}
