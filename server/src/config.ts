// Settings come from the environment, so keys never live in the repo. See .env.example.

function env(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

export type Config = {
  port: number;
  databaseUrl: string;
  dataDir: string;
  sms: 'log' | 'africastalking';
  payments: 'dev';
  push: 'log' | 'expo';
  seed: boolean;
  africasTalking: { username: string; apiKey: string; senderId: string };
  // How long the pretend MoMo takes to "approve" a payment.
  devPayMs: number;
};

export function loadConfig(): Config {
  const sms = env('SMS_PROVIDER', 'log');
  const push = env('PUSH_PROVIDER', 'log');
  if (sms !== 'log' && sms !== 'africastalking') throw new Error(`Unknown SMS_PROVIDER ${sms}`);
  if (push !== 'log' && push !== 'expo') throw new Error(`Unknown PUSH_PROVIDER ${push}`);
  if (env('PAYMENT_PROVIDER', 'dev') !== 'dev') throw new Error('Only PAYMENT_PROVIDER=dev exists so far');
  return {
    port: Number(env('PORT', '4000')),
    databaseUrl: env('DATABASE_URL'),
    dataDir: env('DATA_DIR', new URL('../.data', import.meta.url).pathname),
    sms,
    payments: 'dev',
    push,
    seed: env('SEED', '1') === '1',
    africasTalking: { username: env('AT_USERNAME', 'sandbox'), apiKey: env('AT_API_KEY'), senderId: env('AT_SENDER_ID') },
    devPayMs: Number(env('DEV_PAY_MS', '4000')),
  };
}
