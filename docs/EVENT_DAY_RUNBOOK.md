# NourishFest 2026 Candid Cam: event-day runbook

| When | Who | Action | Done when |
| --- | --- | --- | --- |
| 24 Nov | Dev | Code freeze. Last feature deploy. | `main` deployed |
| 25 Nov | Dev | For rehearsal: set `CAMERA_OPEN_AT` to now and `CAMERA_CLOSE_AT` / `UPLOAD_CLOSE_AT` to the rehearsal end; redeploy | Camera opens on site |
| 25–28 Nov | HR + Dev | Venue rehearsal: 10 phones × 5 photos on venue Wi-Fi, then on mobile data | 50 files in Drive, 0 lost, 0 duplicates |
| 28 Nov | HR | Go / no-go. No-go = set up Invistory as the fallback today | Decision recorded |
| 28 Nov | Dev | Delete rehearsal files from Drive; restore real event times; redeploy | Photos folder empty; health OK |
| 1 Dec (T-7) | Dev | Health check; print QR posters and table cards (with "Weak Wi-Fi? Use mobile data"); check Netlify usage; check the photo account has 8 GB free | Posters printed; < 200 credits used |
| 7 Dec (T-1) | Dev | `npm run verify:drive`; one test upload from an iPhone and an Android (temporarily open the window on a branch deploy, not production); delete test files | Both phones Saved |
| 8 Dec 14:00 | HR | Health URL shows `ok`; place posters at entrance, bar and stage | Posters up |
| 8 Dec 15:00 | HR | Test shot on venue Wi-Fi and on mobile data | Both appear in Drive |
| 15:00–23:00 | HR (1 person) | Watch the Photos folder count rise; handle deletion requests on the spot | — |
| 9 Dec 12:00 | HR | Uploads close. Record the final photo count | Count noted |
| 8 Dec 2027 | HR | Delete the Photos folder; empty the Drive trash | Folder gone |

## If something breaks
| Symptom | Check | Fix |
| --- | --- | --- |
| Everyone stuck on "Retrying" | Health URL | `ok:false` → Drive issue: the `error` field says which (see the Errors table in DRIVE_SETUP.md). `invalid_grant` → run `npm run drive:connect`, put the new `GOOGLE_OAUTH_REFRESH_TOKEN` in Netlify and redeploy. `storageQuotaExceeded` → free space in the photo account. `ok:true` → venue Wi-Fi: tell people to use mobile data; photos keep retrying until 9 Dec 12:00. |
| "Scan the QR code" for people who scanned | Poster QR has `?k=` | Reprint with the correct link. |
| "Camera access is off" | — | Follow the on-screen steps; Safari: aA → Website Settings → Camera → Allow. |
| Site paused | Netlify usage | Upgrade to Personal for December (about US$9) and add credits. |
| Someone asks for a photo to be deleted | Find it by time in the file name | Delete it in Drive (Manager role). |
