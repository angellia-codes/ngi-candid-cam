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
