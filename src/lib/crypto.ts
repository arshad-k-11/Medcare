import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Dummy hash used when no user matches, so an unknown email costs the same wall-clock
 * time as a wrong password and cannot be distinguished by timing.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7Ub.aOtEHZaGkzZ8DWo.qWt3nYSXQKa';

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, hash);
}

/** Six-digit numeric OTP from a CSPRNG. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** OTPs and reset tokens are stored hashed, salted with the app secret. */
export function hashToken(value: string): string {
  return sha256(`${value}::${process.env.AUTH_SECRET ?? ''}`);
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * IP addresses are personal data under the DPDP Act; audit rows only need to correlate
 * requests, so we store a keyed hash rather than the address itself.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return sha256(`${ip}::${process.env.AUTH_SECRET ?? ''}`).slice(0, 32);
}
