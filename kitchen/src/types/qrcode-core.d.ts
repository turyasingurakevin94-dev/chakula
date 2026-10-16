// The qrcode package's encoder, imported on its own so no canvas or file code comes along.
declare module 'qrcode/lib/core/qrcode' {
  export function create(text: string, options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }): {
    modules: { size: number; get(row: number, col: number): number | boolean };
  };
}
