// Ugandan mobile numbers in one shape, +2567XXXXXXXX, whatever way they were typed:
// "0772 123 456", "772123456", "256772123456", "+256 772 123456".
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '');
  const local = digits.startsWith('256') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;
  return /^7\d{8}$/.test(local) ? `+256${local}` : null;
}

// Which network a number is on, from its prefix (MTN 076-078, Airtel 070, 074, 075). Used to suggest the right MoMo, never to block a payment.
export function networkOf(phone: string): 'mtn' | 'airtel' | null {
  const p = phone.slice(4, 6);
  if (['76', '77', '78'].includes(p)) return 'mtn';
  if (['70', '74', '75'].includes(p)) return 'airtel';
  return null;
}

// "0772 ••• 456", for showing a number back without printing all of it.
export function maskPhone(phone: string) {
  const local = `0${phone.slice(4)}`;
  return `${local.slice(0, 4)} ••• ${local.slice(-3)}`;
}
