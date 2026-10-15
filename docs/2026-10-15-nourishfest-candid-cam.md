# NourishFest 2026 Digital Candid Cam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile web camera where ~250 NGI employees shoot framed retro photos at NourishFest 2026 (8 Dec 2026), with every confirmed photo saved to a private HR-owned Google Shared Drive.

**Architecture:** One Next.js page runs the whole experience as a client-side screen state machine, so the camera stream survives between shots. Photos are framed on a `<canvas>`, stored in the phone's IndexedDB, and uploaded one at a time by a retrying queue to a single server endpoint (`POST /api/upload`). That endpoint validates the request and writes to Google Drive with a service account; the browser never sees Drive.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · google-auth-library · Vitest + fake-indexeddb · @fontsource (Bungee, Oswald) · Netlify Free plan.

**Spec:** "NourishFest 2026 Digital Candid Cam — Design Spec" (Claude Docs). Frame reference: "NF'26 Candid Cam Frames" canvas, artboard "FINAL · Digicam Cream".

## Global Constraints

- Standalone web app. No NourishOS integration, no login, no names, no employee IDs.
- Hosting: Netlify Free plan. Function request body ≤ 6 MB, run time ≤ 10 s. At most 10 production deploys in December; test on preview deploys.
- Storage: Google service account writing to the HR-owned Shared Drive "NourishFest 2026 – Candid Cam". Every Drive call sets `supportsAllDrives=true`.
- Access: QR link carries `?k=<EVENT_KEY>`; key stored in cookie `nf26_key`, removed from the address bar, checked on every upload.
- Times (WITA, UTC+08:00): camera opens `2026-12-08T15:00:00+08:00`, camera locks `2026-12-08T23:00:00+08:00`, uploads accepted until `2026-12-09T12:00:00+08:00`.
- Shots: 15 per device, shown as "15 EXP". A shot is used on Confirm; retakes are free; a server rejection refunds the shot. Server backstop: 20 uploads per device ID.
- Output: one JPEG, 1320×1920, framed only, target 0.7–1.1 MB. Quality 0.82 → 0.76 → 0.70 while over 1.5 MB; hard limit 3 MB (`MAX_UPLOAD_BYTES=3000000`). No EXIF.
- Frame: cream card #EDE6D6, photo window 1200×1600 at (60,60), 28 px radius, 4 px gold #D4AF37 border; overlay brackets #F5F0E6; battery + "NF26" top-left; gold bolt + shot counter top-right; capture time bottom-left in #39FF14; "#MoveInUnity" bottom-right in gold; band: NOURISHFEST (Bungee, #0D0D0D), 2026 (Bungee, #FF1B6B), 08.12.2026 (Oswald, #0D0D0D).
- Filters chosen after capture: Original, NF Film, Flash Mono, Gold Hour, Neon Night. The same colour definition drives preview and saved file.
- Upload queue: one upload at a time, oldest first; retry waits 2, 5, 15, 30, then 60 s until the upload window closes. "Saved" only after the server confirms Drive has the file.
- Consent: bilingual notice, required checkbox, version `2026-10-v1` stamped on every Drive file. Photo use: internal HR archive only. Retention 12 months (delete by 8 Dec 2027).
- Browser targets: iOS Safari 16+, current Android Chrome. In-app browsers (Instagram, Facebook, TikTok, LINE) get an "Open in Safari or Chrome" screen.
- Dependencies: only `next`, `react`, `react-dom`, `tailwindcss`, `google-auth-library`, `server-only`, `@fontsource/bungee`, `@fontsource/oswald`; dev: `vitest`, `fake-indexeddb`, `tsx`.
- `noindex` everywhere. The browser never receives a Drive file ID, link or folder ID.

## Decisions this plan adds to the spec

| Decision | Why |
| --- | --- |
| The duplicate check runs **before** the device-cap check | Otherwise a retry of a device's 20th photo, already saved, would come back as `device_cap` and be marked "Not sent". |
| Each Drive file also stores `deviceId` (the random cookie ID) | The only way to count uploads per device without a database. It is random and not linked to a person. |
| Extra blocked reason `no_key` | Someone opening the bare site address without the QR key needs a clear "Scan the QR code" screen. |
| `GET /api/status` | Gives the phone the camera times, shot quota and consent version, and the server clock. |
| Fonts from `@fontsource` packages | Self-hosted fonts with stable family names (`Bungee`, `Oswald`) that the canvas can use. |
| `verify-drive` moves the test file to trash | A Content Manager may trash but not permanently delete in a Shared Drive. |
| Server accepts only JPEGs of exactly 1320×1920 | The app is the only client; anything else is not ours. |

## Milestones → tasks

| Milestone (spec) | Tasks | Gate |
| --- | --- | --- |
| M0 Drive spike + skeleton | 1, 2 | `npm run verify:drive` passes against the real Shared Drive |
| M1 Camera core | 6, 13 | Camera, flip, torch and blocked screens work on a real iPhone and Android |
| M2 Capture + frame | 7, 14 | Framed JPEG matches the canvas artboard; HR approves |
| M3 Upload API | 3, 4, 5 | All route tests pass |
| M4 Queue + consent | 8, 9, 10, 11, 12, 14 | Airplane-mode test ends Saved with no duplicate |
| M5 Polish + deploy | 15, 16 | Live on Netlify production; docs complete |
| Venue rehearsal | 16 (runbook) | 10 devices × 5 photos, zero lost, zero duplicates |

## File structure

```text
nourishfest-candid-cam/
├─ app/
│  ├─ layout.tsx                 fonts, viewport, noindex
│  ├─ globals.css                Tailwind v4 theme tokens
│  ├─ page.tsx                   renders <CandidCamApp/>
│  ├─ privacy/page.tsx           full privacy notice
│  ├─ dev/frame/page.tsx         dev-only frame preview (404 in production)
│  └─ api/
│     ├─ upload/route.ts         POST → lib/server/uploadHandler
│     ├─ status/route.ts         GET public event config
│     └─ health/route.ts         GET (token) Drive check
├─ components/
│  ├─ CandidCamApp.tsx           wires machine + queue + screens
│  ├─ PendingBanner.tsx
│  ├─ ui/Button.tsx
│  ├─ dev/FramePreview.tsx
│  └─ screens/  Welcome, Notice, Access, Blocked, Camera, Preview, Roll
├─ lib/
│  ├─ env.ts                     typed server config, fails loudly   [server only]
│  ├─ shared/  time.ts, cookies.ts, status.ts   (client + server)
│  ├─ security/ eventGuard.ts, validateImage.ts [server only]
│  ├─ drive/   auth.ts, files.ts                [server only]
│  ├─ server/  uploadHandler.ts, statusHandler.ts [server only]
│  ├─ camera/  crop.ts, support.ts, capture.ts, useCamera.ts
│  ├─ image/   filters.ts, frameLayout.ts, compose.ts, encode.ts, fonts.ts
│  ├─ queue/   policy.ts, store.ts, worker.ts, useQueue.ts
│  ├─ upload/  client.ts
│  ├─ client/  identity.ts, consent.ts, save.ts, useNow.ts
│  ├─ app/     machine.ts, preflight.ts
│  └─ copy/    notice.ts
├─ public/sw.js                  app-shell cache
├─ scripts/verify-drive.ts
├─ test/     empty.ts, fixtures.ts
├─ docs/     SETUP.md, DRIVE_SETUP.md, DEPLOY.md, EVENT_DAY_RUNBOOK.md
├─ .env.example
├─ next.config.ts
└─ vitest.config.ts
```

Tests sit next to the code they test (`lib/**/x.test.ts`).

---

### Task 1: Project skeleton, test tooling and server config

**Files:**
- Create: project via `create-next-app`, `vitest.config.ts`, `test/empty.ts`, `test/fixtures.ts`, `lib/env.ts`, `lib/env.test.ts`, `.env.example`, `next.config.ts`
- Modify: `package.json` (scripts), `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.gitignore`

**Interfaces:**
- Produces: `type ServerEnv`, `parseEnv(src): ServerEnv`, `env(): ServerEnv` from `@/lib/env`; `testEnv(overrides?)` and `fakeJpeg(width?, height?, extra?)` from `@/test/fixtures`.

- [ ] **Step 1: Create the app and install dependencies**

```bash
npx create-next-app@15 nourishfest-candid-cam --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
cd nourishfest-candid-cam
npm i google-auth-library@10 server-only @fontsource/bungee@5 @fontsource/oswald@5
npm i -D vitest@3 fake-indexeddb@6 tsx@4
mkdir -p docs/superpowers/plans && cp ../2026-10-15-nourishfest-candid-cam.md docs/superpowers/plans/
echo ".netlify" >> .gitignore
```

- [ ] **Step 2: Add scripts to `package.json`**

Merge into `"scripts"`:

```json
{
  "dev": "next dev",
  "dev:https": "next dev --experimental-https",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "verify:drive": "tsx --conditions=react-server --env-file=.env.local scripts/verify-drive.ts"
}
```

- [ ] **Step 3: Configure Vitest**

`vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // `server-only` throws outside React Server Components; tests run plain Node.
      'server-only': path.resolve(__dirname, 'test/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
```

`test/empty.ts`:

```ts
export {};
```

`test/fixtures.ts`:

```ts
import type { ServerEnv } from '@/lib/env';

export function testEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    googleSaEmail: 'candid-cam@ngi-nf26.iam.gserviceaccount.com',
    googleSaPrivateKey: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n',
    driveSharedDriveId: '0ABC',
    driveFolderId: '1XYZ',
    eventKey: 'k'.repeat(24),
    cameraOpenAt: new Date('2026-12-08T15:00:00+08:00'),
    cameraCloseAt: new Date('2026-12-08T23:00:00+08:00'),
    uploadCloseAt: new Date('2026-12-09T12:00:00+08:00'),
    shotsPerDevice: 15,
    deviceUploadCap: 20,
    maxUploadBytes: 3_000_000,
    consentVersion: '2026-10-v1',
    healthCheckToken: 'h'.repeat(24),
    ...overrides,
  };
}

/** Minimal JPEG: SOI, APP0, SOF0 with the given size, optional padding, EOI. */
export function fakeJpeg(width = 1320, height = 1920, extra = 0): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof0 = [
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0, ...new Array<number>(extra).fill(0), 0xff, 0xd9]);
}
```

- [ ] **Step 4: Write the failing env test**

`lib/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

const valid: Record<string, string | undefined> = {
  GOOGLE_SA_EMAIL: 'candid-cam@ngi-nf26.iam.gserviceaccount.com',
  GOOGLE_SA_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
  DRIVE_SHARED_DRIVE_ID: '0ABC',
  DRIVE_FOLDER_ID: '1XYZ',
  EVENT_KEY: 'k'.repeat(24),
  CAMERA_OPEN_AT: '2026-12-08T15:00:00+08:00',
  CAMERA_CLOSE_AT: '2026-12-08T23:00:00+08:00',
  UPLOAD_CLOSE_AT: '2026-12-09T12:00:00+08:00',
  SHOTS_PER_DEVICE: '15',
  DEVICE_UPLOAD_CAP: '20',
  MAX_UPLOAD_BYTES: '3000000',
  CONSENT_VERSION: '2026-10-v1',
  HEALTH_CHECK_TOKEN: 'h'.repeat(24),
};

describe('parseEnv', () => {
  it('parses a complete environment', () => {
    const e = parseEnv(valid);
    expect(e.shotsPerDevice).toBe(15);
    expect(e.deviceUploadCap).toBe(20);
    expect(e.cameraOpenAt.toISOString()).toBe('2026-12-08T07:00:00.000Z');
    expect(e.googleSaPrivateKey).toContain('\nabc\n');
  });

  it('names every missing variable', () => {
    expect(() => parseEnv({ ...valid, EVENT_KEY: '', DRIVE_FOLDER_ID: undefined })).toThrow(
      'Missing environment variables: DRIVE_FOLDER_ID, EVENT_KEY',
    );
  });

  it('rejects a malformed date', () => {
    expect(() => parseEnv({ ...valid, CAMERA_OPEN_AT: '8 Dec' })).toThrow('CAMERA_OPEN_AT is not a valid ISO date-time');
  });

  it('rejects a non-integer number', () => {
    expect(() => parseEnv({ ...valid, SHOTS_PER_DEVICE: '15.5' })).toThrow('SHOTS_PER_DEVICE must be a positive integer');
  });

  it('rejects times in the wrong order', () => {
    expect(() => parseEnv({ ...valid, CAMERA_CLOSE_AT: '2026-12-09T13:00:00+08:00' })).toThrow(
      'Expected CAMERA_OPEN_AT < CAMERA_CLOSE_AT <= UPLOAD_CLOSE_AT',
    );
  });

  it('rejects short secrets', () => {
    expect(() => parseEnv({ ...valid, EVENT_KEY: 'short' })).toThrow('EVENT_KEY must be at least 16 characters');
  });
});
```

- [ ] **Step 5: Run it to see it fail**

Run: `npx vitest run lib/env.test.ts`
Expected: FAIL, cannot resolve `@/lib/env`.

- [ ] **Step 6: Implement `lib/env.ts`**

```ts
import 'server-only';

export type ServerEnv = {
  googleSaEmail: string;
  googleSaPrivateKey: string;
  driveSharedDriveId: string;
  driveFolderId: string;
  eventKey: string;
  cameraOpenAt: Date;
  cameraCloseAt: Date;
  uploadCloseAt: Date;
  shotsPerDevice: number;
  deviceUploadCap: number;
  maxUploadBytes: number;
  consentVersion: string;
  healthCheckToken: string;
};

const REQUIRED = [
  'GOOGLE_SA_EMAIL',
  'GOOGLE_SA_PRIVATE_KEY',
  'DRIVE_SHARED_DRIVE_ID',
  'DRIVE_FOLDER_ID',
  'EVENT_KEY',
  'CAMERA_OPEN_AT',
  'CAMERA_CLOSE_AT',
  'UPLOAD_CLOSE_AT',
  'SHOTS_PER_DEVICE',
  'DEVICE_UPLOAD_CAP',
  'MAX_UPLOAD_BYTES',
  'CONSENT_VERSION',
  'HEALTH_CHECK_TOKEN',
] as const;

type Source = Record<string, string | undefined>;

export function parseEnv(src: Source): ServerEnv {
  const missing = REQUIRED.filter((k) => !src[k]?.trim());
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

  const str = (k: (typeof REQUIRED)[number]) => src[k]!.trim();
  const date = (k: (typeof REQUIRED)[number]) => {
    const d = new Date(str(k));
    if (Number.isNaN(d.getTime())) throw new Error(`${k} is not a valid ISO date-time`);
    return d;
  };
  const int = (k: (typeof REQUIRED)[number]) => {
    const n = Number(str(k));
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${k} must be a positive integer`);
    return n;
  };
  const secret = (k: (typeof REQUIRED)[number]) => {
    const v = str(k);
    if (v.length < 16) throw new Error(`${k} must be at least 16 characters`);
    return v;
  };

  const parsed: ServerEnv = {
    googleSaEmail: str('GOOGLE_SA_EMAIL'),
    // Netlify and .env files store the key on one line with literal "\n".
    googleSaPrivateKey: str('GOOGLE_SA_PRIVATE_KEY').replace(/\\n/g, '\n'),
    driveSharedDriveId: str('DRIVE_SHARED_DRIVE_ID'),
    driveFolderId: str('DRIVE_FOLDER_ID'),
    eventKey: secret('EVENT_KEY'),
    cameraOpenAt: date('CAMERA_OPEN_AT'),
    cameraCloseAt: date('CAMERA_CLOSE_AT'),
    uploadCloseAt: date('UPLOAD_CLOSE_AT'),
    shotsPerDevice: int('SHOTS_PER_DEVICE'),
    deviceUploadCap: int('DEVICE_UPLOAD_CAP'),
    maxUploadBytes: int('MAX_UPLOAD_BYTES'),
    consentVersion: str('CONSENT_VERSION'),
    healthCheckToken: secret('HEALTH_CHECK_TOKEN'),
  };

  if (!(parsed.cameraOpenAt < parsed.cameraCloseAt && parsed.cameraCloseAt <= parsed.uploadCloseAt)) {
    throw new Error('Expected CAMERA_OPEN_AT < CAMERA_CLOSE_AT <= UPLOAD_CLOSE_AT');
  }
  return parsed;
}

let cached: ServerEnv | null = null;

/** Parsed once per server instance; throws a readable error if config is wrong. */
export function env(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
```

- [ ] **Step 7: Run the test to see it pass**

Run: `npx vitest run lib/env.test.ts`
Expected: 6 passed.

- [ ] **Step 8: Write `.env.example`**

```bash
# Google service account (from the JSON key file). Paste the key on ONE line, keeping the \n sequences.
GOOGLE_SA_EMAIL=candid-cam@ngi-nf26.iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Shared Drive "NourishFest 2026 – Candid Cam" and its Photos folder
DRIVE_SHARED_DRIVE_ID=0A...
DRIVE_FOLDER_ID=1x...

# Random 24+ character strings. Generate with: node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
EVENT_KEY=
HEALTH_CHECK_TOKEN=

# Event times, WITA (UTC+08:00)
CAMERA_OPEN_AT=2026-12-08T15:00:00+08:00
CAMERA_CLOSE_AT=2026-12-08T23:00:00+08:00
UPLOAD_CLOSE_AT=2026-12-09T12:00:00+08:00

SHOTS_PER_DEVICE=15
DEVICE_UPLOAD_CAP=20
MAX_UPLOAD_BYTES=3000000
CONSENT_VERSION=2026-10-v1
```

- [ ] **Step 9: Replace `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 10: Replace `app/globals.css`, `app/layout.tsx`, `app/page.tsx`**

`app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-ink: #0D0D0D;
  --color-body: #17130F;
  --color-cream: #EDE6D6;
  --color-paper: #F5F0E6;
  --color-gold: #D4AF37;
  --color-pink: #FF1B6B;
  --color-green: #39FF14;
  --color-muted: #A39A8B;
  --font-display: "Bungee", system-ui, sans-serif;
  --font-label: "Oswald", "Arial Narrow", sans-serif;
}

html,
body {
  min-height: 100%;
  background: var(--color-ink);
  color: var(--color-cream);
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

`app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next';
import '@fontsource/bungee/400.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: "NF'26 Candid Cam",
  description: 'NourishFest 2026 digital candid camera',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0D0D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx` (temporary; Task 14 replaces it):

```tsx
export default function Page() {
  return <main className="p-6 font-display text-gold">NF&apos;26 Candid Cam</main>;
}
```

- [ ] **Step 11: Verify and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: no type errors, 6 tests pass, build succeeds.

```bash
git add -A
git commit -m "chore: scaffold Next.js app, Vitest and typed server config"
```

---

### Task 2: Google Drive client and live Drive check (M0 gate)

**Files:**
- Create: `lib/drive/auth.ts`, `lib/drive/files.ts`, `lib/drive/files.test.ts`, `scripts/verify-drive.ts`

**Interfaces:**
- Consumes: `env()` (Task 1).
- Produces (`@/lib/drive/files`):
  - `type DriveDeps = { fetch: typeof fetch; getToken: () => Promise<string>; sharedDriveId: string; folderId: string }`
  - `class DriveError extends Error { code: 'auth_failed' | 'timeout' | 'network' | 'http_error' }`
  - `driveDeps(): DriveDeps`
  - `listDevicePhotos(deps, deviceId: string, signal: AbortSignal): Promise<string[]>` → photo IDs already stored for that device
  - `createPhoto(deps, { name, bytes: Uint8Array, appProperties: Record<string,string> }, signal): Promise<{ id: string }>`
  - `trashFile(deps, id: string, signal): Promise<void>`
  - `checkFolder(deps, signal): Promise<void>`

- [ ] **Step 1: Write the failing tests**

`lib/drive/files.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DriveError, checkFolder, createPhoto, listDevicePhotos, type DriveDeps } from '@/lib/drive/files';

type Call = { url: string; init?: RequestInit };

function deps(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): { d: DriveDeps; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return { d: { fetch: fetchFn, getToken: async () => 'tok', sharedDriveId: '0ABC', folderId: '1XYZ' }, calls };
}

