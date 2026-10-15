import type { Config } from '../config.ts';

export type PushMessage = { to: string; title: string; body: string; data?: Record<string, unknown>; channel: string };
export type Push = { send(messages: PushMessage[]): Promise<void>; sent: PushMessage[] };

// Expo's push service: free, no account needed beyond the apps' Expo project. Each app registers
// its token with POST /push-tokens. channel is an Android channel the app creates: student
// orders/updates, kitchen bell/soft, rider runs/pickup.
export function createPush(config: Config): Push {
  const sent: PushMessage[] = [];
  return {
    sent,
    async send(messages) {
      if (!messages.length) return;
      sent.push(...messages);
      if (config.push === 'log') {
        for (const m of messages) console.log(`[push] to ${m.to.slice(0, 24)}…: ${m.title} · ${m.body}`);
        return;
      }
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100).map((m) => ({
          to: m.to,
          title: m.title,
          body: m.body,
          data: m.data,
          sound: 'default',
          priority: 'high',
          channelId: m.channel,
        }));
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });
        if (!res.ok) console.error(`[push] Expo answered ${res.status}: ${await res.text()}`);
      }
    },
  };
}
