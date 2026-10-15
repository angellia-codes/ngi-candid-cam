import { env } from '@/lib/env';
import { driveDeps } from '@/lib/drive/files';
import { handleUpload } from '@/lib/server/uploadHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleUpload(req, { env: env(), drive: driveDeps(), now: () => new Date() });
}
