import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { ServerEnv } from '@/lib/env';

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isValidEventKey(provided: string | undefined, expected: string): boolean {
  return typeof provided === 'string' && safeEqual(provided, expected);
}

export function isWithinUploadWindow(now: Date, env: Pick<ServerEnv, 'cameraOpenAt' | 'uploadCloseAt'>): boolean {
  return now >= env.cameraOpenAt && now <= env.uploadCloseAt;
}
