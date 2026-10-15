# Google Drive setup (one time, about 20 minutes)

Photos are saved to a folder in the **My Drive** of one Google account. The app signs in as that account with an OAuth refresh token (a service account cannot be used: it has no storage of its own and cannot write to a personal My Drive).

**Which account:** use a dedicated account owned by HR (e.g. a new `nf26.candidcam@gmail.com`), not anyone's personal Gmail. Photos stay with the account, so they must not leave the company when a person does. The password goes in the HR password manager.

**Storage:** photos count against the account's free 15 GB. Worst case is about 250 people × 15 photos × 1.5 MB ≈ 5.6 GB, so start with an account that has at least 8 GB free.

## 1. Google Cloud project
1. Sign in to console.cloud.google.com with the photo account.
2. Project picker → New project → **ngi-nf26-candid-cam** → Create, then select it.
3. APIs & Services → Library → **Google Drive API** → Enable.

## 2. OAuth consent screen (Google Auth Platform)
1. APIs & Services → OAuth consent screen → Get started.
2. App name **NF26 Candid Cam**, support email = the photo account. Audience: **External**. Contact email: the same. Create.
3. Data Access → Add or remove scopes → tick `.../auth/drive.file` → Update → Save. Add no other scopes.
4. Audience → **Publish app** → Confirm. Status must read **In production**.
   - Do this before step 5. In **Testing**, Google kills the refresh token after 7 days and uploads stop.
   - `drive.file` is a non-sensitive scope, so no Google verification is needed. Do not upload a logo; that triggers a review.

## 3. OAuth client
1. Clients → Create client → Application type **Desktop app** → name `candid-cam` → Create.
2. Copy the **Client ID** and **Client secret** now (or download the JSON). The secret is shown only once.

## 4. Connect the account
1. Copy `.env.example` to `.env.local`. Fill `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`. Leave `DRIVE_FOLDER_ID` empty.
2. Run `npm run drive:connect` on a computer with a browser.
3. Open the printed link, sign in with the photo account, and allow access. "Google hasn't verified this app" may appear: Advanced → Go to NF26 Candid Cam.
4. The script creates the folder **NourishFest 2026 – Candid Cam Photos** in My Drive and prints `GOOGLE_OAUTH_REFRESH_TOKEN` and `DRIVE_FOLDER_ID`. Paste both into `.env.local`.
5. Run `npm run verify:drive`. It must end with `Drive OK`.

Store the client secret and refresh token in the HR password manager. Never email or chat them. Anyone with both can add and delete photos in that folder.

## Rules for the folder
- The app can only see files it created. **Do not** replace the folder with one made by hand, and do not move photos out of it.
- Share it with HR staff as **Viewer** (or Editor for whoever handles deletion requests). Nobody else. Never "Anyone with the link".
- Do not rename or trash it. Renaming is harmless, but trashing stops uploads.

## Errors
| Error | Fix |
| --- | --- |
| `invalid_grant` | Refresh token is dead: app still in Testing, access removed at myaccount.google.com/permissions, or token pasted wrongly. Check step 2.4, then run `npm run drive:connect` again (it keeps the existing `DRIVE_FOLDER_ID`) and update the token everywhere. |
| `Drive 404 … File not found` | `DRIVE_FOLDER_ID` is wrong, the folder was made by hand, or the token belongs to another Google account. Clear `DRIVE_FOLDER_ID` and run `npm run drive:connect`. |
| `The Photos folder is in the Drive trash` | Restore it from the trash. |
| `storageQuotaExceeded` | The account is out of space. Free up space or buy Google One storage. |
| `Drive 403 … accessNotConfigured` | Google Drive API is not enabled in the project (step 1.3). |
