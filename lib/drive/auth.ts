import 'server-only';
import { JWT } from 'google-auth-library';
import { env } from '@/lib/env';

let client: JWT | null = null;

/** Access token for the service account. google-auth-library caches and refreshes it. */
export async function getAccessToken(): Promise<string> {
  const e = env();
  client ??= new JWT({
    email: e.googleSaEmail,
    key: e.googleSaPrivateKey,
    // Reach is limited by Shared Drive membership: the account belongs to one Shared Drive only.
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Google returned no access token');
  return token;
}
