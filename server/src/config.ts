// Settings come from the environment, so keys never live in the repo. See .env.example.

function env(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

export type Config = {
  port: number;
  databaseUrl: string;
  dataDir: string;
  sms: 'log' | 'africastalking';
  payments: 'dev' | 'flutterwave';
  push: 'log' | 'expo';
  seed: boolean;
  africasTalking: { username: string; apiKey: string; senderId: string };
  flutterwave: { secretKey: string; webhookHash: string; email: string; api: string };
  // How long the pretend MoMo takes to "approve" a payment.
  devPayMs: number;
};

export function loadConfig(): Config {
  const sms = env('SMS_PROVIDER', 'log');
  const push = env('PUSH_PROVIDER', 'log');
  if (sms !== 'log' && sms !== 'africastalking') throw new Error(`Unknown SMS_PROVIDER ${sms}`);
  if (push !== 'log' && push !== 'expo') throw new Error(`Unknown PUSH_PROVIDER ${push}`);
  const payments = env('PAYMENT_PROVIDER', 'dev');
  if (payments !== 'dev' && payments !== 'flutterwave') throw new Error(`Unknown PAYMENT_PROVIDER ${payments}`);
  return {
    port: Number(env('PORT', '4000')),
    databaseUrl: env('DATABASE_URL'),
    dataDir: env('DATA_DIR', new URL('../.data', import.meta.url).pathname),
    sms,
    payments,
    push,
    seed: env('SEED', '1') === '1',
    africasTalking: { username: env('AT_USERNAME', 'sandbox'), apiKey: env('AT_API_KEY'), senderId: env('AT_SENDER_ID') },
    flutterwave: { secretKey: env('FLW_SECRET_KEY'), webhookHash: env('FLW_WEBHOOK_HASH'), email: env('FLW_EMAIL'), api: env('FLW_API', 'https://api.flutterwave.com') },
    devPayMs: Number(env('DEV_PAY_MS', '4000')),
  };
}
