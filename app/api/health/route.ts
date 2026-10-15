import { env } from '@/lib/env';
import { checkFolder, driveDeps } from '@/lib/drive/files';
import { safeEqual } from '@/lib/security/eventGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!safeEqual(token, env().healthCheckToken)) return Response.json({ ok: false }, { status: 401 });
  try {
    await checkFolder(driveDeps(), AbortSignal.timeout(8_000));
    return Response.json({ ok: true, checkedAt: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown error' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
