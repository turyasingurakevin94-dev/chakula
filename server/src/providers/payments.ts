import type { Config } from '../config.ts';

// A mobile money provider asks the payer's phone to approve a charge, then tells us the outcome
// later (a callback). Real ones (MTN MoMo, Airtel Money, or an aggregator covering both) plug in
// here once their accounts exist; until then "dev" pretends.

export type PayRequest = { paymentId: string; amount: number; phone: string; method: 'mtn' | 'airtel'; reference: string };
export type PayOutcome = { paymentId: string; status: 'succeeded' | 'failed'; providerRef?: string; failure?: string };

export type PaymentProvider = {
  name: string;
  // Starts the charge. The outcome arrives through onOutcome, never as the return value.
  start(req: PayRequest): Promise<{ providerRef: string }>;
};

export function createPayments(config: Config, onOutcome: (o: PayOutcome) => Promise<void>): PaymentProvider {
  // Pretend MoMo: approves after a few seconds, like a student typing their PIN. A number ending
  // in 000 declines, so the "payment didn't go through" path can be tried.
  return {
    name: 'dev',
    async start(req) {
      const providerRef = `dev-${req.paymentId.slice(0, 8)}`;
      const declined = req.phone.endsWith('000');
      setTimeout(() => {
        onOutcome({ paymentId: req.paymentId, providerRef, ...(declined ? { status: 'failed', failure: 'Declined on the phone' } : { status: 'succeeded' }) }).catch((e) =>
          console.error('[payments] settling failed', e),
        );
      }, config.devPayMs).unref();
      return { providerRef };
    },
  };
}
