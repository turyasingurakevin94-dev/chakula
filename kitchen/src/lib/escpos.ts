// ESC/POS bytes for 58 mm Bluetooth receipt printers: 32 characters a line in the normal font,
// 384 dots wide. Only commands every cheap printer understands; the QR code is printed as a
// picture (not the printer's own QR command, which many don't have).
import { create } from 'qrcode/lib/core/qrcode';

export const WIDTH = 32;
const DOTS = 384;

// The printers' code page has no curly quotes, dashes or "×"; everything else non-ASCII goes as "?".
function ascii(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/·/g, '-')
    .replace(/…/g, '...')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e\n]/g, '?');
}

// Word-wrapped to `width` characters.
export function wrap(text: string, width = WIDTH): string[] {
  width = Math.max(1, Math.floor(width));
  const out: string[] = [];
  for (const para of ascii(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if (line.length + 1 + word.length <= width) line += ` ${word}`;
      else {
        out.push(line);
        line = word;
      }
      while (line.length > width) {
        out.push(line.slice(0, width));
        line = line.slice(width);
      }
    }
    out.push(line);
  }
  return out;
}

// "2 Chicken pilau ........ 20,000": left text, right text, on one line (the left wraps first).
export function columns(left: string, right: string, width = WIDTH): string[] {
  const r = ascii(right);
  // A long right side (a kitchen's full name) goes on its own lines, right-aligned.
  if (r.length > width - 8) return [...wrap(left, width), ...wrap(r, width).map((l) => l.padStart(width))];
  const lines = wrap(left, width - r.length - 1);
  const last = lines.pop() ?? '';
  return [...lines, last + ' '.repeat(Math.max(1, width - last.length - r.length)) + r];
}

export class Receipt {
  private bytes: number[] = [0x1b, 0x40]; // reset

  private raw(...b: number[]) {
    this.bytes.push(...b);
    return this;
  }

  align(a: 'left' | 'center' | 'right') {
    return this.raw(0x1b, 0x61, a === 'left' ? 0 : a === 'center' ? 1 : 2);
  }

  bold(on: boolean) {
    return this.raw(0x1b, 0x45, on ? 1 : 0);
  }

  // White on black, for extras ("black bars").
  invert(on: boolean) {
    return this.raw(0x1d, 0x42, on ? 1 : 0);
  }

  // 1 normal, 2 double width and height, 3 triple.
  size(n: 1 | 2 | 3) {
    const k = n - 1;
    return this.raw(0x1d, 0x21, (k << 4) | k);
  }

  text(s: string) {
    for (const ch of ascii(s)) this.bytes.push(ch.charCodeAt(0));
    return this;
  }

  line(s = '') {
    return this.text(s).raw(0x0a);
  }

  lines(list: string[]) {
    for (const l of list) this.line(l);
    return this;
  }

  rule(ch = '-') {
    return this.line(ch.repeat(WIDTH));
  }

  feed(n: number) {
    return this.raw(0x1b, 0x64, n);
  }

  // Feeds past the tear bar, then cuts on printers that have a cutter (others ignore it).
  cut() {
    return this.feed(4).raw(0x1d, 0x56, 0x42, 0x00);
  }

  // A QR code as a raster picture, centred, `scale` dots per module.
  qr(value: string, scale = 7) {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    // Scanners need four blank modules around the code.
    const quiet = 4;
    const n = modules.size + quiet * 2;
    const s = Math.max(1, Math.min(scale, Math.floor(DOTS / n)));
    const widthBytes = Math.ceil((n * s) / 8);
    const height = n * s;
    this.align('center').raw(0x1d, 0x76, 0x30, 0x00, widthBytes & 0xff, widthBytes >> 8, height & 0xff, height >> 8);
    for (let y = 0; y < height; y++) {
      const my = Math.floor(y / s) - quiet;
      for (let bx = 0; bx < widthBytes; bx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const mx = Math.floor((bx * 8 + bit) / s) - quiet;
          const dark = mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx);
          if (dark) byte |= 0x80 >> bit;
        }
        this.bytes.push(byte);
      }
    }
    return this.raw(0x0a);
  }

  build() {
    return Uint8Array.from(this.bytes);
  }
}
