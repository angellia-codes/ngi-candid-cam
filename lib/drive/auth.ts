import 'server-only';
import { OAuth2Client } from 'google-auth-library';
import { env } from '@/lib/env';

let client: OAuth2Client | null = null;

/** Access token for the Google account that owns the Photos folder. google-auth-library caches and refreshes it. */
export async function getAccessToken(): Promise<string> {
  if (!client) {
    const e = env();
    client = new OAuth2Client({ clientId: e.googleClientId, clientSecret: e.googleClientSecret });
    // The refresh token was granted the drive.file scope by `npm run drive:connect`, so it reaches only
    // files this app created (the Photos folder and its photos), not the rest of the account's Drive.
    client.setCredentials({ refresh_token: e.googleRefreshToken });
  }
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Google returned no access token');
  return token;
}