const signal = () => AbortSignal.timeout(5000);

describe('listDevicePhotos', () => {
  it('queries the Shared Drive by device ID and returns photo IDs', async () => {
    const { d, calls } = deps(() =>
      Response.json({ files: [{ appProperties: { photoId: 'p1' } }, { appProperties: { photoId: 'p2' } }, {}] }),
    );
    const ids = await listDevicePhotos(d, 'dev-1', signal());
    expect(ids).toEqual(['p1', 'p2']);
    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get('supportsAllDrives')).toBe('true');
    expect(url.searchParams.get('driveId')).toBe('0ABC');
    expect(url.searchParams.get('q')).toContain("value='dev-1'");
    expect(url.searchParams.get('q')).toContain("'1XYZ' in parents");
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('follows page tokens', async () => {
    let page = 0;
    const { d } = deps(() => {
      page += 1;
      return page === 1
        ? Response.json({ nextPageToken: 'n2', files: [{ appProperties: { photoId: 'a' } }] })
        : Response.json({ files: [{ appProperties: { photoId: 'b' } }] });
    });
    expect(await listDevicePhotos(d, 'dev', signal())).toEqual(['a', 'b']);
  });

  it('escapes quotes in the device ID', async () => {
    const { d, calls } = deps(() => Response.json({ files: [] }));
    await listDevicePhotos(d, "x'y", signal());
    expect(new URL(calls[0]!.url).searchParams.get('q')).toContain("value='x\\'y'");
  });
});

describe('createPhoto', () => {
  it('uploads multipart with metadata into the folder', async () => {
    const { d, calls } = deps(() => Response.json({ id: 'file-9' }));
    const out = await createPhoto(
      d,
      { name: 'NF26_x.jpg', bytes: new Uint8Array([1, 2, 3]), appProperties: { photoId: 'p1' } },
      signal(),
    );
    expect(out).toEqual({ id: 'file-9' });
    const call = calls[0]!;
    expect(call.url).toContain('/upload/drive/v3/files?');
    expect(call.url).toContain('uploadType=multipart');
    expect(call.url).toContain('supportsAllDrives=true');
    const body = await (call.init!.body as Blob).text();
    expect(body).toContain('"name":"NF26_x.jpg"');
    expect(body).toContain('"parents":["1XYZ"]');
    expect(body).toContain('"photoId":"p1"');
  });
});

describe('errors', () => {
  it('maps a timeout to DriveError timeout', async () => {
    const { d } = deps(() => {
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    });
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toMatchObject({ code: 'timeout' });
  });

  it('maps a non-2xx response to http_error', async () => {
    const { d } = deps(() => new Response('{"error":"forbidden"}', { status: 403 }));
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toMatchObject({ code: 'http_error' });
  });

  it('maps a token failure to auth_failed', async () => {
    const { d } = deps(() => Response.json({}));
    d.getToken = async () => {
      throw new Error('invalid_grant');
    };
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toBeInstanceOf(DriveError);
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toMatchObject({ code: 'auth_failed' });
  });
});

describe('checkFolder', () => {
  it('passes when the folder is in the Shared Drive and writable', async () => {
    const { d } = deps(() => Response.json({ id: '1XYZ', driveId: '0ABC', capabilities: { canAddChildren: true } }));
    await expect(checkFolder(d, signal())).resolves.toBeUndefined();
  });

  it('fails when the folder is in another drive', async () => {
    const { d } = deps(() => Response.json({ id: '1XYZ', driveId: 'OTHER', capabilities: { canAddChildren: true } }));
    await expect(checkFolder(d, signal())).rejects.toThrow('Folder is not in the configured Shared Drive');
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/drive/files.test.ts`
Expected: FAIL, cannot resolve `@/lib/drive/files`.

- [ ] **Step 3: Implement `lib/drive/auth.ts`**

```ts
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
```

- [ ] **Step 4: Implement `lib/drive/files.ts`**

```ts
import 'server-only';
import { env } from '@/lib/env';
import { getAccessToken } from '@/lib/drive/auth';

export type DriveDeps = {
  fetch: typeof fetch;
  getToken: () => Promise<string>;
  sharedDriveId: string;
  folderId: string;
};

export type DriveErrorCode = 'auth_failed' | 'timeout' | 'network' | 'http_error';

export class DriveError extends Error {
  constructor(
    readonly code: DriveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DriveError';
  }
}

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export function driveDeps(): DriveDeps {
  const e = env();
  return {
    fetch: globalThis.fetch.bind(globalThis),
    getToken: getAccessToken,
    sharedDriveId: e.driveSharedDriveId,
    folderId: e.driveFolderId,
  };
}

function escapeQueryValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function call(deps: DriveDeps, url: string, init: RequestInit, signal: AbortSignal): Promise<unknown> {
  let token: string;
  try {
    token = await deps.getToken();
  } catch (e) {
    throw new DriveError('auth_failed', e instanceof Error ? e.message : 'Token request failed');
  }

  let res: Response;
  try {
    res = await deps.fetch(url, {
      ...init,
      signal,
      headers: { ...(init.headers as Record<string, string> | undefined), authorization: `Bearer ${token}` },
    });
  } catch (e) {
    const name = (e as Error | undefined)?.name;
    const code: DriveErrorCode = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network';
    throw new DriveError(code, (e as Error | undefined)?.message ?? 'fetch failed');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DriveError('http_error', `Drive ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function listDevicePhotos(deps: DriveDeps, deviceId: string, signal: AbortSignal): Promise<string[]> {
  const q =
    `'${escapeQueryValue(deps.folderId)}' in parents and trashed = false and ` +
    `appProperties has { key='deviceId' and value='${escapeQueryValue(deviceId)}' }`;
  const ids: string[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      q,
      corpora: 'drive',
      driveId: deps.sharedDriveId,
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      pageSize: '100',
      fields: 'nextPageToken,files(id,appProperties)',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const data = (await call(deps, `${API}?${params}`, { method: 'GET' }, signal)) as {
      nextPageToken?: string;
      files?: { appProperties?: Record<string, string> }[];
    };
    for (const f of data.files ?? []) {
      const id = f.appProperties?.photoId;
      if (id) ids.push(id);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

export async function createPhoto(
  deps: DriveDeps,
  input: { name: string; bytes: Uint8Array; appProperties: Record<string, string> },
  signal: AbortSignal,
): Promise<{ id: string }> {
  const boundary = `nf26-${crypto.randomUUID()}`;
  const meta = JSON.stringify({
    name: input.name,
    parents: [deps.folderId],
    mimeType: 'image/jpeg',
    appProperties: input.appProperties,
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
    new Uint8Array(input.bytes),
    `\r\n--${boundary}--\r\n`,
  ]);
  const params = new URLSearchParams({ uploadType: 'multipart', supportsAllDrives: 'true', fields: 'id' });
  const data = (await call(
    deps,
    `${UPLOAD}?${params}`,
    { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${boundary}` }, body },
    signal,
  )) as { id?: string } | null;
  if (!data?.id) throw new DriveError('http_error', 'Drive did not return a file ID');
  return { id: data.id };
}

export async function trashFile(deps: DriveDeps, id: string, signal: AbortSignal): Promise<void> {
  await call(
    deps,
    `${API}/${encodeURIComponent(id)}?supportsAllDrives=true`,
    { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
    signal,
  );
}

export async function checkFolder(deps: DriveDeps, signal: AbortSignal): Promise<void> {
  const params = new URLSearchParams({ supportsAllDrives: 'true', fields: 'id,driveId,capabilities(canAddChildren)' });
  const data = (await call(deps, `${API}/${encodeURIComponent(deps.folderId)}?${params}`, { method: 'GET' }, signal)) as {
    driveId?: string;
    capabilities?: { canAddChildren?: boolean };
  };
  if (data.driveId !== deps.sharedDriveId) throw new DriveError('http_error', 'Folder is not in the configured Shared Drive');
  if (!data.capabilities?.canAddChildren) {
    throw new DriveError('http_error', 'Service account cannot add files to the folder (needs Content manager)');
  }
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run lib/drive/files.test.ts`
Expected: 9 passed.

- [ ] **Step 6: Write `scripts/verify-drive.ts`**

```ts
import { checkFolder, createPhoto, driveDeps, listDevicePhotos, trashFile } from '../lib/drive/files';

async function main() {
  const deps = driveDeps();
  const signal = () => AbortSignal.timeout(15_000);
  const photoId = crypto.randomUUID();
  const deviceId = crypto.randomUUID();

  console.log('1/4 Checking folder access…');
  await checkFolder(deps, signal());

  console.log('2/4 Uploading a test file…');
  const { id } = await createPhoto(
    deps,
    {
      name: `VERIFY_${photoId}.jpg`,
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      appProperties: { app: 'nf26-candid-cam-verify', photoId, deviceId },
    },
    signal(),
  );

  console.log('3/4 Finding it by device ID…');
  const found = await listDevicePhotos(deps, deviceId, signal());
  if (!found.includes(photoId)) throw new Error('Uploaded file was not found by the device ID search');

  console.log('4/4 Moving the test file to trash…');
  await trashFile(deps, id, signal());

  console.log('Drive OK: upload, search and trash all work.');
}

main().catch((e: unknown) => {
  console.error('Drive check FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
```

- [ ] **Step 7: Run the live check (needs the manual Google setup in `docs/DRIVE_SETUP.md`, written in Task 16; follow the checklist in the spec's "Manual setup checklist" now)**

Create `.env.local` from `.env.example` with real values, then:

Run: `npm run verify:drive`
Expected: four progress lines, then `Drive OK: upload, search and trash all work.`
If it fails with `storageQuotaExceeded`, the folder is not inside the Shared Drive. If it fails with `Folder is not in the configured Shared Drive`, `DRIVE_SHARED_DRIVE_ID` is wrong. If `canAddChildren` fails, the service account is not a Content manager.

- [ ] **Step 8: Commit**

```bash
git add lib/drive scripts/verify-drive.ts
git commit -m "feat: Google Drive client for Shared Drive uploads and live verify script"
```

---

### Task 3: Shared formatting, cookies and status types

**Files:**
- Create: `lib/shared/time.ts`, `lib/shared/time.test.ts`, `lib/shared/cookies.ts`, `lib/shared/cookies.test.ts`, `lib/shared/status.ts`

**Interfaces:**
- Produces (`@/lib/shared/time`): `formatStamp(d: Date): string` → `'26 12 08 21:04`; `formatFileName(d: Date, photoId: string): string` → `NF26_20261208-193412_1b9d6bcd.jpg`; `formatShot(n: number, total: number): string` → `07/15`; `formatWitaShort(d: Date): string` → `8 Dec, 15:00`. All times in WITA (UTC+08:00) whatever the phone's time zone.
- Produces (`@/lib/shared/cookies`): `COOKIE_KEY = 'nf26_key'`, `COOKIE_DEVICE = 'nf26_device'`, `parseCookieString(header): Record<string,string>`, `serializeCookie(name, value, maxAgeSeconds, secure): string`.
- Produces (`@/lib/shared/status`): `type PublicStatus = { cameraOpenAt: string; cameraCloseAt: string; uploadCloseAt: string; shotsPerDevice: number; consentVersion: string; now: string }`.

- [ ] **Step 1: Write the failing tests**

`lib/shared/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatFileName, formatShot, formatStamp, formatWitaShort } from '@/lib/shared/time';

// 11:34:12 UTC is 19:34:12 WITA
const d = new Date('2026-12-08T11:34:12Z');

describe('WITA formatting', () => {
  it('formats the film date stamp', () => {
    expect(formatStamp(d)).toBe("'26 12 08 19:34");
  });

  it('rolls over midnight in WITA', () => {
    expect(formatStamp(new Date('2026-12-08T16:05:00Z'))).toBe("'26 12 09 00:05");
  });

  it('builds the Drive and download file name', () => {
    expect(formatFileName(d, '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')).toBe('NF26_20261208-193412_1b9d6bcd.jpg');
  });

  it('pads the shot counter', () => {
    expect(formatShot(7, 15)).toBe('07/15');
    expect(formatShot(15, 15)).toBe('15/15');
  });

  it('formats a short day and time', () => {
    expect(formatWitaShort(new Date('2026-12-08T07:00:00Z'))).toBe('8 Dec, 15:00');
  });
});
```

`lib/shared/cookies.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseCookieString, serializeCookie } from '@/lib/shared/cookies';

describe('cookies', () => {
  it('parses a cookie header', () => {
    expect(parseCookieString('nf26_key=abc; nf26_device=d-1;  other=x%20y')).toEqual({
      nf26_key: 'abc',
      nf26_device: 'd-1',
      other: 'x y',
    });
  });

  it('handles empty and malformed input', () => {
    expect(parseCookieString(null)).toEqual({});
    expect(parseCookieString('novalue; =x; a=%E0%A4%A')).toEqual({ a: '%E0%A4%A' });
  });

  it('serializes with safe defaults', () => {
    expect(serializeCookie('nf26_key', 'a b', 60, true)).toBe('nf26_key=a%20b; Max-Age=60; Path=/; SameSite=Lax; Secure');
    expect(serializeCookie('x', 'y', 1, false)).toBe('x=y; Max-Age=1; Path=/; SameSite=Lax');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/shared`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/shared/time.ts`:

```ts
const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const p2 = (n: number) => String(n).padStart(2, '0');

function wita(d: Date) {
  const t = new Date(d.getTime() + WITA_OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    mo: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    h: t.getUTCHours(),
    mi: t.getUTCMinutes(),
    s: t.getUTCSeconds(),
  };
}

export function formatStamp(date: Date): string {
  const w = wita(date);
  return `'${p2(w.y % 100)} ${p2(w.mo)} ${p2(w.d)} ${p2(w.h)}:${p2(w.mi)}`;
}

export function formatFileName(date: Date, photoId: string): string {
  const w = wita(date);
  return `NF26_${w.y}${p2(w.mo)}${p2(w.d)}-${p2(w.h)}${p2(w.mi)}${p2(w.s)}_${photoId.slice(0, 8)}.jpg`;
}

export function formatShot(n: number, total: number): string {
  return `${p2(n)}/${p2(total)}`;
}

export function formatWitaShort(date: Date): string {
  const w = wita(date);
  return `${w.d} ${MONTHS[w.mo - 1]}, ${p2(w.h)}:${p2(w.mi)}`;
}
```

`lib/shared/cookies.ts`:

```ts
export const COOKIE_KEY = 'nf26_key';
export const COOKIE_DEVICE = 'nf26_device';

export function parseCookieString(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    const raw = part.slice(i + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

export function serializeCookie(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}
```

`lib/shared/status.ts`:

```ts
/** Public event settings the phone needs. Contains no secrets. */
export type PublicStatus = {
  cameraOpenAt: string;
  cameraCloseAt: string;
  uploadCloseAt: string;
  shotsPerDevice: number;
  consentVersion: string;
  now: string;
};
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/shared`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/shared
git commit -m "feat: WITA formatting, cookie helpers and public status type"
```

---

### Task 4: Request guards and JPEG validation

**Files:**
- Create: `lib/security/eventGuard.ts`, `lib/security/eventGuard.test.ts`, `lib/security/validateImage.ts`, `lib/security/validateImage.test.ts`

**Interfaces:**
- Consumes: `ServerEnv` (Task 1), `fakeJpeg`, `testEnv` (Task 1).
- Produces: `safeEqual(a, b): boolean`, `isValidEventKey(provided: string | undefined, expected: string): boolean`, `isWithinUploadWindow(now: Date, env: Pick<ServerEnv,'cameraOpenAt'|'uploadCloseAt'>): boolean`; `inspectJpeg(bytes: Uint8Array): { width: number; height: number } | null`, `EXPECTED_WIDTH = 1320`, `EXPECTED_HEIGHT = 1920`.

- [ ] **Step 1: Write the failing tests**

`lib/security/eventGuard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isValidEventKey, isWithinUploadWindow, safeEqual } from '@/lib/security/eventGuard';
import { testEnv } from '@/test/fixtures';

describe('event key', () => {
  it('accepts the exact key only', () => {
    expect(isValidEventKey('k'.repeat(24), 'k'.repeat(24))).toBe(true);
    expect(isValidEventKey('k'.repeat(23), 'k'.repeat(24))).toBe(false);
    expect(isValidEventKey(undefined, 'k'.repeat(24))).toBe(false);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
});

describe('upload window', () => {
  const e = testEnv();
  it('is closed before the camera opens', () => {
    expect(isWithinUploadWindow(new Date('2026-12-08T06:59:59Z'), e)).toBe(false);
  });
  it('is open during the event and the morning after', () => {
    expect(isWithinUploadWindow(new Date('2026-12-08T07:00:00Z'), e)).toBe(true);
    expect(isWithinUploadWindow(new Date('2026-12-09T03:59:59Z'), e)).toBe(true);
  });
  it('is closed after 9 Dec 12:00 WITA', () => {
    expect(isWithinUploadWindow(new Date('2026-12-09T04:00:01Z'), e)).toBe(false);
  });
});
```

`lib/security/validateImage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { inspectJpeg } from '@/lib/security/validateImage';
import { fakeJpeg } from '@/test/fixtures';

describe('inspectJpeg', () => {
  it('reads the size from the SOF marker', () => {
    expect(inspectJpeg(fakeJpeg(1320, 1920))).toEqual({ width: 1320, height: 1920 });
    expect(inspectJpeg(fakeJpeg(640, 480, 100))).toEqual({ width: 640, height: 480 });
  });

  it('rejects files that are not JPEG', () => {
    expect(inspectJpeg(new TextEncoder().encode('<svg></svg>'))).toBeNull();
    expect(inspectJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it('rejects a JPEG with no frame header', () => {
    expect(inspectJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/security`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/security/eventGuard.ts`:

```ts
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
```

`lib/security/validateImage.ts`:

```ts
import 'server-only';

export const EXPECTED_WIDTH = 1320;
export const EXPECTED_HEIGHT = 1920;

/** Returns the image size if the bytes are a JPEG with a frame header, else null. */
export function inspectJpeg(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = b[i + 1]!;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end or scan data before any frame header
    const length = (b[i + 2]! << 8) | b[i + 3]!;
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) {
      const height = (b[i + 5]! << 8) | b[i + 6]!;
      const width = (b[i + 7]! << 8) | b[i + 8]!;
      return { width, height };
    }
    i += 2 + length;
  }
  return null;
}
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/security`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/security
git commit -m "feat: event key, upload window and JPEG checks"
```

---

### Task 5: Upload, status and health endpoints (M3 gate)

**Files:**
- Create: `lib/server/uploadHandler.ts`, `lib/server/uploadHandler.test.ts`, `lib/server/statusHandler.ts`, `lib/server/statusHandler.test.ts`, `app/api/upload/route.ts`, `app/api/status/route.ts`, `app/api/health/route.ts`

**Interfaces:**
- Consumes: `env()`, `ServerEnv` (1); `DriveDeps`, `DriveError`, `driveDeps`, `listDevicePhotos`, `createPhoto`, `checkFolder` (2); `formatFileName`, `parseCookieString`, `COOKIE_KEY`, `COOKIE_DEVICE`, `PublicStatus` (3); `isValidEventKey`, `isWithinUploadWindow`, `safeEqual`, `inspectJpeg`, `EXPECTED_WIDTH`, `EXPECTED_HEIGHT` (4).
- Produces: `handleUpload(req: Request, deps: UploadDeps): Promise<Response>`; `buildStatus(env, now): PublicStatus`.
- HTTP contract the phone relies on (Task 9): `POST /api/upload`, multipart fields `image` (JPEG), `photoId` (UUID), `capturedAt` (ISO), `consentVersion`; cookies `nf26_key`, `nf26_device`.

| Order | Check | Response |
| --- | --- | --- |
| 1 | Event key cookie | 401 `{ ok:false, code:'bad_key' }` |
| 2 | Upload window | 403 `window_closed` |
| 3 | Declared body too big | 413 `too_large` |
| 4 | Consent version | 400 `consent_required` |
| 5 | Fields missing or malformed | 400 `bad_request` |
| 6 | Image over `MAX_UPLOAD_BYTES` | 413 `too_large` |
| 7 | Not a 1320×1920 JPEG | 415 `bad_type` |
| 8 | Device cookie missing | 400 `no_device` |
| 9 | Photo ID already stored for this device | 200 `{ ok:true, photoId, duplicate:true }` |
| 10 | Device already has `DEVICE_UPLOAD_CAP` files | 429 `device_cap` |
| 11 | Drive slow or failing (8 s budget) | 503 `drive_unavailable` |
| 12 | Created | 200 `{ ok:true, photoId, uploadedAt }` |

- [ ] **Step 1: Write the failing upload tests**

`lib/server/uploadHandler.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { DriveDeps } from '@/lib/drive/files';
import { handleUpload, type UploadDeps } from '@/lib/server/uploadHandler';
import { fakeJpeg, testEnv } from '@/test/fixtures';

const KEY = 'k'.repeat(24);
const DEVICE = '9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b';
const PHOTO = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const DURING = new Date('2026-12-08T13:00:00Z'); // 21:00 WITA

type Call = { url: string; init?: RequestInit };

function fakeDrive(existing: string[] = [], fail = false): { drive: DriveDeps; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (fail) throw new Error('socket hang up');
    if (url.startsWith('https://www.googleapis.com/upload/')) return Response.json({ id: 'file-1' });
    return Response.json({ files: existing.map((photoId) => ({ appProperties: { photoId } })) });
  }) as typeof fetch;
  return { drive: { fetch: fetchFn, getToken: async () => 'tok', sharedDriveId: '0ABC', folderId: '1XYZ' }, calls };
}

function form(o: Partial<Record<'photoId' | 'capturedAt' | 'consentVersion', string>> = {}, image: Uint8Array = fakeJpeg()) {
  const f = new FormData();
  f.set('photoId', o.photoId ?? PHOTO);
  f.set('capturedAt', o.capturedAt ?? '2026-12-08T11:34:12.000Z');
  f.set('consentVersion', o.consentVersion ?? '2026-10-v1');
  f.set('image', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), 'x.jpg');
  return f;
}

function request(body: FormData, cookie = `nf26_key=${KEY}; nf26_device=${DEVICE}`) {
  return new Request('https://cam.test/api/upload', { method: 'POST', headers: { cookie }, body });
}

function deps(drive: DriveDeps, over: Partial<UploadDeps> = {}): UploadDeps {
  return { env: testEnv(), drive, now: () => DURING, log: () => {}, ...over };
}

async function code(res: Response) {
  return ((await res.json()) as { code?: string }).code;
}

describe('handleUpload', () => {
  it('saves a valid photo with its metadata', async () => {
    const { drive, calls } = fakeDrive();
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, photoId: PHOTO, uploadedAt: DURING.toISOString() });
    const upload = calls.find((c) => c.url.includes('/upload/'))!;
    const body = await (upload.init!.body as Blob).text();
    expect(body).toContain('NF26_20261208-193412_1b9d6bcd.jpg');
    expect(body).toContain(`"deviceId":"${DEVICE}"`);
    expect(body).toContain('"consentVersion":"2026-10-v1"');
  });

  it('rejects a missing or wrong event key', async () => {
    const { drive, calls } = fakeDrive();
    const res = await handleUpload(request(form(), `nf26_device=${DEVICE}`), deps(drive));
    expect(res.status).toBe(401);
    expect(await code(res)).toBe('bad_key');
    expect(calls).toHaveLength(0);
  });

  it('rejects uploads after the window closes', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form()), deps(drive, { now: () => new Date('2026-12-09T05:00:00Z') }));
    expect(res.status).toBe(403);
    expect(await code(res)).toBe('window_closed');
  });

  it('asks for consent when the version is outdated', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form({ consentVersion: '2025-old' })), deps(drive));
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('consent_required');
  });

  it('rejects a malformed photo ID', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form({ photoId: 'nope' })), deps(drive));
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('bad_request');
  });

  it('rejects an image over the size limit', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form()), deps(drive, { env: testEnv({ maxUploadBytes: 20 }) }));
    expect(res.status).toBe(413);
    expect(await code(res)).toBe('too_large');
  });

  it('rejects non-JPEG and wrong-size images', async () => {
    const { drive } = fakeDrive();
    const notJpeg = await handleUpload(request(form({}, new TextEncoder().encode('hello'))), deps(drive));
    expect(notJpeg.status).toBe(415);
    const wrongSize = await handleUpload(request(form({}, fakeJpeg(800, 600))), deps(drive));
    expect(wrongSize.status).toBe(415);
    expect(await code(wrongSize)).toBe('bad_type');
  });

  it('requires the device cookie', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form(), `nf26_key=${KEY}`), deps(drive));
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('no_device');
  });

  it('treats a repeat of a stored photo as saved without uploading again', async () => {
    const { drive, calls } = fakeDrive([PHOTO]);
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, photoId: PHOTO, duplicate: true });
    expect(calls.some((c) => c.url.includes('/upload/'))).toBe(false);
  });

  it('checks for a duplicate before the device cap', async () => {
    const twenty = Array.from({ length: 19 }, (_, i) => `other-${i}`).concat(PHOTO);
    const { drive } = fakeDrive(twenty);
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(200);
  });

  it('stops a device at the upload cap', async () => {
    const { drive } = fakeDrive(Array.from({ length: 20 }, (_, i) => `other-${i}`));
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(429);
    expect(await code(res)).toBe('device_cap');
  });

  it('returns a retryable error when Drive fails', async () => {
    const { drive } = fakeDrive([], true);
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(503);
    expect(await code(res)).toBe('drive_unavailable');
  });
});
```

- [ ] **Step 2: Write the failing status test**

`lib/server/statusHandler.test.ts`:

```ts
import { expect, it } from 'vitest';
import { buildStatus } from '@/lib/server/statusHandler';
import { testEnv } from '@/test/fixtures';

it('exposes only public settings', () => {
  const s = buildStatus(testEnv(), new Date('2026-12-08T10:00:00Z'));
  expect(s).toEqual({
    cameraOpenAt: '2026-12-08T07:00:00.000Z',
    cameraCloseAt: '2026-12-08T15:00:00.000Z',
    uploadCloseAt: '2026-12-09T04:00:00.000Z',
    shotsPerDevice: 15,
    consentVersion: '2026-10-v1',
    now: '2026-12-08T10:00:00.000Z',
  });
  expect(JSON.stringify(s)).not.toContain('k'.repeat(24));
});
```

- [ ] **Step 3: Run to see them fail**

Run: `npx vitest run lib/server`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement `lib/server/uploadHandler.ts`**

```ts
import 'server-only';
import type { ServerEnv } from '@/lib/env';
import { DriveError, createPhoto, listDevicePhotos, type DriveDeps } from '@/lib/drive/files';
import { EXPECTED_HEIGHT, EXPECTED_WIDTH, inspectJpeg } from '@/lib/security/validateImage';
import { isValidEventKey, isWithinUploadWindow } from '@/lib/security/eventGuard';
import { COOKIE_DEVICE, COOKIE_KEY, parseCookieString } from '@/lib/shared/cookies';
import { formatFileName } from '@/lib/shared/time';

export type UploadDeps = {
  env: ServerEnv;
  drive: DriveDeps;
  now: () => Date;
  log?: (entry: Record<string, unknown>) => void;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORM_OVERHEAD_BYTES = 64 * 1024;
const DRIVE_BUDGET_MS = 8_000;
const NO_STORE = { 'cache-control': 'no-store' };

const fail = (status: number, code: string) => Response.json({ ok: false, code }, { status, headers: NO_STORE });
const ok = (body: Record<string, unknown>) => Response.json({ ok: true, ...body }, { status: 200, headers: NO_STORE });

const defaultLog = (entry: Record<string, unknown>) => console.log(JSON.stringify(entry));

export async function handleUpload(req: Request, deps: UploadDeps): Promise<Response> {
  const started = Date.now();
  let photoId: string | undefined;
  let bytes = 0;
  const finish = (res: Response, result: string) => {
    (deps.log ?? defaultLog)({ evt: 'upload', photoId, result, status: res.status, bytes, ms: Date.now() - started });
    return res;
  };

  const { env } = deps;
  const cookies = parseCookieString(req.headers.get('cookie'));

  if (!isValidEventKey(cookies[COOKIE_KEY], env.eventKey)) return finish(fail(401, 'bad_key'), 'bad_key');
  if (!isWithinUploadWindow(deps.now(), env)) return finish(fail(403, 'window_closed'), 'window_closed');

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > env.maxUploadBytes + FORM_OVERHEAD_BYTES) return finish(fail(413, 'too_large'), 'too_large');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return finish(fail(400, 'bad_request'), 'bad_request');
  }

  if (form.get('consentVersion') !== env.consentVersion) return finish(fail(400, 'consent_required'), 'consent_required');

  const pid = form.get('photoId');
  const captured = form.get('capturedAt');
  const image = form.get('image');
  if (
    typeof pid !== 'string' ||
    !UUID_RE.test(pid) ||
    typeof captured !== 'string' ||
    Number.isNaN(Date.parse(captured)) ||
    !(image instanceof Blob)
  ) {
    return finish(fail(400, 'bad_request'), 'bad_request');
  }
  photoId = pid;
  bytes = image.size;

  if (image.size > env.maxUploadBytes) return finish(fail(413, 'too_large'), 'too_large');

  const data = new Uint8Array(await image.arrayBuffer());
  const size = inspectJpeg(data);
  if (!size || size.width !== EXPECTED_WIDTH || size.height !== EXPECTED_HEIGHT) {
    return finish(fail(415, 'bad_type'), 'bad_type');
  }

  const deviceId = cookies[COOKIE_DEVICE];
  if (!deviceId || !UUID_RE.test(deviceId)) return finish(fail(400, 'no_device'), 'no_device');

  const signal = AbortSignal.timeout(DRIVE_BUDGET_MS);
  try {
    const stored = await listDevicePhotos(deps.drive, deviceId, signal);
    if (stored.includes(pid)) return finish(ok({ photoId: pid, duplicate: true }), 'duplicate');
    if (stored.length >= env.deviceUploadCap) return finish(fail(429, 'device_cap'), 'device_cap');

    const capturedAt = new Date(captured);
    await createPhoto(
      deps.drive,
      {
        name: formatFileName(capturedAt, pid),
        bytes: data,
        appProperties: {
          app: 'nf26-candid-cam',
          photoId: pid,
          deviceId,
          capturedAt: capturedAt.toISOString(),
          consentVersion: env.consentVersion,
        },
      },
      signal,
    );
    return finish(ok({ photoId: pid, uploadedAt: deps.now().toISOString() }), 'saved');
  } catch (err) {
    const reason = err instanceof DriveError ? err.code : 'unknown';
    return finish(fail(503, 'drive_unavailable'), `drive_unavailable:${reason}`);
  }
}
```

- [ ] **Step 5: Implement `lib/server/statusHandler.ts`**

```ts
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
```

- [ ] **Step 6: Run to see them pass**

Run: `npx vitest run lib/server`
Expected: 13 passed.

- [ ] **Step 7: Add the route files**

`app/api/upload/route.ts`:

```ts
import { env } from '@/lib/env';
import { driveDeps } from '@/lib/drive/files';
import { handleUpload } from '@/lib/server/uploadHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleUpload(req, { env: env(), drive: driveDeps(), now: () => new Date() });
}
```

`app/api/status/route.ts`:

```ts
import { env } from '@/lib/env';
import { buildStatus } from '@/lib/server/statusHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(buildStatus(env(), new Date()), { headers: { 'cache-control': 'no-store' } });
}
```

`app/api/health/route.ts`:

```ts
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
```

- [ ] **Step 8: Smoke-test against the real Drive**

With `.env.local` filled in and `CAMERA_OPEN_AT` temporarily set to a past time:

Run: `npm run dev`, then in another terminal:
`curl -s "http://localhost:3000/api/health?token=$HEALTH_CHECK_TOKEN"` → `{"ok":true,...}`
`curl -s http://localhost:3000/api/status` → JSON with the five event fields.
Restore `CAMERA_OPEN_AT` afterwards.

- [ ] **Step 9: Commit**

```bash
npm run typecheck && npm test
git add lib/server app/api
git commit -m "feat: upload, status and health endpoints"
```

---

### Task 6: Camera and preflight helpers

**Files:**
- Create: `lib/camera/crop.ts`, `lib/camera/crop.test.ts`, `lib/camera/support.ts`, `lib/camera/support.test.ts`, `lib/app/preflight.ts`, `lib/app/preflight.test.ts`

**Interfaces:**
- Produces:
  - `type CropRect = { sx: number; sy: number; sw: number; sh: number }`; `coverCrop(srcW, srcH, targetAspect = 3/4): CropRect`
  - `type BlockReason = 'in_app' | 'no_key' | 'no_camera' | 'not_open' | 'closed' | 'denied' | 'busy'`
  - `isInAppBrowser(ua: string): boolean`; `mapCameraError(err: unknown): BlockReason | 'retry_relaxed'`
  - `preflight(input: PreflightInput): BlockReason | null` where `PreflightInput = { ua: string; hasMediaDevices: boolean; hasKey: boolean; now: number; cameraOpenAt: number; cameraCloseAt: number }`

- [ ] **Step 1: Write the failing tests**

`lib/camera/crop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { coverCrop } from '@/lib/camera/crop';

describe('coverCrop to 3:4', () => {
  it('trims the sides of a landscape 4:3 frame', () => {
    expect(coverCrop(1920, 1440)).toEqual({ sx: 420, sy: 0, sw: 1080, sh: 1440 });
  });
  it('keeps a portrait 3:4 frame whole', () => {
    expect(coverCrop(1440, 1920)).toEqual({ sx: 0, sy: 0, sw: 1440, sh: 1920 });
  });
  it('trims top and bottom of a tall 9:16 frame', () => {
    expect(coverCrop(1080, 1920)).toEqual({ sx: 0, sy: 240, sw: 1080, sh: 1440 });
  });
});
```

`lib/camera/support.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isInAppBrowser, mapCameraError } from '@/lib/camera/support';

const err = (name: string) => Object.assign(new Error(name), { name });

describe('isInAppBrowser', () => {
  it('detects social app browsers', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit Instagram 310.0')).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) [FBAN/EMA;FBAV/400.0]')).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (Linux) musical_ly_2023 BytedanceWebview')).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) Mobile/15E148 Line/13.20.0')).toBe(true);
  });
  it('allows Safari and Chrome', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36')).toBe(false);
  });
});

describe('mapCameraError', () => {
  it('maps browser errors to screens', () => {
    expect(mapCameraError(err('NotAllowedError'))).toBe('denied');
    expect(mapCameraError(err('SecurityError'))).toBe('denied');
    expect(mapCameraError(err('NotReadableError'))).toBe('busy');
    expect(mapCameraError(err('AbortError'))).toBe('busy');
    expect(mapCameraError(err('OverconstrainedError'))).toBe('retry_relaxed');
    expect(mapCameraError(err('NotFoundError'))).toBe('no_camera');
    expect(mapCameraError('weird')).toBe('no_camera');
  });
});
```

`lib/app/preflight.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { preflight } from '@/lib/app/preflight';

const open = Date.parse('2026-12-08T07:00:00Z');
const close = Date.parse('2026-12-08T15:00:00Z');
const base = {
  ua: 'Mozilla/5.0 (iPhone) Version/17.5 Mobile/15E148 Safari/604.1',
  hasMediaDevices: true,
  hasKey: true,
  now: Date.parse('2026-12-08T12:00:00Z'),
  cameraOpenAt: open,
  cameraCloseAt: close,
};

describe('preflight', () => {
  it('passes during the event in a normal browser', () => {
    expect(preflight(base)).toBeNull();
  });
  it('reports the first blocking problem in a fixed order', () => {
    expect(preflight({ ...base, ua: 'Instagram', hasKey: false })).toBe('in_app');
    expect(preflight({ ...base, hasKey: false })).toBe('no_key');
    expect(preflight({ ...base, hasMediaDevices: false })).toBe('no_camera');
    expect(preflight({ ...base, now: open - 1 })).toBe('not_open');
    expect(preflight({ ...base, now: close + 1 })).toBe('closed');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/camera lib/app`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/camera/crop.ts`:

```ts
export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/** Largest centred region of the source with the target aspect (width / height). */
export function coverCrop(srcW: number, srcH: number, targetAspect = 3 / 4): CropRect {
  if (srcW / srcH > targetAspect) {
    const sw = Math.round(srcH * targetAspect);
    return { sx: Math.round((srcW - sw) / 2), sy: 0, sw, sh: srcH };
  }
  const sh = Math.round(srcW / targetAspect);
  return { sx: 0, sy: Math.round((srcH - sh) / 2), sw: srcW, sh };
}
```

`lib/camera/support.ts`:

```ts
export type BlockReason = 'in_app' | 'no_key' | 'no_camera' | 'not_open' | 'closed' | 'denied' | 'busy';

const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|BytedanceWebview|TikTok|\bLine\//i;

export function isInAppBrowser(ua: string): boolean {
  return IN_APP.test(ua);
}

export function mapCameraError(err: unknown): BlockReason | 'retry_relaxed' {
  const name = (err as { name?: unknown } | null)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotReadableError':
    case 'AbortError':
      return 'busy';
    case 'OverconstrainedError':
      return 'retry_relaxed';
    default:
      return 'no_camera';
  }
}
```

`lib/app/preflight.ts`:

```ts
import { isInAppBrowser, type BlockReason } from '@/lib/camera/support';

export type PreflightInput = {
  ua: string;
  hasMediaDevices: boolean;
  hasKey: boolean;
  now: number;
  cameraOpenAt: number;
  cameraCloseAt: number;
};

/** First reason the camera cannot open right now, or null when it can. */
export function preflight(i: PreflightInput): BlockReason | null {
  if (isInAppBrowser(i.ua)) return 'in_app';
  if (!i.hasKey) return 'no_key';
  if (!i.hasMediaDevices) return 'no_camera';
  if (i.now < i.cameraOpenAt) return 'not_open';
  if (i.now > i.cameraCloseAt) return 'closed';
  return null;
}
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/camera lib/app`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/camera lib/app
git commit -m "feat: 3:4 crop, camera error mapping and preflight checks"
```

---

### Task 7: Image pipeline — filters, frame layout, compose, encode (M2 logic)

**Files:**
- Create: `lib/image/filters.ts`, `lib/image/filters.test.ts`, `lib/image/frameLayout.ts`, `lib/image/frameLayout.test.ts`, `lib/image/encode.ts`, `lib/image/encode.test.ts`, `lib/image/fonts.ts`, `lib/image/compose.ts`, `components/dev/FramePreview.tsx`, `app/dev/frame/page.tsx`

**Interfaces:**
- Produces:
  - `type FilterId = 'original' | 'nf-film' | 'flash-mono' | 'gold-hour' | 'neon-night'`; `type Filter = { id: FilterId; label: string; matrix: readonly number[] }`; `FILTERS: readonly Filter[]` (Original first); `applyColorMatrix(data: Uint8ClampedArray, matrix: readonly number[]): void`
  - `OUT`, `PHOTO`, `COLORS`, `BRACKET`, `TEXT` constants (`@/lib/image/frameLayout`)
  - `composeFrame(canvas: HTMLCanvasElement, input: { photo: CanvasImageSource; filter: Filter; shotLabel: string; stamp: string }): void` — `photo` must already be 1200×1600
  - `ensureFrameFonts(): Promise<void>`
  - `encodeJpeg(toBlob: (q: number) => Promise<Blob>): Promise<Blob>`; `canvasToBlob(canvas): (q: number) => Promise<Blob>`; `QUALITY_STEPS`, `SOFT_LIMIT_BYTES = 1_500_000`, `HARD_LIMIT_BYTES = 3_000_000`

- [ ] **Step 1: Write the failing tests**

`lib/image/filters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FILTERS, applyColorMatrix } from '@/lib/image/filters';

const byId = (id: string) => FILTERS.find((f) => f.id === id)!;

describe('filters', () => {
  it('lists Original first and five filters in total', () => {
    expect(FILTERS.map((f) => f.id)).toEqual(['original', 'nf-film', 'flash-mono', 'gold-hour', 'neon-night']);
    for (const f of FILTERS) expect(f.matrix).toHaveLength(20);
  });

  it('leaves pixels unchanged for Original', () => {
    const px = new Uint8ClampedArray([10, 120, 250, 255]);
    applyColorMatrix(px, byId('original').matrix);
    expect([...px]).toEqual([10, 120, 250, 255]);
  });

  it('makes Flash Mono grey', () => {
    const px = new Uint8ClampedArray([200, 80, 30, 255, 20, 40, 60, 255]);
    applyColorMatrix(px, byId('flash-mono').matrix);
    expect(px[0]).toBe(px[1]);
    expect(px[1]).toBe(px[2]);
    expect(px[4]).toBe(px[6]);
    expect(px[3]).toBe(255);
  });

  it('clamps to the 0–255 range', () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    applyColorMatrix(px, byId('gold-hour').matrix);
    expect(Math.max(...px)).toBeLessThanOrEqual(255);
    expect(Math.min(...px)).toBeGreaterThanOrEqual(0);
  });
});
```

`lib/image/frameLayout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BRACKET, OUT, PHOTO, TEXT } from '@/lib/image/frameLayout';

const photoBottom = PHOTO.y + PHOTO.height;

describe('frame layout', () => {
  it('matches the 1320×1920 output with a 1200×1600 photo window', () => {
    expect(OUT).toEqual({ width: 1320, height: 1920 });
    expect(PHOTO.width / PHOTO.height).toBeCloseTo(3 / 4);
    expect(PHOTO.x * 2 + PHOTO.width).toBe(OUT.width);
  });

  it('keeps overlay text inside the photo and inside the brackets', () => {
    for (const y of [TEXT.nf26.y, TEXT.shot.y, TEXT.stamp.y, TEXT.hashtag.y]) {
      expect(y).toBeGreaterThan(PHOTO.y + BRACKET.inset);
      expect(y).toBeLessThan(photoBottom - BRACKET.inset + 1);
    }
    expect(TEXT.shot.rightX).toBeLessThan(PHOTO.x + PHOTO.width - BRACKET.inset);
  });

  it('places the band below the photo and inside the card', () => {
    for (const y of [TEXT.title.y, TEXT.year.y, TEXT.date.y]) {
      expect(y).toBeGreaterThan(photoBottom);
      expect(y).toBeLessThan(OUT.height);
    }
  });
});
```

`lib/image/encode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { encodeJpeg } from '@/lib/image/encode';

const blobOf = (size: number) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' });

describe('encodeJpeg', () => {
  it('keeps the first quality when the file is small enough', async () => {
    const asked: number[] = [];
    const out = await encodeJpeg(async (q) => (asked.push(q), blobOf(900_000)));
    expect(out.size).toBe(900_000);
    expect(asked).toEqual([0.82]);
  });

  it('steps quality down until under 1.5 MB', async () => {
    const sizes: Record<number, number> = { 0.82: 2_000_000, 0.76: 1_600_000, 0.7: 1_200_000 };
    const asked: number[] = [];
    const out = await encodeJpeg(async (q) => (asked.push(q), blobOf(sizes[q]!)));
    expect(asked).toEqual([0.82, 0.76, 0.7]);
    expect(out.size).toBe(1_200_000);
  });

  it('accepts the last step under the 3 MB hard limit', async () => {
    const out = await encodeJpeg(async () => blobOf(2_500_000));
    expect(out.size).toBe(2_500_000);
  });

  it('fails above the hard limit', async () => {
    await expect(encodeJpeg(async () => blobOf(3_100_000))).rejects.toThrow('Photo is too large to save. Please retake it.');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/image`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `lib/image/filters.ts`**

```ts
export type FilterId = 'original' | 'nf-film' | 'flash-mono' | 'gold-hour' | 'neon-night';
export type Filter = { id: FilterId; label: string; matrix: readonly number[] };

// Rows are R, G, B, A. Each row: [r, g, b, a, offset], offset in 0–255 units (same layout as SVG feColorMatrix ×255).
const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] as const;
const MONO = (gain: number, offset: number) => {
  const r = 0.299 * gain, g = 0.587 * gain, b = 0.114 * gain;
  return [r, g, b, 0, offset, r, g, b, 0, offset, r, g, b, 0, offset, 0, 0, 0, 1, 0] as const;
};

export const FILTERS: readonly Filter[] = [
  { id: 'original', label: 'Original', matrix: IDENTITY },
  // Warm, slightly faded, soft contrast
  { id: 'nf-film', label: 'NF Film', matrix: [0.92, 0.06, 0, 0, 18, 0.02, 0.88, 0.04, 0, 16, 0, 0.06, 0.78, 0, 14, 0, 0, 0, 1, 0] },
  // High-contrast black and white; hides night-time sensor noise
  { id: 'flash-mono', label: 'Flash Mono', matrix: MONO(1.25, -32) },
  // Boosted warm tones
  { id: 'gold-hour', label: 'Gold Hour', matrix: [1.12, 0.06, 0, 0, 6, 0.02, 1.02, 0, 0, 2, 0, 0, 0.82, 0, -4, 0, 0, 0, 1, 0] },
  // Cool shadows with a magenta tint
  { id: 'neon-night', label: 'Neon Night', matrix: [1.0, 0, 0.12, 0, 12, 0, 0.82, 0.06, 0, -4, 0.06, 0.04, 1.08, 0, 14, 0, 0, 0, 1, 0] },
];

function isIdentity(m: readonly number[]): boolean {
  return m.every((v, i) => v === IDENTITY[i]);
}

/** Applies the matrix in place to RGBA pixel data. Alpha is left unchanged. */
export function applyColorMatrix(data: Uint8ClampedArray, m: readonly number[]): void {
  if (isIdentity(m)) return;
  const [a0, a1, a2, , a4, b0, b1, b2, , b4, c0, c1, c2, , c4] = m as number[];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    data[i] = a0! * r + a1! * g + a2! * b + a4!;
    data[i + 1] = b0! * r + b1! * g + b2! * b + b4!;
    data[i + 2] = c0! * r + c1! * g + c2! * b + c4!;
  }
}
```

- [ ] **Step 4: Implement `lib/image/frameLayout.ts`**

All values are pixels on the final 1320×1920 image (2× the canvas artboard).

```ts
export const OUT = { width: 1320, height: 1920 } as const;
export const PHOTO = { x: 60, y: 60, width: 1200, height: 1600, radius: 28, border: 4 } as const;

export const COLORS = {
  card: '#EDE6D6',
  ink: '#0D0D0D',
  gold: '#D4AF37',
  pink: '#FF1B6B',
  green: '#39FF14',
  overlay: '#F5F0E6',
} as const;

export const BRACKET = { inset: 44, arm: 76, stroke: 6 } as const;

export const TEXT = {
  battery: { x: 208, y: 124, width: 60, height: 36 },
  nf26: { x: 300, y: 156, font: '500 40px Oswald', text: 'NF26' },
  shot: { rightX: 1112, y: 160, font: '500 48px Oswald' },
  bolt: { width: 32, height: 56, gap: 20 },
  stamp: { x: 208, y: 1604, font: '500 40px Oswald' },
  hashtag: { rightX: 1112, y: 1604, font: '500 36px Oswald', text: '#MoveInUnity' },
  title: { x: 60, y: 1764, font: '400 80px Bungee', text: 'NOURISHFEST' },
  year: { x: 60, y: 1848, font: '400 48px Bungee', text: '2026' },
  date: { gap: 40, y: 1848, font: '500 40px Oswald', text: '08.12.2026' },
} as const;
```

- [ ] **Step 5: Implement `lib/image/encode.ts`**

```ts
export const QUALITY_STEPS = [0.82, 0.76, 0.7] as const;
export const SOFT_LIMIT_BYTES = 1_500_000;
export const HARD_LIMIT_BYTES = 3_000_000;

export async function encodeJpeg(toBlob: (quality: number) => Promise<Blob>): Promise<Blob> {
  let last: Blob | null = null;
  for (const q of QUALITY_STEPS) {
    last = await toBlob(q);
    if (last.size <= SOFT_LIMIT_BYTES) return last;
  }
  if (last && last.size <= HARD_LIMIT_BYTES) return last;
  throw new Error('Photo is too large to save. Please retake it.');
}

export function canvasToBlob(canvas: HTMLCanvasElement): (quality: number) => Promise<Blob> {
  return (quality) =>
    new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', quality),
    );
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run lib/image`
Expected: 11 passed.

- [ ] **Step 7: Implement `lib/image/fonts.ts`**

```ts
const FRAME_FONTS = ['400 80px Bungee', '400 48px Bungee', '500 40px Oswald'] as const;

let ready: Promise<void> | null = null;

/** Canvas draws with whatever is loaded at that moment, so load the frame fonts first. */
export function ensureFrameFonts(): Promise<void> {
  ready ??= Promise.all(FRAME_FONTS.map((f) => document.fonts.load(f))).then((faces) => {
    if (faces.some((list) => list.length === 0)) console.warn('A frame font did not load; text will use a fallback face');
  });
  return ready;
}
```

- [ ] **Step 8: Implement `lib/image/compose.ts`**

```ts
import { BRACKET, COLORS, OUT, PHOTO, TEXT } from '@/lib/image/frameLayout';
import { applyColorMatrix, type Filter } from '@/lib/image/filters';

export type ComposeInput = { photo: CanvasImageSource; filter: Filter; shotLabel: string; stamp: string };

let grainTile: HTMLCanvasElement | null = null;

function getGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

function renderPhoto(input: ComposeInput): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = PHOTO.width;
  c.height = PHOTO.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(input.photo, 0, 0, PHOTO.width, PHOTO.height);
  if (input.filter.id !== 'original') {
    const img = ctx.getImageData(0, 0, PHOTO.width, PHOTO.height);
    applyColorMatrix(img.data, input.filter.matrix);
    ctx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat')!;
  ctx.fillRect(0, 0, PHOTO.width, PHOTO.height);
  ctx.restore();
  return c;
}

function drawBrackets(ctx: CanvasRenderingContext2D) {
  const l = PHOTO.x + BRACKET.inset;
  const t = PHOTO.y + BRACKET.inset;
  const r = PHOTO.x + PHOTO.width - BRACKET.inset;
  const b = PHOTO.y + PHOTO.height - BRACKET.inset;
  const a = BRACKET.arm;
  ctx.strokeStyle = COLORS.overlay;
  ctx.lineWidth = BRACKET.stroke;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(l, t + a); ctx.lineTo(l, t); ctx.lineTo(l + a, t);
  ctx.moveTo(r - a, t); ctx.lineTo(r, t); ctx.lineTo(r, t + a);
  ctx.moveTo(l, b - a); ctx.lineTo(l, b); ctx.lineTo(l + a, b);
  ctx.moveTo(r - a, b); ctx.lineTo(r, b); ctx.lineTo(r, b - a);
  ctx.stroke();
}

function drawBattery(ctx: CanvasRenderingContext2D) {
  const { x, y, width: w, height: h } = TEXT.battery;
  ctx.strokeStyle = COLORS.overlay;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(x + w + 2, y + h / 2 - 6, 5, 12);
  ctx.fillStyle = COLORS.green;
  const barW = (w - 16) / 3;
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * (barW + 4), y + 6, barW, h - 12);
}

function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const pts: [number, number][] = [[6, 2], [22, 2], [12, 24], [26, 24], [8, 54], [14, 30], [2, 30]];
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(x + px, y + py) : ctx.lineTo(x + px, y + py)));
  ctx.closePath();
  ctx.stroke();
}

function drawOverlay(ctx: CanvasRenderingContext2D, input: ComposeInput) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.textBaseline = 'alphabetic';

  drawBrackets(ctx);
  drawBattery(ctx);

  ctx.font = TEXT.nf26.font;
  ctx.fillStyle = COLORS.overlay;
  ctx.textAlign = 'left';
  ctx.fillText(TEXT.nf26.text, TEXT.nf26.x, TEXT.nf26.y);

  ctx.font = TEXT.shot.font;
  ctx.textAlign = 'right';
  ctx.fillText(input.shotLabel, TEXT.shot.rightX, TEXT.shot.y);
  const shotWidth = ctx.measureText(input.shotLabel).width;
  drawBolt(ctx, TEXT.shot.rightX - shotWidth - TEXT.bolt.gap - TEXT.bolt.width, TEXT.shot.y - TEXT.bolt.height + 10);

  ctx.font = TEXT.stamp.font;
  ctx.fillStyle = COLORS.green;
  ctx.textAlign = 'left';
  ctx.fillText(input.stamp, TEXT.stamp.x, TEXT.stamp.y);

  ctx.font = TEXT.hashtag.font;
  ctx.fillStyle = COLORS.gold;
  ctx.textAlign = 'right';
  ctx.fillText(TEXT.hashtag.text, TEXT.hashtag.rightX, TEXT.hashtag.y);
  ctx.restore();
}

function drawBand(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = TEXT.title.font;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(TEXT.title.text, TEXT.title.x, TEXT.title.y);

  ctx.font = TEXT.year.font;
  ctx.fillStyle = COLORS.pink;
  ctx.fillText(TEXT.year.text, TEXT.year.x, TEXT.year.y);
  const yearWidth = ctx.measureText(TEXT.year.text).width;

  ctx.font = TEXT.date.font;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(TEXT.date.text, TEXT.year.x + yearWidth + TEXT.date.gap, TEXT.date.y);
  ctx.restore();
}

/** Draws the full 1320×1920 framed photo. `input.photo` must be 1200×1600 (see captureFrame). */
export function composeFrame(canvas: HTMLCanvasElement, input: ComposeInput): void {
  canvas.width = OUT.width;
  canvas.height = OUT.height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = COLORS.card;
  ctx.fillRect(0, 0, OUT.width, OUT.height);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height, PHOTO.radius);
  ctx.clip();
  ctx.drawImage(renderPhoto(input), PHOTO.x, PHOTO.y);
  ctx.restore();

  const half = PHOTO.border / 2;
  ctx.save();
  ctx.lineWidth = PHOTO.border;
  ctx.strokeStyle = COLORS.gold;
  ctx.beginPath();
  ctx.roundRect(PHOTO.x + half, PHOTO.y + half, PHOTO.width - PHOTO.border, PHOTO.height - PHOTO.border, PHOTO.radius - half);
  ctx.stroke();
  ctx.restore();

  drawOverlay(ctx, input);
  drawBand(ctx);
}
```

- [ ] **Step 9: Add the dev-only frame preview**

`components/dev/FramePreview.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { composeFrame } from '@/lib/image/compose';
import { FILTERS } from '@/lib/image/filters';
import { ensureFrameFonts } from '@/lib/image/fonts';
import { formatShot, formatStamp } from '@/lib/shared/time';

function testPhoto(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 1600;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 1600);
  g.addColorStop(0, '#2b1d3a');
  g.addColorStop(0.55, '#c8752a');
  g.addColorStop(1, '#1a120c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 1600);
  ctx.fillStyle = '#f2e9d8';
  ctx.fillRect(0, 0, 1200, 120); // bright sky strip to check overlay legibility
  ctx.fillStyle = '#0b0806';
  ctx.beginPath();
  ctx.arc(420, 760, 150, 0, Math.PI * 2);
  ctx.arc(780, 700, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(250, 900, 340, 700);
  ctx.fillRect(620, 840, 320, 760);
  return c;
}

export function FramePreview() {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => {
    void ensureFrameFonts().then(() => {
      const photo = testPhoto();
      FILTERS.forEach((filter, i) => {
        const canvas = refs.current[i];
        if (canvas) composeFrame(canvas, { photo, filter, shotLabel: formatShot(7, 15), stamp: formatStamp(new Date('2026-12-08T13:04:00Z')) });
      });
    });
  }, []);
  return (
    <main className="flex flex-wrap gap-6 p-6">
      {FILTERS.map((f, i) => (
        <figure key={f.id} className="w-[330px]">
          <canvas ref={(el) => { refs.current[i] = el; }} className="h-auto w-full" />
          <figcaption className="mt-2 font-label text-gold">{f.label}</figcaption>
        </figure>
      ))}
    </main>
  );
}
```

`app/dev/frame/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { FramePreview } from '@/components/dev/FramePreview';

export default function DevFramePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <FramePreview />;
}
```

- [ ] **Step 10: Visual check against the canvas artboard**

Run: `npm run dev` and open `http://localhost:3000/dev/frame`.
Expected: five framed cards. Compare the Original card side by side with the "FINAL · Digicam Cream" artboard: cream card, gold photo border, white corner brackets, battery + NF26 top-left, gold bolt + 07/15 top-right, green `'26 12 08 21:04` bottom-left, gold #MoveInUnity bottom-right, black NOURISHFEST, pink 2026 with 08.12.2026 beside it. Bungee and Oswald must render (no serif or Arial fallback). Overlay text must stay readable over the bright strip at the top. Adjust only `frameLayout.ts` values if something sits wrong, then re-run `npx vitest run lib/image`.

- [ ] **Step 11: Commit**

```bash
npm run typecheck
git add lib/image components/dev app/dev
git commit -m "feat: frame compositing, film filters and JPEG encoding"
```

---

### Task 8: Upload queue policy and on-phone storage

**Files:**
- Create: `lib/queue/policy.ts`, `lib/queue/policy.test.ts`, `lib/queue/store.ts`, `lib/queue/store.test.ts`

**Interfaces:**
- Produces (`@/lib/queue/policy`):
  - `type PhotoStatus = 'developing' | 'sending' | 'saved' | 'retrying' | 'not_sent'`
  - `type PhotoRecord = { photoId: string; capturedAt: string; createdAt: number; bytes: ArrayBuffer; status: PhotoStatus; attempts: number; nextAttemptAt: number; lastError?: string }`
  - `type SendResult = { status: number | null; code?: string }` (`null` = network error or timeout)
  - `type UploadOutcome = { kind: 'saved' } | { kind: 'retry'; reason: string } | { kind: 'consent' } | { kind: 'rejected'; code: string }`
  - `RETRY_DELAYS_S = [2, 5, 15, 30, 60]`; `PAUSED = Number.MAX_SAFE_INTEGER`
  - `retryDelayMs(attempts: number): number`; `classifyResponse(status, code?): UploadOutcome`; `nextDue(records, now): PhotoRecord | undefined`; `shotsUsed(records): number`; `pendingCount(records): number`
- Produces (`@/lib/queue/store`): `interface PhotoStore { put(r: PhotoRecord): Promise<void>; get(id: string): Promise<PhotoRecord | undefined>; all(): Promise<PhotoRecord[]> }` (oldest first); `openPhotoStore(factory?: IDBFactory): Promise<PhotoStore>`

Photos are stored as `ArrayBuffer`, not `Blob`: older iOS versions lose Blobs in IndexedDB, and ArrayBuffers clone everywhere.

- [ ] **Step 1: Write the failing tests**

`lib/queue/policy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PAUSED,
  classifyResponse,
  nextDue,
  pendingCount,
  retryDelayMs,
  shotsUsed,
  type PhotoRecord,
  type PhotoStatus,
} from '@/lib/queue/policy';

const rec = (photoId: string, status: PhotoStatus, createdAt: number, nextAttemptAt = 0): PhotoRecord => ({
  photoId,
  capturedAt: '2026-12-08T13:00:00.000Z',
  createdAt,
  bytes: new ArrayBuffer(4),
  status,
  attempts: 0,
  nextAttemptAt,
});

describe('retryDelayMs', () => {
  it('waits 2, 5, 15, 30 then 60 seconds', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(retryDelayMs)).toEqual([2000, 5000, 15000, 30000, 60000, 60000, 60000]);
  });
});

describe('classifyResponse', () => {
  it('maps server answers to queue outcomes', () => {
    expect(classifyResponse(200)).toEqual({ kind: 'saved' });
    expect(classifyResponse(null)).toEqual({ kind: 'retry', reason: 'network' });
    expect(classifyResponse(503, 'drive_unavailable')).toEqual({ kind: 'retry', reason: 'drive_unavailable' });
    expect(classifyResponse(400, 'consent_required')).toEqual({ kind: 'consent' });
    expect(classifyResponse(429, 'device_cap')).toEqual({ kind: 'rejected', code: 'device_cap' });
    expect(classifyResponse(403)).toEqual({ kind: 'rejected', code: 'http_403' });
  });
});

describe('queue selectors', () => {
  const now = 10_000;
  const records = [
    rec('saved', 'saved', 1),
    rec('later', 'retrying', 2, now + 5000),
    rec('due', 'retrying', 3, now - 1),
    rec('new', 'developing', 4),
    rec('refunded', 'not_sent', 5),
    rec('paused', 'retrying', 6, PAUSED),
  ];

  it('picks the oldest photo that is due', () => {
    expect(nextDue(records, now)?.photoId).toBe('due');
    expect(nextDue([rec('a', 'developing', 9), rec('b', 'developing', 8)].sort((x, y) => x.createdAt - y.createdAt), now)?.photoId).toBe('b');
  });

  it('counts used shots without refunded ones', () => {
    expect(shotsUsed(records)).toBe(5);
  });

  it('counts photos still waiting to reach Drive', () => {
    expect(pendingCount(records)).toBe(4);
  });
});
```

`lib/queue/store.test.ts`:

```ts
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { PhotoRecord } from '@/lib/queue/policy';
import { openPhotoStore } from '@/lib/queue/store';

const rec = (photoId: string, createdAt: number): PhotoRecord => ({
  photoId,
  capturedAt: '2026-12-08T13:00:00.000Z',
  createdAt,
  bytes: new Uint8Array([1, 2, 3, createdAt]).buffer,
  status: 'developing',
  attempts: 0,
  nextAttemptAt: 0,
});

describe('openPhotoStore', () => {
  it('returns records oldest first', async () => {
    const store = await openPhotoStore(new IDBFactory());
    await store.put(rec('b', 2));
    await store.put(rec('a', 1));
    expect((await store.all()).map((r) => r.photoId)).toEqual(['a', 'b']);
  });

  it('keeps photo bytes intact', async () => {
    const store = await openPhotoStore(new IDBFactory());
    await store.put(rec('a', 7));
    const got = await store.get('a');
    expect([...new Uint8Array(got!.bytes)]).toEqual([1, 2, 3, 7]);
  });

  it('updates a record in place', async () => {
    const store = await openPhotoStore(new IDBFactory());
    await store.put(rec('a', 1));
    await store.put({ ...rec('a', 1), status: 'saved', attempts: 1 });
    const all = await store.all();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ status: 'saved', attempts: 1 });
  });

  it('survives reopening the database', async () => {
    const factory = new IDBFactory();
    await (await openPhotoStore(factory)).put(rec('a', 1));
    expect(await (await openPhotoStore(factory)).get('a')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/queue`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `lib/queue/policy.ts`**

```ts
export type PhotoStatus = 'developing' | 'sending' | 'saved' | 'retrying' | 'not_sent';

export type PhotoRecord = {
  photoId: string;
  capturedAt: string;
  createdAt: number;
  bytes: ArrayBuffer;
  status: PhotoStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

export type SendResult = { status: number | null; code?: string };

export type UploadOutcome =
  | { kind: 'saved' }
  | { kind: 'retry'; reason: string }
  | { kind: 'consent' }
  | { kind: 'rejected'; code: string };

export const RETRY_DELAYS_S = [2, 5, 15, 30, 60] as const;
/** nextAttemptAt for photos waiting on the privacy notice. */
export const PAUSED = Number.MAX_SAFE_INTEGER;

export function retryDelayMs(attempts: number): number {
  const i = Math.min(Math.max(attempts - 1, 0), RETRY_DELAYS_S.length - 1);
  return RETRY_DELAYS_S[i]! * 1000;
}

export function classifyResponse(status: number | null, code?: string): UploadOutcome {
  if (status === null) return { kind: 'retry', reason: 'network' };
  if (status >= 200 && status < 300) return { kind: 'saved' };
  if (status >= 500) return { kind: 'retry', reason: code ?? `http_${status}` };
  if (code === 'consent_required') return { kind: 'consent' };
  return { kind: 'rejected', code: code ?? `http_${status}` };
}

/** `records` must be sorted oldest first (PhotoStore.all does this). */
export function nextDue(records: PhotoRecord[], now: number): PhotoRecord | undefined {
  return records.find((r) => r.status === 'developing' || (r.status === 'retrying' && r.nextAttemptAt <= now));
}

export function shotsUsed(records: PhotoRecord[]): number {
  return records.filter((r) => r.status !== 'not_sent').length;
}

export function pendingCount(records: PhotoRecord[]): number {
  return records.filter((r) => r.status === 'developing' || r.status === 'sending' || r.status === 'retrying').length;
}
```

- [ ] **Step 4: Implement `lib/queue/store.ts`**

```ts
import type { PhotoRecord } from '@/lib/queue/policy';

export interface PhotoStore {
  put(record: PhotoRecord): Promise<void>;
  get(photoId: string): Promise<PhotoRecord | undefined>;
  /** All records, oldest first. */
  all(): Promise<PhotoRecord[]>;
}

const DB_NAME = 'nf26-candid-cam';
const STORE = 'photos';
const VERSION = 1;

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function openPhotoStore(factory: IDBFactory = indexedDB): Promise<PhotoStore> {
  const open = factory.open(DB_NAME, VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'photoId' });
  };
  const db = await done(open);

  const store = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);

  return {
    async put(record) {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    async get(photoId) {
      return (await done(store('readonly').get(photoId))) as PhotoRecord | undefined;
    },
    async all() {
      const rows = (await done(store('readonly').getAll())) as PhotoRecord[];
      return rows.sort((a, b) => a.createdAt - b.createdAt);
    },
  };
}
```

- [ ] **Step 5: Run to see them pass**

Run: `npx vitest run lib/queue`
Expected: 9 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/queue
git commit -m "feat: upload retry policy and IndexedDB photo store"
```

---

### Task 9: Upload worker, browser upload client and queue hook (M4 logic)

**Files:**
- Create: `lib/queue/worker.ts`, `lib/queue/worker.test.ts`, `lib/upload/client.ts`, `lib/queue/useQueue.ts`

**Interfaces:**
- Consumes: Task 8 policy and store; `formatFileName` (Task 3).
- Produces:
  - `class UploadWorker` with `constructor(deps: WorkerDeps)`, `recover(): Promise<void>`, `kick(): Promise<void>`, `retryNow(): Promise<void>`, `getProgress(photoId): number | undefined`, `dispose(): void`
  - `type WorkerDeps = { store: PhotoStore; send: (rec: PhotoRecord, onProgress: (fraction: number) => void) => Promise<SendResult>; now: () => number; uploadCloseAt: number; onChange: () => void; onProgress?: () => void; onConsentRequired: () => void; setTimer?: (fn: () => void, ms: number) => unknown; clearTimer?: (handle: unknown) => void }`
  - `sendPhoto(rec: Pick<PhotoRecord,'photoId'|'capturedAt'|'bytes'>, consentVersion: string, onProgress?: (f: number) => void, timeoutMs?: number): Promise<SendResult>`
  - `useQueue(opts: { consentVersion: string | null; uploadCloseAt: number | null; onConsentRequired: () => void }): QueueApi` where `QueueApi = { ready: boolean; storageError: string | null; records: PhotoRecord[]; shotsUsed: number; pending: number; add(input: { photoId: string; capturedAt: string; bytes: ArrayBuffer }): Promise<void>; retryNow(): void; progress(photoId: string): number | undefined }`

- [ ] **Step 1: Write the failing worker tests**

`lib/queue/worker.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { PAUSED, type PhotoRecord, type SendResult } from '@/lib/queue/policy';
import type { PhotoStore } from '@/lib/queue/store';
import { UploadWorker, type WorkerDeps } from '@/lib/queue/worker';

function memoryStore(): PhotoStore {
  const rows = new Map<string, PhotoRecord>();
  return {
    put: async (r) => void rows.set(r.photoId, structuredClone(r)),
    get: async (id) => rows.get(id),
    all: async () => [...rows.values()].sort((a, b) => a.createdAt - b.createdAt),
  };
}

const rec = (photoId: string, createdAt: number, over: Partial<PhotoRecord> = {}): PhotoRecord => ({
  photoId,
  capturedAt: '2026-12-08T13:00:00.000Z',
  createdAt,
  bytes: new ArrayBuffer(4),
  status: 'developing',
  attempts: 0,
  nextAttemptAt: 0,
  ...over,
});

const NOW = 1_000_000;

function setup(responses: SendResult[], over: Partial<WorkerDeps> = {}) {
  const store = memoryStore();
  const sent: string[] = [];
  const queue = [...responses];
  const setTimer = vi.fn(() => 'timer');
  const deps: WorkerDeps = {
    store,
    send: async (r) => {
      sent.push(r.photoId);
      return queue.shift() ?? { status: 200 };
    },
    now: () => NOW,
    uploadCloseAt: NOW + 3_600_000,
    onChange: vi.fn(),
    onConsentRequired: vi.fn(),
    setTimer,
    clearTimer: vi.fn(),
    ...over,
  };
  return { store, sent, deps, setTimer, worker: new UploadWorker(deps) };
}

describe('UploadWorker', () => {
  it('uploads oldest first and marks photos saved', async () => {
    const { store, sent, worker } = setup([{ status: 200 }, { status: 200 }]);
    await store.put(rec('second', 2));
    await store.put(rec('first', 1));
    await worker.kick();
    expect(sent).toEqual(['first', 'second']);
    expect((await store.all()).map((r) => r.status)).toEqual(['saved', 'saved']);
  });

  it('schedules a retry 2 s after a network failure', async () => {
    const { store, worker, setTimer } = setup([{ status: null }]);
    await store.put(rec('a', 1));
    await worker.kick();
    expect(await store.get('a')).toMatchObject({ status: 'retrying', attempts: 1, nextAttemptAt: NOW + 2000, lastError: 'network' });
    expect(setTimer).toHaveBeenLastCalledWith(expect.any(Function), 2000);
  });

  it('marks a rejected photo as not sent, which refunds the shot', async () => {
    const { store, worker } = setup([{ status: 429, code: 'device_cap' }]);
    await store.put(rec('a', 1));
    await worker.kick();
    expect(await store.get('a')).toMatchObject({ status: 'not_sent', lastError: 'device_cap' });
  });

  it('pauses on consent_required and resumes on retryNow', async () => {
    const { store, worker, deps, sent } = setup([{ status: 400, code: 'consent_required' }, { status: 200 }]);
    await store.put(rec('a', 1));
    await worker.kick();
    expect(deps.onConsentRequired).toHaveBeenCalledOnce();
    expect(await store.get('a')).toMatchObject({ status: 'retrying', nextAttemptAt: PAUSED });
    await worker.retryNow();
    expect(sent).toEqual(['a', 'a']);
    expect((await store.get('a'))!.status).toBe('saved');
  });

  it('gives up without sending once the upload window has closed', async () => {
    const { store, worker, sent } = setup([], { uploadCloseAt: NOW - 1 });
    await store.put(rec('a', 1));
    await worker.kick();
    expect(sent).toEqual([]);
    expect(await store.get('a')).toMatchObject({ status: 'not_sent', lastError: 'window_closed' });
  });

  it('treats a thrown send as a network failure', async () => {
    const { store, worker } = setup([], {
      send: async () => {
        throw new Error('boom');
      },
    });
    await store.put(rec('a', 1));
    await worker.kick();
    expect((await store.get('a'))!.status).toBe('retrying');
  });

  it('recovers photos left mid-send by a closed tab', async () => {
    const { store, worker } = setup([]);
    await store.put(rec('a', 1, { status: 'sending' }));
    await worker.recover();
    expect((await store.get('a'))!.status).toBe('developing');
  });

  it('never runs two uploads at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const { store, worker } = setup([], {
      send: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return { status: 200 };
      },
    });
    await store.put(rec('a', 1));
    await store.put(rec('b', 2));
    await Promise.all([worker.kick(), worker.kick(), worker.kick()]);
    await worker.kick();
    expect(maxInFlight).toBe(1);
    expect((await store.all()).every((r) => r.status === 'saved')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/queue/worker.test.ts`
Expected: FAIL, cannot resolve `@/lib/queue/worker`.

- [ ] **Step 3: Implement `lib/queue/worker.ts`**

```ts
import {
  PAUSED,
  classifyResponse,
  nextDue,
  retryDelayMs,
  type PhotoRecord,
  type SendResult,
} from '@/lib/queue/policy';
import type { PhotoStore } from '@/lib/queue/store';

export type WorkerDeps = {
  store: PhotoStore;
  send: (rec: PhotoRecord, onProgress: (fraction: number) => void) => Promise<SendResult>;
  now: () => number;
  uploadCloseAt: number;
  onChange: () => void;
  onProgress?: () => void;
  onConsentRequired: () => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

/** Sends queued photos one at a time, oldest first, with timed retries. */
export class UploadWorker {
  private running: Promise<void> | null = null;
  private again = false;
  private timer: unknown = null;
  private disposed = false;
  private readonly progress = new Map<string, number>();

  constructor(private readonly deps: WorkerDeps) {}

  getProgress(photoId: string): number | undefined {
    return this.progress.get(photoId);
  }

  async recover(): Promise<void> {
    for (const r of await this.deps.store.all()) {
      if (r.status === 'sending') await this.deps.store.put({ ...r, status: 'developing' });
    }
  }

  kick(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.processDue();
        } while (this.again && !this.disposed);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  async retryNow(): Promise<void> {
    const now = this.deps.now();
    for (const r of await this.deps.store.all()) {
      if (r.status === 'retrying') await this.deps.store.put({ ...r, nextAttemptAt: now });
    }
    this.deps.onChange();
    await this.kick();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private clearTimer() {
    if (this.timer !== null) {
      (this.deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.timer);
      this.timer = null;
    }
  }

  private schedule(records: PhotoRecord[]) {
    this.clearTimer();
    const waits = records.filter((r) => r.status === 'retrying' && r.nextAttemptAt !== PAUSED).map((r) => r.nextAttemptAt);
    if (!waits.length || this.disposed) return;
    const ms = Math.max(0, Math.min(...waits) - this.deps.now());
    this.timer = (this.deps.setTimer ?? setTimeout)(() => {
      this.timer = null;
      void this.kick();
    }, ms);
  }

  private async processDue(): Promise<void> {
    const { store } = this.deps;
    for (;;) {
      if (this.disposed) return;
      const records = await store.all();
      const now = this.deps.now();
      const due = nextDue(records, now);
      if (!due) {
        this.schedule(records);
        return;
      }

      if (now > this.deps.uploadCloseAt) {
        await store.put({ ...due, status: 'not_sent', lastError: 'window_closed' });
        this.deps.onChange();
        continue;
      }

      await store.put({ ...due, status: 'sending' });
      this.progress.set(due.photoId, 0);
      this.deps.onChange();

      let result: SendResult;
      try {
        result = await this.deps.send(due, (fraction) => {
          this.progress.set(due.photoId, fraction);
          this.deps.onProgress?.();
        });
      } catch {
        result = { status: null };
      }
      this.progress.delete(due.photoId);

      const attempts = due.attempts + 1;
      const outcome = classifyResponse(result.status, result.code);
      if (outcome.kind === 'saved') {
        await store.put({ ...due, status: 'saved', attempts, lastError: undefined });
      } else if (outcome.kind === 'retry') {
        await store.put({
          ...due,
          status: 'retrying',
          attempts,
          nextAttemptAt: this.deps.now() + retryDelayMs(attempts),
          lastError: outcome.reason,
        });
      } else if (outcome.kind === 'consent') {
        await store.put({ ...due, status: 'retrying', attempts, nextAttemptAt: PAUSED, lastError: 'consent_required' });
        this.deps.onConsentRequired();
      } else {
        await store.put({ ...due, status: 'not_sent', attempts, lastError: outcome.code });
      }
      this.deps.onChange();
    }
  }
}
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/queue`
Expected: 17 passed (9 from Task 8, 8 new).

- [ ] **Step 5: Implement `lib/upload/client.ts`**

XHR instead of `fetch`, because `fetch` cannot report upload progress.

```ts
import type { PhotoRecord, SendResult } from '@/lib/queue/policy';
import { formatFileName } from '@/lib/shared/time';

export function sendPhoto(
  rec: Pick<PhotoRecord, 'photoId' | 'capturedAt' | 'bytes'>,
  consentVersion: string,
  onProgress?: (fraction: number) => void,
  timeoutMs = 45_000,
): Promise<SendResult> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append('photoId', rec.photoId);
    form.append('capturedAt', rec.capturedAt);
    form.append('consentVersion', consentVersion);
    form.append('image', new Blob([rec.bytes], { type: 'image/jpeg' }), formatFileName(new Date(rec.capturedAt), rec.photoId));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.timeout = timeoutMs;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let code: string | undefined;
      try {
        code = (JSON.parse(xhr.responseText) as { code?: string }).code;
      } catch {
        code = undefined;
      }
      resolve({ status: xhr.status, code });
    };
    const networkFailure = () => resolve({ status: null });
    xhr.onerror = networkFailure;
    xhr.ontimeout = networkFailure;
    xhr.onabort = networkFailure;
    xhr.send(form);
  });
}
```

- [ ] **Step 6: Implement `lib/queue/useQueue.ts`**

```ts
'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { pendingCount, shotsUsed, type PhotoRecord } from '@/lib/queue/policy';
import { openPhotoStore, type PhotoStore } from '@/lib/queue/store';
import { UploadWorker } from '@/lib/queue/worker';
import { sendPhoto } from '@/lib/upload/client';

type Options = { consentVersion: string | null; uploadCloseAt: number | null; onConsentRequired: () => void };

export type QueueApi = {
  ready: boolean;
  storageError: string | null;
  records: PhotoRecord[];
  shotsUsed: number;
  pending: number;
  add(input: { photoId: string; capturedAt: string; bytes: ArrayBuffer }): Promise<void>;
  retryNow(): void;
  progress(photoId: string): number | undefined;
};

export function useQueue({ consentVersion, uploadCloseAt, onConsentRequired }: Options): QueueApi {
  const [records, setRecords] = useState<PhotoRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const storeRef = useRef<PhotoStore | null>(null);
  const workerRef = useRef<UploadWorker | null>(null);
  const latest = useRef({ consentVersion, onConsentRequired });
  latest.current = { consentVersion, onConsentRequired };

  useEffect(() => {
    if (!consentVersion || uploadCloseAt === null) return;
    let disposed = false;

    (async () => {
      let store: PhotoStore;
      try {
        store = await openPhotoStore();
      } catch {
        setStorageError('This browser cannot store photos. Turn off private browsing, then reload.');
        return;
      }
      if (disposed) return;
      storeRef.current = store;
      const refresh = async () => {
        if (!disposed) setRecords(await store.all());
      };
      const worker = new UploadWorker({
        store,
        send: (rec, onProgress) => sendPhoto(rec, latest.current.consentVersion ?? '', onProgress),
        now: Date.now,
        uploadCloseAt,
        onChange: () => void refresh(),
        onProgress: rerender,
        onConsentRequired: () => latest.current.onConsentRequired(),
      });
      workerRef.current = worker;
      await worker.recover();
      await refresh();
      setReady(true);
      void worker.kick();
    })();

    const kick = () => void workerRef.current?.kick();
    const onVisible = () => {
      if (!document.hidden) kick();
    };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', onVisible);
      workerRef.current?.dispose();
      workerRef.current = null;
    };
  }, [consentVersion, uploadCloseAt]);

  const add = useCallback(async (input: { photoId: string; capturedAt: string; bytes: ArrayBuffer }) => {
    const store = storeRef.current;
    if (!store) throw new Error('Photo storage is not ready yet. Try again in a moment.');
    await store.put({ ...input, createdAt: Date.now(), status: 'developing', attempts: 0, nextAttemptAt: 0 });
    setRecords(await store.all());
    void workerRef.current?.kick();
  }, []);

  const retryNow = useCallback(() => void workerRef.current?.retryNow(), []);
  const progress = useCallback((photoId: string) => workerRef.current?.getProgress(photoId), []);

  return { ready, storageError, records, shotsUsed: shotsUsed(records), pending: pendingCount(records), add, retryNow, progress };
}
```

- [ ] **Step 7: Verify and commit**

Run: `npm run typecheck && npx vitest run lib/queue`
Expected: no type errors; 17 passed.

```bash
git add lib/queue lib/upload
git commit -m "feat: one-at-a-time upload worker with retries and queue hook"
```

---

### Task 10: Event key, device ID and consent on the phone

**Files:**
- Create: `lib/client/identity.ts`, `lib/client/identity.test.ts`, `lib/client/consent.ts`, `lib/client/consent.test.ts`, `lib/copy/notice.ts`

**Interfaces:**
- Consumes: `COOKIE_KEY`, `COOKIE_DEVICE`, `parseCookieString`, `serializeCookie` (Task 3).
- Produces:
  - `takeEventKeyFromUrl(href: string): { key: string | null; cleanUrl: string }`
  - `initIdentity(win?: Window): { hasKey: boolean; keyLink: string | null }` — stores `?k=` in the `nf26_key` cookie (3 days), strips it from the address bar, creates `nf26_device` (30 days) if missing. `keyLink` is the full QR link, for the "Open in Safari or Chrome" copy button.
  - `hasConsent(version, storage?)`, `acceptConsent(version, storage?)`, `clearConsent(storage?)`; key `nf26.consent`
  - `NOTICE_EN`, `NOTICE_ID`, `NOTICE_AGREE` strings

- [ ] **Step 1: Write the failing tests**

`lib/client/identity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { takeEventKeyFromUrl } from '@/lib/client/identity';

describe('takeEventKeyFromUrl', () => {
  it('extracts the key and removes it from the URL', () => {
    expect(takeEventKeyFromUrl('https://cam.example/?k=abc123&x=1#top')).toEqual({ key: 'abc123', cleanUrl: '/?x=1#top' });
  });
  it('returns null when there is no key', () => {
    expect(takeEventKeyFromUrl('https://cam.example/privacy')).toEqual({ key: null, cleanUrl: '/privacy' });
    expect(takeEventKeyFromUrl('https://cam.example/?k=%20')).toEqual({ key: null, cleanUrl: '/' });
  });
});
```

`lib/client/consent.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { acceptConsent, clearConsent, hasConsent } from '@/lib/client/consent';

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  };
}

describe('consent', () => {
  it('remembers the accepted version only', () => {
    const s = memory();
    expect(hasConsent('2026-10-v1', s)).toBe(false);
    acceptConsent('2026-10-v1', s);
    expect(hasConsent('2026-10-v1', s)).toBe(true);
    expect(hasConsent('2026-11-v2', s)).toBe(false);
    clearConsent(s);
    expect(hasConsent('2026-10-v1', s)).toBe(false);
  });

  it('treats a storage error as no consent', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(hasConsent('2026-10-v1', broken)).toBe(false);
    expect(() => acceptConsent('2026-10-v1', broken)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/client`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/client/identity.ts`:

```ts
import { COOKIE_DEVICE, COOKIE_KEY, parseCookieString, serializeCookie } from '@/lib/shared/cookies';

const THREE_DAYS = 3 * 24 * 60 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export function takeEventKeyFromUrl(href: string): { key: string | null; cleanUrl: string } {
  const url = new URL(href);
  const raw = url.searchParams.get('k');
  url.searchParams.delete('k');
  const key = raw && raw.trim() ? raw.trim() : null;
  return { key, cleanUrl: `${url.pathname}${url.search}${url.hash}` };
}

export function initIdentity(win: Window = window): { hasKey: boolean; keyLink: string | null } {
  const secure = win.location.protocol === 'https:';
  const { key, cleanUrl } = takeEventKeyFromUrl(win.location.href);
  if (key) {
    win.document.cookie = serializeCookie(COOKIE_KEY, key, THREE_DAYS, secure);
    win.history.replaceState(win.history.state, '', cleanUrl);
  }
  if (!parseCookieString(win.document.cookie)[COOKIE_DEVICE]) {
    win.document.cookie = serializeCookie(COOKIE_DEVICE, crypto.randomUUID(), THIRTY_DAYS, secure);
  }
  const stored = parseCookieString(win.document.cookie)[COOKIE_KEY] ?? null;
  return {
    hasKey: Boolean(stored),
    keyLink: stored ? `${win.location.origin}/?k=${encodeURIComponent(stored)}` : null,
  };
}
```

`lib/client/consent.ts`:

```ts
const KEY = 'nf26.consent';

function storage(s?: Storage): Storage | null {
  if (s) return s;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasConsent(version: string, s?: Storage): boolean {
  try {
    return storage(s)?.getItem(KEY) === version;
  } catch {
    return false;
  }
}

export function acceptConsent(version: string, s?: Storage): void {
  try {
    storage(s)?.setItem(KEY, version);
  } catch {
    // Private mode: the notice will simply show again next visit.
  }
}

export function clearConsent(s?: Storage): void {
  try {
    storage(s)?.removeItem(KEY);
  } catch {
    // ignore
  }
}
```

`lib/copy/notice.ts` (wording from the spec; HR's PDP owner must approve before launch):

```ts
export const NOTICE_EN =
  'Photos you confirm are saved to a private NGI HR archive for NourishFest 2026 only. They are not posted publicly or shared outside HR, and are deleted after 12 months (by 8 Dec 2027). Only photograph people who are happy to be photographed. Anyone can ask HR to delete a photo they appear in.';

export const NOTICE_ID =
  'Foto yang kamu konfirmasi disimpan di arsip privat HR NGI khusus untuk dokumentasi NourishFest 2026. Foto tidak dipublikasikan atau dibagikan di luar tim HR, dan dihapus setelah 12 bulan (paling lambat 8 Des 2027). Hanya foto orang yang bersedia difoto. Siapa pun dapat meminta HR menghapus foto yang menampilkan dirinya.';

export const NOTICE_AGREE = 'I understand and agree / Saya mengerti dan setuju';
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/client`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/client lib/copy
git commit -m "feat: QR event key, device ID cookie and consent storage"
```

---

### Task 11: Screen state machine

**Files:**
- Create: `lib/app/machine.ts`, `lib/app/machine.test.ts`

**Interfaces:**
- Consumes: `BlockReason` (Task 6).
- Produces:
  - `type Screen = 'welcome' | 'notice' | 'access' | 'camera' | 'preview' | 'roll' | 'blocked'`
  - `type AppState = { screen: Screen; blockReason?: BlockReason; rollReturn: 'camera' | 'blocked'; afterNotice: 'access' | 'camera' }`
  - `type AppEvent = { type: 'START'; consentOk: boolean } | { type: 'CONSENT_ACCEPTED' } | { type: 'ACCESS_CONTINUE' } | { type: 'BLOCK'; reason: BlockReason } | { type: 'RETRY_CAMERA' } | { type: 'CAPTURED' } | { type: 'RETAKE' } | { type: 'CONFIRMED' } | { type: 'OPEN_ROLL' } | { type: 'CLOSE_ROLL' } | { type: 'CONSENT_REQUIRED' } | { type: 'EXIT' }`
  - `initialState: AppState`; `reduce(state, event): AppState`

- [ ] **Step 1: Write the failing test**

`lib/app/machine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppEvent, type AppState } from '@/lib/app/machine';

const run = (events: AppEvent[], from: AppState = initialState) => events.reduce(reduce, from);

describe('screen machine', () => {
  it('first visit: welcome → notice → access → camera', () => {
    expect(run([{ type: 'START', consentOk: false }]).screen).toBe('notice');
    expect(run([{ type: 'START', consentOk: false }, { type: 'CONSENT_ACCEPTED' }]).screen).toBe('access');
    expect(
      run([{ type: 'START', consentOk: false }, { type: 'CONSENT_ACCEPTED' }, { type: 'ACCESS_CONTINUE' }]).screen,
    ).toBe('camera');
  });

  it('returning visit skips the notice', () => {
    expect(run([{ type: 'START', consentOk: true }]).screen).toBe('access');
  });

  it('shoot loop: camera → preview → camera', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    expect(reduce(cam, { type: 'CAPTURED' }).screen).toBe('preview');
    expect(run([{ type: 'CAPTURED' }, { type: 'RETAKE' }], cam).screen).toBe('camera');
    expect(run([{ type: 'CAPTURED' }, { type: 'CONFIRMED' }], cam).screen).toBe('camera');
  });

  it('roll returns to where it was opened', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    expect(run([{ type: 'OPEN_ROLL' }, { type: 'CLOSE_ROLL' }], cam).screen).toBe('camera');
    const closed = reduce(initialState, { type: 'BLOCK', reason: 'closed' });
    const back = run([{ type: 'OPEN_ROLL' }, { type: 'CLOSE_ROLL' }], closed);
    expect(back).toMatchObject({ screen: 'blocked', blockReason: 'closed' });
  });

  it('blocked screens carry their reason and can retry the camera', () => {
    const denied = reduce(initialState, { type: 'BLOCK', reason: 'denied' });
    expect(denied).toMatchObject({ screen: 'blocked', blockReason: 'denied' });
    expect(reduce(denied, { type: 'RETRY_CAMERA' }).screen).toBe('access');
  });

  it('a consent request mid-event shows the notice, then goes straight back to the camera', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    const notice = reduce(cam, { type: 'CONSENT_REQUIRED' });
    expect(notice.screen).toBe('notice');
    expect(reduce(notice, { type: 'CONSENT_ACCEPTED' }).screen).toBe('camera');
  });

  it('exit returns to welcome from anywhere', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    expect(reduce(cam, { type: 'EXIT' })).toEqual(initialState);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/app/machine.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `lib/app/machine.ts`**

```ts
import type { BlockReason } from '@/lib/camera/support';

export type Screen = 'welcome' | 'notice' | 'access' | 'camera' | 'preview' | 'roll' | 'blocked';

export type AppState = {
  screen: Screen;
  blockReason?: BlockReason;
  rollReturn: 'camera' | 'blocked';
  afterNotice: 'access' | 'camera';
};

export type AppEvent =
  | { type: 'START'; consentOk: boolean }
  | { type: 'CONSENT_ACCEPTED' }
  | { type: 'ACCESS_CONTINUE' }
  | { type: 'BLOCK'; reason: BlockReason }
  | { type: 'RETRY_CAMERA' }
  | { type: 'CAPTURED' }
  | { type: 'RETAKE' }
  | { type: 'CONFIRMED' }
  | { type: 'OPEN_ROLL' }
  | { type: 'CLOSE_ROLL' }
  | { type: 'CONSENT_REQUIRED' }
  | { type: 'EXIT' };

export const initialState: AppState = { screen: 'welcome', rollReturn: 'camera', afterNotice: 'access' };

export function reduce(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'START':
      return { ...state, screen: event.consentOk ? 'access' : 'notice', afterNotice: 'access', blockReason: undefined };
    case 'CONSENT_ACCEPTED':
      return { ...state, screen: state.afterNotice };
    case 'ACCESS_CONTINUE':
    case 'RETAKE':
    case 'CONFIRMED':
      return { ...state, screen: 'camera' };
    case 'BLOCK':
      return { ...state, screen: 'blocked', blockReason: event.reason };
    case 'RETRY_CAMERA':
      return { ...state, screen: 'access', blockReason: undefined };
    case 'CAPTURED':
      return { ...state, screen: 'preview' };
    case 'OPEN_ROLL':
      return { ...state, screen: 'roll', rollReturn: state.screen === 'blocked' ? 'blocked' : 'camera' };
    case 'CLOSE_ROLL':
      return { ...state, screen: state.rollReturn };
    case 'CONSENT_REQUIRED':
      return { ...state, screen: 'notice', afterNotice: 'camera' };
    case 'EXIT':
      return initialState;
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run lib/app`
Expected: 9 passed (7 new + 2 preflight).

- [ ] **Step 5: Commit**

```bash
git add lib/app
git commit -m "feat: screen state machine"
```

---

### Task 12: UI kit, entry screens and privacy page

**Files:**
- Create: `components/ui/Button.tsx`, `components/screens/Welcome.tsx`, `components/screens/Notice.tsx`, `components/screens/Access.tsx`, `components/screens/Blocked.tsx`, `app/privacy/page.tsx`

**Interfaces:**
- Consumes: `BlockReason` (6), `NOTICE_EN`, `NOTICE_ID`, `NOTICE_AGREE` (10), `formatWitaShort` (3).
- Produces (props are the contract Task 14 wires up):
  - `Button(props: ButtonHTMLAttributes & { variant?: 'primary' | 'ghost' })`
  - `Welcome({ onStart, disabled, message }: { onStart(): void; disabled: boolean; message: string | null })`
  - `Notice({ onAccept }: { onAccept(): void })`
  - `Access({ onContinue }: { onContinue(): void })`
  - `Blocked({ reason, cameraOpenAt, uploadCloseAt, keyLink, onRetry, onOpenRoll }: { reason: BlockReason; cameraOpenAt: Date | null; uploadCloseAt: Date | null; keyLink: string | null; onRetry(): void; onOpenRoll(): void })`

UI direction: the app is the camera body. Ink-black ground, cream text, gold for actions, Bungee only for headings, Oswald for labels and buttons, system sans for running text. Touch targets ≥ 48 px. No emoji.

- [ ] **Step 1: `components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gold text-ink hover:brightness-110 active:brightness-95',
  ghost: 'border border-cream/40 text-cream hover:border-cream',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      {...rest}
      className={`min-h-12 rounded-full px-6 font-label text-lg uppercase tracking-wider transition disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${VARIANTS[variant]} ${className}`}
    />
  );
}
```

- [ ] **Step 2: `components/screens/Welcome.tsx`**

```tsx
import { Button } from '@/components/ui/Button';

export function Welcome({ onStart, disabled, message }: { onStart: () => void; disabled: boolean; message: string | null }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between gap-10 px-6 py-10">
      <header className="space-y-3">
        <p className="font-label text-sm tracking-[0.3em] text-gold">NOURISHFEST 2026 · 08.12.2026</p>
        <h1 className="font-display text-5xl leading-[0.95] text-cream">
          Digital
          <br />
          Candid
          <br />
          Cam
        </h1>
        <p className="font-label text-lg text-green">#MoveInUnity</p>
      </header>

      <ol className="space-y-4 font-label text-lg leading-snug">
        <li>
          <span className="text-gold">1 · Shoot.</span> You have 15 shots. Retakes are free.
        </li>
        <li>
          <span className="text-gold">2 · Check.</span> Pick a film look, then confirm.
        </li>
        <li>
          <span className="text-gold">3 · Save.</span> Confirmed photos go to the NourishFest archive. Save your own copy any time.
        </li>
      </ol>

      <div className="space-y-4">
        <Button onClick={onStart} disabled={disabled} className="w-full">
          Start shooting
        </Button>
        {message ? (
          <p role="alert" className="text-center text-sm text-pink">
            {message}
          </p>
        ) : (
          <p className="text-center text-sm text-muted">Weak Wi-Fi? Mobile data works better.</p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `components/screens/Notice.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { NOTICE_AGREE, NOTICE_EN, NOTICE_ID } from '@/lib/copy/notice';

export function Notice({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-3xl text-cream">Before you shoot</h1>
      <p className="leading-relaxed">{NOTICE_EN}</p>
      <p lang="id" className="leading-relaxed text-cream/75">
        {NOTICE_ID}
      </p>
      <a href="/privacy" className="font-label text-gold underline underline-offset-4">
        Read the full privacy notice
      </a>
      <label htmlFor="consent" className="flex min-h-12 items-start gap-3 rounded-xl border border-cream/20 p-4">
        <input
          id="consent"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 size-6 shrink-0 accent-[#D4AF37]"
        />
        <span>{NOTICE_AGREE}</span>
      </label>
      <Button onClick={onAccept} disabled={!agreed} className="mt-auto w-full">
        Continue
      </Button>
    </main>
  );
}
```

- [ ] **Step 4: `components/screens/Access.tsx`**

```tsx
import { Button } from '@/components/ui/Button';

export function Access({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h1 className="font-display text-3xl text-cream">Allow the camera</h1>
      <p className="leading-relaxed">
        Your phone will ask to use the camera. Tap <strong>Allow</strong>. Nothing is saved until you press the shutter and
        confirm a photo.
      </p>
      <Button onClick={onContinue} className="w-full">
        Open camera
      </Button>
    </main>
  );
}
```

- [ ] **Step 5: `components/screens/Blocked.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { BlockReason } from '@/lib/camera/support';
import { formatWitaShort } from '@/lib/shared/time';

type Props = {
  reason: BlockReason;
  cameraOpenAt: Date | null;
  uploadCloseAt: Date | null;
  keyLink: string | null;
  onRetry: () => void;
  onOpenRoll: () => void;
};

export function Blocked({ reason, cameraOpenAt, uploadCloseAt, keyLink, onRetry, onOpenRoll }: Props) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  const copyLink = async () => {
    if (!keyLink) return;
    try {
      await navigator.clipboard.writeText(keyLink);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  const copy: Record<BlockReason, { title: string; body: React.ReactNode; action?: React.ReactNode }> = {
    in_app: {
      title: 'Open in Safari or Chrome',
      body: "This app's built-in browser can't use the camera. Copy the link, then paste it into Safari or Chrome.",
      action: keyLink ? (
        <>
          <Button onClick={copyLink} className="w-full">
            {copied === 'done' ? 'Link copied' : 'Copy link'}
          </Button>
          {copied === 'failed' && <p className="select-all break-all text-sm text-muted">{keyLink}</p>}
        </>
      ) : null,
    },
    no_key: {
      title: 'Scan the QR code',
      body: 'Open the camera by scanning a NourishFest QR code at the venue.',
    },
    no_camera: {
      title: "This device can't open the camera",
      body: 'Try a phone with Safari or Chrome.',
    },
    denied: {
      title: 'Camera access is off',
      body: (
        <ul className="list-disc space-y-2 pl-5">
          <li>iPhone: tap aA in the address bar, then Website Settings, Camera, Allow. Reload the page.</li>
          <li>Android: tap the icon left of the address, then Permissions, Camera, Allow. Reload the page.</li>
        </ul>
      ),
      action: (
        <Button onClick={onRetry} className="w-full">
          Try again
        </Button>
      ),
    },
    busy: {
      title: 'Your camera is busy',
      body: 'Close other apps that use the camera, then try again.',
      action: (
        <Button onClick={onRetry} className="w-full">
          Try again
        </Button>
      ),
    },
    not_open: {
      title: cameraOpenAt ? `Camera opens ${formatWitaShort(cameraOpenAt)}` : 'Camera opens soon',
      body: 'Come back when NourishFest starts.',
    },
    closed: {
      title: 'The roll is closed',
      body: uploadCloseAt
        ? `Thanks for shooting. Photos still sending will keep trying until ${formatWitaShort(uploadCloseAt)}. Keep this page open.`
        : 'Thanks for shooting.',
      action: (
        <Button onClick={onOpenRoll} variant="ghost" className="w-full">
          View my roll
        </Button>
      ),
    },
  };

  const c = copy[reason];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h1 className="font-display text-3xl text-cream">{c.title}</h1>
      <div className="leading-relaxed">{c.body}</div>
      {c.action && <div className="space-y-3">{c.action}</div>}
    </main>
  );
}
```

- [ ] **Step 6: `app/privacy/page.tsx`**

```tsx
import { NOTICE_EN, NOTICE_ID } from '@/lib/copy/notice';

export const metadata = { title: "Privacy · NF'26 Candid Cam" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-prose space-y-6 px-6 py-10 leading-relaxed">
      <h1 className="font-display text-3xl text-cream">Privacy notice</h1>
      <p>{NOTICE_EN}</p>
      <p lang="id" className="text-cream/75">
        {NOTICE_ID}
      </p>

      <h2 className="font-label text-xl text-gold">What is stored</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>The framed photo you confirm</li>
        <li>When it was taken and uploaded</li>
        <li>The privacy notice version you accepted</li>
        <li>A random ID for this browser, used only to limit uploads per phone</li>
      </ul>

      <h2 className="font-label text-xl text-gold">What is not stored</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your name, employee ID or phone number</li>
        <li>Your location (photo location data is removed before upload)</li>
        <li>Anything else from your phone</li>
      </ul>

      <h2 className="font-label text-xl text-gold">Who can see the photos</h2>
      <p>Only the NGI HR team, in a private Google Shared Drive. Photos are not posted publicly or shared in internal channels.</p>

      <h2 className="font-label text-xl text-gold">How long they are kept</h2>
      <p>12 months. All photos are deleted by 8 December 2027.</p>

      <h2 className="font-label text-xl text-gold">Asking for a photo to be deleted</h2>
      <p>Tell the NGI HR team which photo it is (the time it was taken helps). HR will delete it from the archive.</p>

      <a href="/" className="inline-block font-label text-gold underline underline-offset-4">
        Back to the camera
      </a>
    </main>
  );
}
```

- [ ] **Step 7: Verify and commit**

Run: `npm run typecheck && npm run lint`
Expected: no errors. Open `http://localhost:3000/privacy` on a phone-width window: text readable, no horizontal scroll.

```bash
git add components/ui components/screens app/privacy
git commit -m "feat: welcome, notice, access and blocked screens and privacy page"
```

---

### Task 13: Live camera — stream hook, capture and camera screen (M1 gate)

**Files:**
- Create: `lib/camera/capture.ts`, `lib/camera/useCamera.ts`, `lib/client/useNow.ts`, `components/screens/Camera.tsx`

**Interfaces:**
- Consumes: `coverCrop` (6), `mapCameraError`, `BlockReason` (6), `PHOTO` (7), `formatStamp` (3).
- Produces:
  - `captureFrame(video: HTMLVideoElement): HTMLCanvasElement` → 1200×1600, un-mirrored, centre-cropped to 3:4
  - `useCamera(videoRef, active: boolean): CameraApi` where `CameraApi = { status: 'idle' | 'starting' | 'live' | 'error'; error: BlockReason | null; facing: 'user' | 'environment'; hasMultiple: boolean; torchAvailable: boolean; torchOn: boolean; flip(): void; setTorch(on: boolean): void }`
  - `useNow(intervalMs: number): Date`
  - `Camera(props: { active: boolean; shotsLeft: number; total: number; lastPhotoUrl: string | null; onCaptured(photo: HTMLCanvasElement, capturedAt: Date): void; onOpenRoll(): void; onBlock(reason: BlockReason): void; onExit(): void })`

Camera code depends on real hardware, so it is verified on devices (Step 5), not by unit tests. The pure parts it relies on (crop, error mapping) are already tested in Task 6.

- [ ] **Step 1: `lib/camera/capture.ts`**

```ts
import { coverCrop } from '@/lib/camera/crop';
import { PHOTO } from '@/lib/image/frameLayout';

/**
 * Grabs the current video frame as a 1200×1600 canvas.
 * The raw frame is never mirrored (only the on-screen preview is), so text in the photo reads correctly.
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO.width;
  canvas.height = PHOTO.height;
  const ctx = canvas.getContext('2d')!;
  const { sx, sy, sw, sh } = coverCrop(video.videoWidth, video.videoHeight, PHOTO.width / PHOTO.height);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO.width, PHOTO.height);
  return canvas;
}
```

- [ ] **Step 2: `lib/camera/useCamera.ts`**

```ts
'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { mapCameraError, type BlockReason } from '@/lib/camera/support';

export type Facing = 'user' | 'environment';

export type CameraApi = {
  status: 'idle' | 'starting' | 'live' | 'error';
  error: BlockReason | null;
  facing: Facing;
  hasMultiple: boolean;
  torchAvailable: boolean;
  torchOn: boolean;
  flip(): void;
  setTorch(on: boolean): void;
};

const FACING_KEY = 'nf26.facing';
const IDEAL = { width: { ideal: 1920 }, height: { ideal: 1440 }, aspectRatio: { ideal: 4 / 3 } };

function savedFacing(): Facing {
  try {
    return window.localStorage.getItem(FACING_KEY) === 'environment' ? 'environment' : 'user';
  } catch {
    return 'user';
  }
}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, active: boolean): CameraApi {
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  // The camera screen only mounts after a tap, never during server rendering, so reading storage here is safe.
  const [facing, setFacing] = useState<Facing>(savedFacing);
  const [status, setStatus] = useState<CameraApi['status']>('idle');
  const [error, setError] = useState<BlockReason | null>(null);
  const [hasMultiple, setHasMultiple] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
  }, [videoRef]);

  const start = useCallback(
    async (want: Facing) => {
      const request = ++requestRef.current;
      stopTracks(); // iOS allows only one camera stream at a time
      setStatus('starting');
      setError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: want, ...IDEAL }, audio: false });
      } catch (first) {
        const mapped = mapCameraError(first);
        if (mapped !== 'retry_relaxed') {
          setStatus('error');
          setError(mapped);
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: want }, audio: false });
        } catch (second) {
          const again = mapCameraError(second);
          setStatus('error');
          setError(again === 'retry_relaxed' ? 'no_camera' : again);
          return;
        }
      }

      if (request !== requestRef.current) {
        stream.getTracks().forEach((t) => t.stop()); // a newer start() or a stop() won
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }

      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
      setHasMultiple(devices.filter((d) => d.kind === 'videoinput').length > 1);
      const track = stream.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
      setTorchAvailable(want === 'environment' && caps.torch === true);
      try {
        window.localStorage.setItem(FACING_KEY, want);
      } catch {
        // ignore
      }
      setStatus('live');
    },
    [stopTracks, videoRef],
  );

  const stop = useCallback(() => {
    requestRef.current += 1;
    stopTracks();
    setStatus('idle');
  }, [stopTracks]);

  useEffect(() => {
    const sync = () => {
      if (active && !document.hidden) void start(facing);
      else stop();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      stop();
    };
  }, [active, facing, start, stop]);

  const flip = useCallback(() => setFacing((f) => (f === 'user' ? 'environment' : 'user')), []);

  const setTorch = useCallback((on: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track
      .applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
      .then(() => setTorchOn(on))
      .catch(() => setTorchAvailable(false));
  }, []);

  return { status, error, facing, hasMultiple, torchAvailable, torchOn, flip, setTorch };
}
```

- [ ] **Step 3: `lib/client/useNow.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';

export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

- [ ] **Step 4: `components/screens/Camera.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { captureFrame } from '@/lib/camera/capture';
import type { BlockReason } from '@/lib/camera/support';
import { useCamera } from '@/lib/camera/useCamera';
import { useNow } from '@/lib/client/useNow';
import { formatStamp } from '@/lib/shared/time';

type Props = {
  active: boolean;
  shotsLeft: number;
  total: number;
  lastPhotoUrl: string | null;
  onCaptured: (photo: HTMLCanvasElement, capturedAt: Date) => void;
  onOpenRoll: () => void;
  onBlock: (reason: BlockReason) => void;
  onExit: () => void;
};

const TIMERS = [0, 3, 10] as const;
type Timer = (typeof TIMERS)[number];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Bracket({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute size-8 border-paper ${className}`} />;
}

export function Camera({ active, shotsLeft, total, lastPhotoUrl, onCaptured, onOpenRoll, onBlock, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cam = useCamera(videoRef, active);
  const now = useNow(15_000);
  const [timer, setTimer] = useState<Timer>(0);
  const [count, setCount] = useState<number | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [whiteout, setWhiteout] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cam.status === 'error' && cam.error) onBlock(cam.error);
  }, [cam.status, cam.error, onBlock]);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const shoot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || cam.status !== 'live' || shotsLeft <= 0) return;
    const lightFace = screenFlash && cam.facing === 'user';
    if (lightFace) {
      setWhiteout(true);
      await wait(180); // let the white screen light the face before the frame is taken
    }
    const capturedAt = new Date();
    const photo = captureFrame(video);
    setWhiteout(false);
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 160);
    onCaptured(photo, capturedAt);
  }, [cam.status, cam.facing, screenFlash, shotsLeft, onCaptured]);

  const onShutter = () => {
    if (count !== null) return;
    if (timer === 0) return void shoot();
    let left: number = timer;
    setCount(left);
    countdownRef.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCount(null);
        void shoot();
      } else {
        setCount(left);
      }
    }, 1000);
  };

  const nextTimer = () => setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length]!);
  const empty = shotsLeft <= 0;
  const flashOn = cam.facing === 'user' ? screenFlash : cam.torchOn;
  const canFlash = cam.facing === 'user' || cam.torchAvailable;

  return (
    <main className="relative flex h-dvh flex-col bg-ink">
      <header className="flex items-center justify-between px-4 py-2 font-label">
        <button
          type="button"
          onClick={onExit}
          aria-label="Close camera"
          className="grid size-12 place-items-center rounded-full text-cream focus-visible:outline-2 focus-visible:outline-gold"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="font-display text-gold">NF&apos;26</span>
        <span aria-live="polite" className={`min-w-16 text-right text-lg ${empty ? 'text-pink' : 'text-green'}`}>
          {shotsLeft} EXP
        </span>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div className="relative aspect-[3/4] h-full max-h-full max-w-full overflow-hidden rounded-2xl border-2 border-gold bg-body">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`size-full object-cover ${cam.facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <Bracket className="left-4 top-4 border-l-[3px] border-t-[3px]" />
          <Bracket className="right-4 top-4 border-r-[3px] border-t-[3px]" />
          <Bracket className="bottom-4 left-4 border-b-[3px] border-l-[3px]" />
          <Bracket className="bottom-4 right-4 border-b-[3px] border-r-[3px]" />
          <span className="absolute bottom-5 left-14 font-label text-green drop-shadow">{formatStamp(now)}</span>
          {cam.status === 'starting' && (
            <span className="absolute inset-0 grid place-items-center font-label text-cream/70">Opening camera…</span>
          )}
          {count !== null && (
            <span aria-live="assertive" className="absolute inset-0 grid place-items-center font-display text-8xl text-cream drop-shadow-lg">
              {count}
            </span>
          )}
          {empty && (
            <div className="absolute inset-0 grid place-items-center bg-ink/80 p-6 text-center">
              <p className="font-label text-xl text-cream">
                Roll finished. All {total} shots are in My Roll.
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="grid grid-cols-3 items-center gap-2 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={nextTimer}
            aria-label={`Self-timer: ${timer === 0 ? 'off' : `${timer} seconds`}`}
            className="min-h-12 min-w-12 rounded-full border border-cream/30 px-3 font-label text-cream"
          >
            {timer === 0 ? 'Timer off' : `${timer}s`}
          </button>
          {canFlash && (
            <button
              type="button"
              onClick={() => (cam.facing === 'user' ? setScreenFlash((v) => !v) : cam.setTorch(!cam.torchOn))}
              aria-pressed={flashOn}
              aria-label={cam.facing === 'user' ? 'Screen flash' : 'Torch'}
              className={`grid size-12 place-items-center rounded-full border ${flashOn ? 'border-gold text-gold' : 'border-cream/30 text-cream'}`}
            >
              <svg width="16" height="28" viewBox="0 0 16 28" aria-hidden="true">
                <path d="M3 1h8L6 12h7L4 27l3-12H1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onShutter}
            disabled={empty || cam.status !== 'live' || count !== null}
            aria-label="Take photo"
            className="size-20 rounded-full border-4 border-cream bg-gold shadow-[inset_0_0_0_4px_#0D0D0D] transition active:scale-95 disabled:opacity-40"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {cam.hasMultiple && (
            <button
              type="button"
              onClick={cam.flip}
              aria-label={cam.facing === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
              className="grid size-12 place-items-center rounded-full border border-cream/30 text-cream"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2" strokeLinecap="round" />
                <path d="M20 4v4h-4M4 20v-4h4" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenRoll}
            aria-label="Open My Roll"
            className="size-12 overflow-hidden rounded-lg border border-cream/40 bg-body"
          >
            {lastPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lastPhotoUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="font-label text-xs text-cream/60">ROLL</span>
            )}
          </button>
        </div>
      </footer>

      {whiteout && <div aria-hidden="true" className="fixed inset-0 z-50 bg-white" />}
      {shutterFlash && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 bg-white/80" />}
    </main>
  );
}
```

- [ ] **Step 5: Device check (needs Task 14's wiring to reach this screen; run it at the end of Task 14 and record results here)**

On a real iPhone (Safari) and a mid-range Android (Chrome), from a Netlify preview deploy (HTTPS):

| Check | Expected |
| --- | --- |
| First open | Browser asks for the camera once; preview appears within 2 s |
| Front camera preview | Mirrored on screen |
| Flip | Switches lens; flip button hidden on a one-camera device |
| Torch (Android, back lens) | Turns the phone light on and off; hidden on iPhone |
| Screen flash (front lens) | Screen turns white briefly before the shot |
| Timer 3 s / 10 s | Big countdown, then one shot |
| Deny permission | "Camera access is off" screen with phone-specific steps |
| Lock screen, unlock | Preview resumes without a new permission prompt (iOS may re-prompt once; acceptable) |
| Open link inside Instagram | "Open in Safari or Chrome" screen; Copy link works |

- [ ] **Step 6: Commit**

```bash
npm run typecheck && npm run lint
git add lib/camera lib/client/useNow.ts components/screens/Camera.tsx
git commit -m "feat: live camera with flip, torch, screen flash and self-timer"
```

---

### Task 14: Preview, My Roll and app wiring (M2 + M4 gates)

**Files:**
- Create: `lib/client/save.ts`, `lib/client/useObjectUrl.ts`, `components/screens/Preview.tsx`, `components/screens/Roll.tsx`, `components/PendingBanner.tsx`, `components/CandidCamApp.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: everything above. Key names: `reduce`, `initialState` (11); `preflight` (6); `useQueue` (9); `initIdentity`, `hasConsent`, `acceptConsent`, `clearConsent` (10); `composeFrame`, `ensureFrameFonts`, `FILTERS`, `encodeJpeg`, `canvasToBlob` (7); `formatShot`, `formatStamp`, `formatFileName` (3); `PublicStatus` (3); screens (12, 13).
- Produces:
  - `savePhoto(blob: Blob, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'>`
  - `useObjectUrl(id: string | null, bytes: ArrayBuffer | null): string | null`
  - `Preview({ photo, capturedAt, shotNumber, total, onRetake, onConfirm })`, `Roll({ records, total, progress, onClose, onRetryNow })`, `PendingBanner({ count })`, `CandidCamApp()`

- [ ] **Step 1: `lib/client/save.ts`**

```ts
/** Share sheet first (on iPhone it offers "Save Image" to Photos), then a normal download. */
export async function savePhoto(blob: Blob, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
```

- [ ] **Step 2: `lib/client/useObjectUrl.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';

/** Object URL for stored photo bytes. Keyed by photo ID so store refreshes don't recreate it. */
export function useObjectUrl(id: string | null, bytes: ArrayBuffer | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id || !bytes) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bytes for a photo ID never change
  }, [id]);
  return url;
}
```

- [ ] **Step 3: `components/screens/Preview.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { composeFrame } from '@/lib/image/compose';
import { canvasToBlob, encodeJpeg } from '@/lib/image/encode';
import { FILTERS } from '@/lib/image/filters';
import { ensureFrameFonts } from '@/lib/image/fonts';
import { formatFileName, formatShot, formatStamp } from '@/lib/shared/time';

type Props = {
  photo: HTMLCanvasElement;
  capturedAt: Date;
  shotNumber: number;
  total: number;
  onRetake: () => void;
  onConfirm: (input: { photoId: string; bytes: ArrayBuffer }) => Promise<void>;
};

export function Preview({ photo, capturedAt, shotNumber, total, onRetake, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoId = useMemo(() => crypto.randomUUID(), []);
  const [filterIndex, setFilterIndex] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState<null | 'confirm' | 'save'>(null);
  const [error, setError] = useState<string | null>(null);
  const swipeStart = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    void ensureFrameFonts().then(() => {
      if (cancelled || !canvasRef.current) return;
      composeFrame(canvasRef.current, {
        photo,
        filter: FILTERS[filterIndex]!,
        shotLabel: formatShot(shotNumber, total),
        stamp: formatStamp(capturedAt),
      });
      setRendering(false);
    });
    return () => {
      cancelled = true;
    };
  }, [photo, filterIndex, shotNumber, total, capturedAt]);

  const encode = () => encodeJpeg(canvasToBlob(canvasRef.current!));

  const confirm = async () => {
    setBusy('confirm');
    setError(null);
    try {
      const blob = await encode();
      await onConfirm({ photoId, bytes: await blob.arrayBuffer() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the photo. Try again.');
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      await savePhoto(await encode(), formatFileName(capturedAt, photoId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save to your phone.');
    } finally {
      setBusy(null);
    }
  };

  const step = (delta: number) => setFilterIndex((i) => (i + delta + FILTERS.length) % FILTERS.length);

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className="flex min-h-0 flex-1 items-center justify-center"
        onPointerDown={(e) => (swipeStart.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipeStart.current === null) return;
          const dx = e.clientX - swipeStart.current;
          swipeStart.current = null;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Framed photo, ${FILTERS[filterIndex]!.label} look`}
          className={`h-full max-h-full w-auto max-w-full rounded-lg shadow-2xl transition-opacity ${rendering ? 'opacity-60' : ''}`}
        />
      </div>

      <div role="group" aria-label="Film look" className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={i === filterIndex}
            onClick={() => setFilterIndex(i)}
            className={`min-h-11 shrink-0 rounded-full border px-4 font-label text-sm uppercase tracking-wide ${
              i === filterIndex ? 'border-gold bg-gold text-ink' : 'border-cream/30 text-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-pink">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onRetake} disabled={busy !== null}>
          Retake
        </Button>
        <Button onClick={confirm} disabled={busy !== null || rendering}>
          {busy === 'confirm' ? 'Saving…' : 'Confirm'}
        </Button>
      </div>
      <p className="text-center text-xs text-muted">Confirm uses 1 of your {total} shots. Retakes are free.</p>
      <button type="button" onClick={save} disabled={busy !== null || rendering} className="min-h-11 font-label text-gold underline underline-offset-4 disabled:opacity-40">
        {busy === 'save' ? 'Preparing…' : 'Save to phone'}
      </button>
    </main>
  );
}
```

- [ ] **Step 4: `components/screens/Roll.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { useObjectUrl } from '@/lib/client/useObjectUrl';
import { shotsUsed, type PhotoRecord } from '@/lib/queue/policy';
import { formatFileName, formatStamp } from '@/lib/shared/time';

type Props = {
  records: PhotoRecord[];
  total: number;
  progress: (photoId: string) => number | undefined;
  onClose: () => void;
  onRetryNow: () => void;
};

function statusLabel(r: PhotoRecord, progress: number | undefined): { text: string; tone: string } {
  switch (r.status) {
    case 'developing':
      return { text: 'Developing', tone: 'text-cream' };
    case 'sending':
      return { text: progress === undefined ? 'Sending' : `Sending ${Math.round(progress * 100)}%`, tone: 'text-gold' };
    case 'saved':
      return { text: 'Saved ✓', tone: 'text-green' };
    case 'retrying':
      return { text: r.lastError === 'consent_required' ? 'Waiting for consent' : 'Retrying', tone: 'text-gold' };
    case 'not_sent':
      return { text: 'Not sent · shot refunded', tone: 'text-pink' };
  }
}

function RollItem({ record, progress }: { record: PhotoRecord; progress: number | undefined }) {
  const url = useObjectUrl(record.photoId, record.bytes);
  const label = statusLabel(record, progress);
  const capturedAt = new Date(record.capturedAt);
  return (
    <li className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Photo taken ${formatStamp(capturedAt)}`} className="aspect-[1320/1920] w-full rounded-md object-cover" />
      ) : (
        <div className="aspect-[1320/1920] w-full rounded-md bg-body" />
      )}
      <p className={`font-label text-sm ${label.tone}`}>{label.text}</p>
      <button
        type="button"
        onClick={() => void savePhoto(new Blob([record.bytes], { type: 'image/jpeg' }), formatFileName(capturedAt, record.photoId))}
        className="min-h-11 font-label text-sm text-gold underline underline-offset-4"
      >
        Save to phone
      </button>
    </li>
  );
}

export function Roll({ records, total, progress, onClose, onRetryNow }: Props) {
  const newestFirst = [...records].reverse();
  const anyRetrying = records.some((r) => r.status === 'retrying');
  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-5 px-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl text-cream">My Roll</h1>
        <p className="font-label text-muted">
          {shotsUsed(records)} of {total} shots used
        </p>
      </header>
      <p className="text-sm text-muted">
        Photos are kept in this browser, which may clear them later. Use Save to phone to keep your own copy.
      </p>

      {newestFirst.length === 0 ? (
        <p className="py-10 text-center font-label text-cream/70">No photos yet. Go shoot your first one.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {newestFirst.map((r) => (
            <RollItem key={r.photoId} record={r} progress={progress(r.photoId)} />
          ))}
        </ul>
      )}

      <div className="sticky bottom-0 grid gap-3 bg-ink py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {anyRetrying && (
          <Button variant="ghost" onClick={onRetryNow}>
            Try sending now
          </Button>
        )}
        <Button onClick={onClose}>Back</Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: `components/PendingBanner.tsx`**

```tsx
export function PendingBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-30 bg-gold px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-center font-label text-sm text-ink"
    >
      Keep this page open to finish sending {count} {count === 1 ? 'photo' : 'photos'}.
    </div>
  );
}
```

- [ ] **Step 6: `components/CandidCamApp.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { PendingBanner } from '@/components/PendingBanner';
import { Access } from '@/components/screens/Access';
import { Blocked } from '@/components/screens/Blocked';
import { Camera } from '@/components/screens/Camera';
import { Notice } from '@/components/screens/Notice';
import { Preview } from '@/components/screens/Preview';
import { Roll } from '@/components/screens/Roll';
import { Welcome } from '@/components/screens/Welcome';
import { initialState, reduce } from '@/lib/app/machine';
import { preflight } from '@/lib/app/preflight';
import type { BlockReason } from '@/lib/camera/support';
import { acceptConsent, clearConsent, hasConsent } from '@/lib/client/consent';
import { initIdentity } from '@/lib/client/identity';
import { useNow } from '@/lib/client/useNow';
import { useObjectUrl } from '@/lib/client/useObjectUrl';
import { useQueue } from '@/lib/queue/useQueue';
import type { PublicStatus } from '@/lib/shared/status';

type Capture = { photo: HTMLCanvasElement; capturedAt: Date; id: number };

export default function CandidCamApp() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ hasKey: boolean; keyLink: string | null }>({ hasKey: false, keyLink: null });
  const [capture, setCapture] = useState<Capture | null>(null);
  const clockOffset = useRef(0);
  const captureCount = useRef(0);
  const tick = useNow(30_000);

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const s = (await res.json()) as PublicStatus;
      clockOffset.current = Date.parse(s.now) - Date.now();
      setStatus(s);
    } catch {
      setStatusError("Can't reach the server. Check your connection, then tap Start again.");
    }
  }, []);

  useEffect(() => {
    setIdentity(initIdentity());
    void loadStatus();
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [loadStatus]);

  const consentVersion = status?.consentVersion ?? null;
  const queue = useQueue({
    consentVersion,
    uploadCloseAt: status ? Date.parse(status.uploadCloseAt) : null,
    onConsentRequired: () => {
      clearConsent();
      dispatch({ type: 'CONSENT_REQUIRED' });
    },
  });

  const total = status?.shotsPerDevice ?? 15;
  const shotsLeft = Math.max(0, total - queue.shotsUsed);
  const serverNow = () => Date.now() + clockOffset.current;
  const last = queue.records.at(-1) ?? null;
  const lastPhotoUrl = useObjectUrl(last?.photoId ?? null, last?.bytes ?? null);

  // Lock the camera when the event ends while someone is shooting.
  useEffect(() => {
    if (status && (state.screen === 'camera' || state.screen === 'preview') && serverNow() > Date.parse(status.cameraCloseAt)) {
      setCapture(null);
      dispatch({ type: 'BLOCK', reason: 'closed' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, state.screen, status]);

  const start = () => {
    if (!status) return void loadStatus();
    const reason = preflight({
      ua: navigator.userAgent,
      hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
      hasKey: identity.hasKey,
      now: serverNow(),
      cameraOpenAt: Date.parse(status.cameraOpenAt),
      cameraCloseAt: Date.parse(status.cameraCloseAt),
    });
    if (reason) return dispatch({ type: 'BLOCK', reason });
    dispatch({ type: 'START', consentOk: hasConsent(status.consentVersion) });
  };

  const onBlock = useCallback((reason: BlockReason) => dispatch({ type: 'BLOCK', reason }), []);

  const onCaptured = useCallback((photo: HTMLCanvasElement, capturedAt: Date) => {
    captureCount.current += 1;
    setCapture({ photo, capturedAt, id: captureCount.current });
    dispatch({ type: 'CAPTURED' });
  }, []);

  const screen = state.screen;
  const showCamera = screen === 'camera' || screen === 'preview';

  return (
    <>
      <PendingBanner count={queue.pending} />

      {screen === 'welcome' && (
        <Welcome onStart={start} disabled={false} message={statusError ?? queue.storageError} />
      )}

      {screen === 'notice' && (
        <Notice
          onAccept={() => {
            if (consentVersion) acceptConsent(consentVersion);
            dispatch({ type: 'CONSENT_ACCEPTED' });
            queue.retryNow();
          }}
        />
      )}

      {screen === 'access' && <Access onContinue={() => dispatch({ type: 'ACCESS_CONTINUE' })} />}

      {showCamera && (
        <div hidden={screen !== 'camera'}>
          <Camera
            active={showCamera}
            shotsLeft={shotsLeft}
            total={total}
            lastPhotoUrl={lastPhotoUrl}
            onCaptured={onCaptured}
            onOpenRoll={() => dispatch({ type: 'OPEN_ROLL' })}
            onBlock={onBlock}
            onExit={() => dispatch({ type: 'EXIT' })}
          />
        </div>
      )}

      {screen === 'preview' && capture && (
        <Preview
          key={capture.id}
          photo={capture.photo}
          capturedAt={capture.capturedAt}
          shotNumber={queue.shotsUsed + 1}
          total={total}
          onRetake={() => {
            setCapture(null);
            dispatch({ type: 'RETAKE' });
          }}
          onConfirm={async ({ photoId, bytes }) => {
            await queue.add({ photoId, capturedAt: capture.capturedAt.toISOString(), bytes });
            setCapture(null);
            dispatch({ type: 'CONFIRMED' });
          }}
        />
      )}

      {screen === 'roll' && (
        <Roll
          records={queue.records}
          total={total}
          progress={queue.progress}
          onClose={() => dispatch({ type: 'CLOSE_ROLL' })}
          onRetryNow={queue.retryNow}
        />
      )}

      {screen === 'blocked' && state.blockReason && (
        <Blocked
          reason={state.blockReason}
          cameraOpenAt={status ? new Date(status.cameraOpenAt) : null}
          uploadCloseAt={status ? new Date(status.uploadCloseAt) : null}
          keyLink={identity.keyLink}
          onRetry={() => dispatch({ type: 'RETRY_CAMERA' })}
          onOpenRoll={() => dispatch({ type: 'OPEN_ROLL' })}
        />
      )}
    </>
  );
}
```

- [ ] **Step 7: Replace `app/page.tsx`**

```tsx
import CandidCamApp from '@/components/CandidCamApp';

export default function Page() {
  return <CandidCamApp />;
}
```

- [ ] **Step 8: Local end-to-end run**

Set `CAMERA_OPEN_AT` in `.env.local` to an hour ago, then `npm run dev:https` and open `https://localhost:3000/?k=<EVENT_KEY>` on the laptop (it has a webcam).

Expected, in order:
1. `?k=` disappears from the address bar; Welcome screen shows.
2. Start → Notice (Continue disabled until the box is ticked) → Access → Camera with "15 EXP".
3. Shutter → Preview shows the framed photo; switching filters changes it; Retake returns to the camera with "15 EXP" still.
4. Confirm → back to camera, "14 EXP"; banner shows "Keep this page open to finish sending 1 photo." then disappears.
5. The file appears in the Shared Drive Photos folder named `NF26_YYYYMMDD-HHMMSS_xxxxxxxx.jpg`, 1320×1920, under 1.5 MB. In Drive, open File information: no location data.
6. Chrome DevTools → Network → Offline. Confirm two photos. My Roll shows "Retrying". Go back online: both turn "Saved ✓" within 60 s, and Drive has exactly two new files.
7. Reload the page mid-upload (throttle to "Slow 3G" first): after reload, the photo finishes and Drive has one copy, not two.

Restore `CAMERA_OPEN_AT` afterwards.

- [ ] **Step 9: Device check on a preview deploy**

Push the branch; open the Netlify branch deploy on a real iPhone and Android with `?k=<EVENT_KEY>` and run Task 13 Step 5's table, plus:

| Check | Expected |
| --- | --- |
| Preview filters | All five render within 1 s on the mid-range Android |
| Save to phone (iPhone) | Share sheet opens; "Save Image" puts it in Photos |
| Save to phone (Android) | Share sheet or download; the file opens in Gallery |
| 20 retakes in a row | No slowdown, no crash |
| Airplane mode, confirm, airplane off | Photo ends "Saved ✓"; one file in Drive |
| Lock the phone during an upload, unlock | Upload resumes; banner visible while pending |
| After 15 confirms | Camera shows "Roll finished"; shutter disabled; My Roll still works |
| Frame vs canvas artboard | HR (Angel) approves the look |

- [ ] **Step 10: Commit**

```bash
npm run typecheck && npm run lint && npm test
git add -A
git commit -m "feat: preview with film looks, My Roll and full app flow"
```

---

### Task 15: Offline app shell

**Files:**
- Create: `public/sw.js`

**Interfaces:**
- Consumes: registration in `CandidCamApp` (Task 14, production only).
- Produces: a refresh on weak signal still loads the app; `/api/*` is never cached.

- [ ] **Step 1: Write `public/sw.js`**

```js
const CACHE = 'nf26-shell-v1';
const SHELL = ['/', '/privacy'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Pages: network first, cached shell when offline. The ?k= query is ignored for the fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          return res;
        })
        .catch(() => caches.match(url.pathname).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  // Build assets and fonts are content-hashed: cache first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm start`, open `http://localhost:3000/?k=<EVENT_KEY>`, load once, then DevTools → Application → Service Workers shows `sw.js` activated. Set Network → Offline and reload.
Expected: the Welcome screen still renders (Start then shows "Can't reach the server…", which is correct offline). `/api/status` is not listed in Cache Storage.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat: cache the app shell for weak-signal reloads"
```

---

### Task 16: Setup, deploy and event-day docs; production deploy (M5 gate, rehearsal)

**Files:**
- Create: `docs/SETUP.md`, `docs/DRIVE_SETUP.md`, `docs/DEPLOY.md`, `docs/EVENT_DAY_RUNBOOK.md`
- Modify: `README.md`

- [ ] **Step 1: `docs/DRIVE_SETUP.md`**

```markdown
# Google Drive setup (one time, about 20 minutes)

Do this with an NGI Google Workspace account that can create Shared Drives.

1. Go to console.cloud.google.com → create project **ngi-nf26-candid-cam**.
2. APIs & Services → Library → enable **Google Drive API**.
3. IAM & Admin → Service Accounts → Create → name **candid-cam**. No roles needed. Open it → Keys → Add key → JSON. Store the file in the HR password manager. Never email or chat it.
4. In Google Drive: Shared drives → New → **NourishFest 2026 – Candid Cam**.
5. Manage members: add the service account email (ends in `iam.gserviceaccount.com`) as **Content manager**. Add HR staff as **Manager**. Nobody else.
6. Inside the Shared Drive create a folder **Photos**.
7. Copy the IDs:
   - Shared Drive ID: open the Shared Drive; the URL is `drive.google.com/drive/folders/<ID>`.
   - Folder ID: open Photos; same URL pattern.
8. Fill `.env.local` (from `.env.example`): `GOOGLE_SA_EMAIL` = `client_email` from the JSON, `GOOGLE_SA_PRIVATE_KEY` = `private_key` from the JSON (keep the `\n` sequences, one line, in double quotes), and the two IDs.
9. Run `npm run verify:drive`. It must end with `Drive OK`.

| Error | Fix |
| --- | --- |
| `storageQuotaExceeded` | The folder is in someone's My Drive. It must be inside the Shared Drive. |
| `Folder is not in the configured Shared Drive` | `DRIVE_SHARED_DRIVE_ID` is wrong. |
| `cannot add files` | The service account is not a Content manager. |
| `invalid_grant` | The private key was pasted wrongly; recopy it with the `\n` sequences. |
```

- [ ] **Step 2: `docs/SETUP.md`**

```markdown
# Local development

Requires Node 20+.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (see DRIVE_SETUP.md). For local testing set `CAMERA_OPEN_AT` to a past time.
3. `npm run verify:drive` → `Drive OK`
4. `npm run dev:https` → open `https://localhost:3000/?k=<EVENT_KEY>`. The camera needs HTTPS.
5. Frame check: `http://localhost:3000/dev/frame` (development only).

Checks before every push: `npm run typecheck && npm run lint && npm test`.

Phones cannot use the local HTTPS certificate; test on phones with a Netlify branch deploy (DEPLOY.md).
```

- [ ] **Step 3: `docs/DEPLOY.md`**

```markdown
# Deploy to Netlify (Free plan)

## One time
1. Push the repository to GitHub under an NGI-owned account.
2. Netlify → Add new project → Import from Git → pick the repository. Netlify detects Next.js; keep the defaults.
3. Project configuration → Environment variables → add every variable from `.env.example` with real values. Scope: all deploy contexts.
4. Project configuration → Build & deploy → Branches and deploy contexts → Branch deploys: **All**.
5. Optional: set the site name (e.g. `nf26-cam`) or connect an NGI subdomain.

## Credits (Free plan: 300 per month, hard cap)
- Each **production** deploy costs 15 credits. Branch and preview deploys are free.
- Test on a branch (`git push origin feature/x` → `https://feature-x--<site>.netlify.app`).
- Merge to `main` only for releases. Budget: at most 10 production deploys in December.
- Changing an environment variable needs a redeploy to take effect: Deploys → Trigger deploy → Deploy project (15 credits).
- Check usage at Team → Usage on 1 Dec and 7 Dec.

## Release checklist
- [ ] `npm run typecheck && npm run lint && npm test` pass
- [ ] Branch deploy tested on one iPhone and one Android
- [ ] Event times in Netlify match: open 8 Dec 15:00, camera close 8 Dec 23:00, uploads close 9 Dec 12:00 (all `+08:00`)
- [ ] `https://<site>/api/health?token=<HEALTH_CHECK_TOKEN>` returns `"ok":true`
- [ ] QR code encodes `https://<site>/?k=<EVENT_KEY>` (test-scan it)
```

- [ ] **Step 4: `docs/EVENT_DAY_RUNBOOK.md`**

```markdown
# NourishFest 2026 Candid Cam: event-day runbook

| When | Who | Action | Done when |
| --- | --- | --- | --- |
| 24 Nov | Dev | Code freeze. Last feature deploy. | `main` deployed |
| 25 Nov | Dev | For rehearsal: set `CAMERA_OPEN_AT` to now and `CAMERA_CLOSE_AT` / `UPLOAD_CLOSE_AT` to the rehearsal end; redeploy | Camera opens on site |
| 25–28 Nov | HR + Dev | Venue rehearsal: 10 phones × 5 photos on venue Wi-Fi, then on mobile data | 50 files in Drive, 0 lost, 0 duplicates |
| 28 Nov | HR | Go / no-go. No-go = set up Invistory as the fallback today | Decision recorded |
| 28 Nov | Dev | Delete rehearsal files from Drive; restore real event times; redeploy | Photos folder empty; health OK |
| 1 Dec (T-7) | Dev | Health check; print QR posters and table cards (with "Weak Wi-Fi? Use mobile data"); check Netlify usage | Posters printed; < 200 credits used |
| 7 Dec (T-1) | Dev | `npm run verify:drive`; one test upload from an iPhone and an Android (temporarily open the window on a branch deploy, not production); delete test files | Both phones Saved |
| 8 Dec 14:00 | HR | Health URL shows `ok`; place posters at entrance, bar and stage | Posters up |
| 8 Dec 15:00 | HR | Test shot on venue Wi-Fi and on mobile data | Both appear in Drive |
| 15:00–23:00 | HR (1 person) | Watch the Photos folder count rise; handle deletion requests on the spot | — |
| 9 Dec 12:00 | HR | Uploads close. Record the final photo count | Count noted |
| 8 Dec 2027 | HR | Delete the Photos folder; empty Shared Drive trash | Folder gone |

## If something breaks
| Symptom | Check | Fix |
| --- | --- | --- |
| Everyone stuck on "Retrying" | Health URL | `ok:false` → Drive issue: check the service account is still Content manager. `ok:true` → venue Wi-Fi: tell people to use mobile data; photos keep retrying until 9 Dec 12:00. |
| "Scan the QR code" for people who scanned | Poster QR has `?k=` | Reprint with the correct link. |
| "Camera access is off" | — | Follow the on-screen steps; Safari: aA → Website Settings → Camera → Allow. |
| Site paused | Netlify usage | Upgrade to Personal for December (about US$9) and add credits. |
| Someone asks for a photo to be deleted | Find it by time in the file name | Delete it in Drive (Manager role). |
```

- [ ] **Step 5: Replace `README.md`**

```markdown
# NF'26 Candid Cam

Mobile web camera for NourishFest 2026 (8 Dec 2026). Guests scan a QR code, shoot up to 15 framed retro photos, and every confirmed photo is saved to a private HR-owned Google Shared Drive.

- Local development: docs/SETUP.md
- Google Drive setup: docs/DRIVE_SETUP.md
- Deploying: docs/DEPLOY.md
- Event day: docs/EVENT_DAY_RUNBOOK.md
- Implementation plan: docs/superpowers/plans/2026-10-15-nourishfest-candid-cam.md
```

- [ ] **Step 6: Production deploy and final checks**

Merge to `main`. Then:

Run: `curl -s "https://<site>/api/health?token=<HEALTH_CHECK_TOKEN>"` → `{"ok":true,...}`
Run: `curl -sI https://<site>/ | grep -i x-robots-tag` → `x-robots-tag: noindex, nofollow`
Run: `curl -s -X POST https://<site>/api/upload` → `{"ok":false,"code":"bad_key"}` with status 401

Lighthouse (mobile) on the Welcome page: Performance interactive under 3 s on "Slow 4G"; Accessibility ≥ 95.

- [ ] **Step 7: Commit**

```bash
git add docs README.md
git commit -m "docs: Drive setup, deploy guide and event-day runbook"
```

---

## Spec coverage check

| Spec section | Covered by |
| --- | --- |
| Overview and success measures | Tasks 14 (Step 8–9), 16 (rehearsal) |
| Locked decisions | Global Constraints; Tasks 1, 5, 7, 10 |
| User experience, screens | Tasks 11, 12, 13, 14 |
| Camera and capture, failure table | Tasks 6, 13 |
| Frame, filters and output | Task 7 |
| Upload queue, shot counter, My Roll | Tasks 8, 9, 14 |
| Server and Google Drive, check table | Tasks 2, 4, 5 |
| Security, privacy and consent | Tasks 4, 5, 10, 12; headers in Task 1 |
| Hosting and environment variables | Tasks 1, 16 |
| Project structure | File structure section; all tasks |
| Milestones and timeline | Milestones table; Task 16 runbook |
| Manual setup checklist | Task 16 (DRIVE_SETUP, DEPLOY) |
| Risks and runbook | Task 16 |
| Out of scope | Not built: no gallery, Live Display, login, gallery upload, 9:16, originals, admin dashboard |
