import type { Config } from '../config.ts';

export type Sms = { send(to: string, message: string): Promise<void>; outbox: { to: string; message: string }[] };

export function createSms(config: Config): Sms {
  const outbox: Sms['outbox'] = [];
  if (config.sms === 'log') {
    return {
      outbox,
      async send(to, message) {
        outbox.push({ to, message });
        console.log(`[sms] to ${to}: ${message}`);
      },
    };
  }
  // Africa's Talking bulk SMS. Username "sandbox" goes to their free simulator, not real phones.
  const { username, apiKey, senderId } = config.africasTalking;
  if (!apiKey) throw new Error('SMS_PROVIDER=africastalking needs AT_API_KEY');
  const host = username === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
  return {
    outbox,
    async send(to, message) {
      const body = new URLSearchParams({ username, to, message });
      if (senderId) body.set('from', senderId);
      const res = await fetch(`${host}/version1/messaging`, {
        method: 'POST',
        headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error(`Africa's Talking answered ${res.status}: ${await res.text()}`);
    },
  };
}
