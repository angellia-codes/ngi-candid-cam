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
