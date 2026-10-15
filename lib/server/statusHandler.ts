import 'server-only';
import type { ServerEnv } from '@/lib/env';
import type { PublicStatus } from '@/lib/shared/status';

export function buildStatus(env: ServerEnv, now: Date): PublicStatus {
  return {
    cameraOpenAt: env.cameraOpenAt.toISOString(),
    cameraCloseAt: env.cameraCloseAt.toISOString(),
    uploadCloseAt: env.uploadCloseAt.toISOString(),
    shotsPerDevice: env.shotsPerDevice,
    consentVersion: env.consentVersion,
    now: now.toISOString(),
  };
}
