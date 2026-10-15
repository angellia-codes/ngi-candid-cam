import { env } from '@/lib/env';
import { buildStatus } from '@/lib/server/statusHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(buildStatus(env(), new Date()), { headers: { 'cache-control': 'no-store' } });
}
