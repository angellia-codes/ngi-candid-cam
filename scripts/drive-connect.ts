import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { OAuth2Client } from 'google-auth-library';

// drive.file reaches only files this app creates, so a leaked token cannot read the rest of the account's Drive.
// It is also a non-sensitive scope: the consent screen can be published without Google verification.
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'NourishFest 2026 – Candid Cam Photos';

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env.local first (docs/DRIVE_SETUP.md step 4).');
  }

  const state = randomBytes(16).toString('hex');
  let redirectUri = '';
  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', redirectUri);
      if (url.pathname !== '/') {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      const got = url.searchParams.get('code');
      const ok = !error && got && url.searchParams.get('state') === state;
      res.writeHead(ok ? 200 : 400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(ok ? 'Connected. You can close this tab and go back to the terminal.' : 'Sign-in failed. Check the terminal.');
      server.close();
      if (ok) resolve(got);
      else reject(new Error(error ? `Google sign-in returned: ${error}` : 'Sign-in response did not match this request'));
    });
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const authUrl = new OAuth2Client({ clientId, clientSecret, redirectUri }).generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [SCOPE],
        state,
      });
      console.log('\nOpen this link in a browser on this computer and sign in with the Google account that will own the photos:\n');
      console.log(authUrl, '\n');
    });
  });

  const client = new OAuth2Client({ clientId, clientSecret, redirectUri });
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error('Google returned no refresh token. Run the command again.');
  if (!tokens.scope?.split(' ').includes(SCOPE)) throw new Error('Drive access was not granted. Tick the Drive box on the consent screen.');
  client.setCredentials(tokens);

  let folderId = process.env.DRIVE_FOLDER_ID?.trim();
  if (folderId) {
    console.log('Keeping the existing DRIVE_FOLDER_ID from .env.local.');
  } else {
    const res = await client.request<{ id: string }>({
      url: 'https://www.googleapis.com/drive/v3/files?fields=id',
      method: 'POST',
      data: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    });
    folderId = res.data.id;
    console.log(`Created the folder "${FOLDER_NAME}" in My Drive.`);
  }

  console.log('\nPut these in .env.local (and in Netlify). Treat the refresh token like a password.\n');
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`DRIVE_FOLDER_ID=${folderId}\n`);
  console.log('Then run: npm run verify:drive');
}

main().catch((e: unknown) => {
  console.error('Drive connect FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
