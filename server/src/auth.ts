import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Db } from './db.ts';
import { HttpError } from './errors.ts';
import { normalisePhone } from './phone.ts';
import type { Sms } from './providers/sms.ts';

// Sign in with a 6 digit code sent by SMS. A session token then lives on the phone for 90 days.

export type Role = 'student' | 'kitchen' | 'rider' | 'admin';
export type AppName = 'student' | 'kitchen' | 'rider';
export type User = { id: string; phone: string; role: Role; name: string | null; kitchen_id: string | null; drop_point_id: string | null };

const CODE_TTL_MS = 10 * 60_000;
// Matches the "Resend code in 0:30" timer on the student app's verify screen.
const RESEND_MS = 30_000;
const MAX_ATTEMPTS = 5;
const SESSION_DAYS = 90;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// Each app only lets in its own kind of account. Anyone can join as a student; kitchens and riders
// are added by Chakula, so a stranger can't sign in to the Rider app and take runs.
const appRoles: Record<AppName, Role[]> = { student: ['student', 'admin'], kitchen: ['kitchen', 'admin'], rider: ['rider', 'admin'] };

export function createAuth(db: Db, sms: Sms, opts: { revealCodes: boolean }) {
  return {
    async requestCode(rawPhone: string, app: AppName) {
      const phone = normalisePhone(rawPhone);
      if (!phone) throw new HttpError(400, 'That doesn’t look like a Ugandan mobile number.');
      if (app !== 'student') {
        const [user] = await db.query<User>('select * from users where phone = $1', [phone]);
        if (!user || !appRoles[app].includes(user.role)) throw new HttpError(403, `This number isn’t set up for the ${app === 'kitchen' ? 'Kitchen' : 'Rider'} app yet.`);
      }
      const [last] = await db.query<{ sent_at: Date }>('select sent_at from login_codes where phone = $1', [phone]);
      if (last && Date.now() - new Date(last.sent_at).getTime() < RESEND_MS) throw new HttpError(429, 'A code is on its way. Try again in a few seconds.');
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const now = new Date();
      await db.query(
        `insert into login_codes (phone, code_hash, sent_at, expires_at, attempts) values ($1, $2, $3, $4, 0)
         on conflict (phone) do update set code_hash = excluded.code_hash, sent_at = excluded.sent_at, expires_at = excluded.expires_at, attempts = 0`,
        [phone, sha256(`${phone}:${code}`), now, new Date(now.getTime() + CODE_TTL_MS)],
      );
      await sms.send(phone, `${code} is your Chakula code. It works for 10 minutes. Never share it.`);
      // In dev there's no real SMS, so the code comes back to fill in for you.
      return { phone, ...(opts.revealCodes ? { devCode: code } : {}) };
    },

    async verifyCode(rawPhone: string, code: string, app: AppName) {
      const phone = normalisePhone(rawPhone);
      if (!phone) throw new HttpError(400, 'That doesn’t look like a Ugandan mobile number.');
      const [row] = await db.query<{ code_hash: string; expires_at: Date; attempts: number }>('select * from login_codes where phone = $1', [phone]);
      if (!row || new Date(row.expires_at).getTime() < Date.now()) throw new HttpError(400, 'That code has expired. Ask for a new one.');
      if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many tries. Ask for a new code.');
      const given = Buffer.from(sha256(`${phone}:${code.trim()}`));
      if (!timingSafeEqual(given, Buffer.from(row.code_hash))) {
        await db.query('update login_codes set attempts = attempts + 1 where phone = $1', [phone]);
        throw new HttpError(400, 'That code isn’t right.');
      }
      await db.query('delete from login_codes where phone = $1', [phone]);

      let [user] = await db.query<User>('select * from users where phone = $1', [phone]);
      if (!user) {
        if (app !== 'student') throw new HttpError(403, 'This number isn’t set up for this app.');
        [user] = await db.query<User>("insert into users (id, phone, role) values ($1, $2, 'student') returning *", [randomUUID(), phone]);
      }
      if (!user || !appRoles[app].includes(user.role)) throw new HttpError(403, 'This number isn’t set up for this app.');

      const token = randomBytes(32).toString('base64url');
      await db.query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [sha256(token), user.id, new Date(Date.now() + SESSION_DAYS * 86_400_000)]);
      return { token, user, isNew: !user.name };
    },

    async userForToken(token: string | undefined) {
      if (!token) return null;
      const [user] = await db.query<User>(
        'select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()',
        [sha256(token)],
      );
      return user ?? null;
    },

    async signOut(token: string) {
      await db.query('delete from sessions where token_hash = $1', [sha256(token)]);
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
