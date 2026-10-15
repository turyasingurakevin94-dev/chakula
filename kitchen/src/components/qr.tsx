import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
// The encoder only: pure JavaScript, so it ships in an update with no new APK.
import { create } from 'qrcode/lib/core/qrcode';

// What a bag's QR says. The rider app reads it with its camera to pick that bag up.
export const bagCode = (orderId: string) => `chakula:bag:${orderId}`;

// A QR code drawn with react-native-svg: one path for every dark module, with the quiet zone
// scanners need around it.
export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const { n, d } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    let path = '';
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
    return { n: modules.size + 8, d: path };
  }, [value]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} accessibilityLabel="Bag QR code">
      <Rect width={n} height={n} fill="#FFFFFF" />
      <Path d={d} fill="#111111" />
    </Svg>
  );
}
