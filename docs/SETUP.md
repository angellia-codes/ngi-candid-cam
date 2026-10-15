# Local development

Requires Node 20+.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (see DRIVE_SETUP.md). For local testing set `CAMERA_OPEN_AT` to a past time.
3. `npm run verify:drive` → `Drive OK`
4. `npm run dev:https` → open `https://localhost:3000/?k=<EVENT_KEY>`. The camera needs HTTPS.
5. Frame check: `http://localhost:3000/dev/frame` (development only).

Checks before every push: `npm run typecheck && npm run lint && npm test`.

Phones cannot use the local HTTPS certificate; test on phones with a Netlify branch deploy (DEPLOY.md).
