import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { isAdminEmail, adminSecret } from '@/lib/onchainAdminAuth';

export function verifyAdminCredentials(email: string, password: string): boolean {
  const secret = adminSecret();
  if (!secret) return false;
  if (!isAdminEmail(email)) return false;

  const expected = Buffer.from(secret);
  const provided = Buffer.from(password);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function createAdminSessionTokenSync(email: string): string {
  const secret = adminSecret();
  if (!secret) throw new Error('ONCHAIN_ADMIN_SECRET is not configured');
  const normalized = email.trim().toLowerCase();
  const signature = createHmac('sha256', secret).update(normalized).digest('hex');
  return `${normalized}:${signature}`;
}
