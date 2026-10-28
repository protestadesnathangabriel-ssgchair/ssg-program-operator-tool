# SSG Program Operator Tool — GitHub Pages + Firebase Auth + Firestore

This is a static-site migration build based on the supplied legacy `index.html` and the inspected API contract in `Code.gs`. It keeps the existing UI and replaces Apps Script calls with a Firestore compatibility adapter. It is designed to work on the Firebase **Spark** plan without Cloud Functions.

## Important scope and limitations

- The app is static and can be hosted on GitHub Pages.
- Google sign-in uses Firebase Authentication. Approved accounts whose `users/{uid}` document has `role: "officer"` or `role: "admin"` can edit. Other signed-in Google accounts get a read-only view of saved guides/sequences and can submit one officer-access request.
- Firestore is the app database. The XLSX importer migrates `GUIDES` (including nested sections/items), both song-library tabs, `LYRICS_LIBRARY`, and `MEDIA_LIBRARY`.
- The workbook's `MEDIA_LIBRARY` is empty, so Google Drive media search will be empty until a media index is imported separately.
- Google Drive recursive indexing, automatic video-duration lookup, Google Docs/DOCX export, and server-side Apps Script behavior are not included in this Spark-only build. Cloud Functions require the Blaze plan, so this build does not use Functions.
- The legacy SSG officer code and legacy session/password data are deliberately not reused. Never expose the legacy `Code.gs`, account/session sheets, or any service-account private key in frontend files.
- The existing CFPC template data was carried over into the client adapter. Google Docs/DOCX export is not included.
- Firebase web configuration is public client configuration, not a private key. Firestore Rules are the security boundary.

## Files

- `index.html` — existing app UI adapted for static hosting and Google sign-in.
- `firebase-adapter.js` — maps the existing app's API calls to Firestore.
- `firestore.rules` — role-based database security rules.
- `firebase.json` — optional Firebase CLI rules deployment config.
- `import.html` — one-time browser importer for the supplied workbook. **Remove this from the published repository after a successful import.**

## Exact setup and deployment order

### 1. Confirm Firebase project and create Firestore

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select project **`ssg-program-operator-tool`**.
3. Go to **Build → Firestore Database** and click **Create database** if one does not already exist.
4. Choose **Production mode**. Select a database region appropriate for your users; the region cannot be changed after creation.
5. Keep the project on **Spark**. This build does not require Cloud Functions.
6. Go to **Build → Authentication → Sign-in method** and make sure **Google** is enabled.

### 2. Add GitHub Pages to Firebase Authentication

1. In Firebase Console, open **Authentication → Settings → Authorized domains**.
2. Add this domain (hostname only; no `https://` and no path):
   `protestadesnathangabriel-ssgchair.github.io`
3. Save.

### 3. Publish the project files to GitHub

Repository: https://github.com/protestadesnathangabriel-ssgchair/ssg-program-operator-tool/

1. Download and unzip the migration bundle.
2. Open the repository on GitHub.
3. Upload the files in this bundle's project root (`index.html`, `firebase-adapter.js`, `firestore.rules`, `firebase.json`, `.nojekyll`, `README.md`, `import.html`) into the repository root. Do **not** upload `Code.gs`, the original workbook, exported session rows, account/password data, or private keys.
4. Commit to the branch used by GitHub Pages (normally `main`).
5. Open **Settings → Pages**. Under Build and deployment, choose **Deploy from a branch**, select the published branch and `/ (root)`, and save.
6. Wait for the GitHub Pages deployment to finish. The target URL should be:
   `https://protestadesnathangabriel-ssgchair.github.io/ssg-program-operator-tool/`

### 4. Apply Firestore security rules

Recommended CLI method (requires Node.js and Firebase CLI, but no service-account private key):

1. Install Node.js LTS if needed.
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Run `firebase login` in a terminal.
4. In the downloaded project folder, run `firebase use --add` and select `ssg-program-operator-tool` if prompted.
5. Deploy only the rules: `firebase deploy --only firestore:rules`

Alternatively, open **Firestore Database → Rules**, replace the rules with the complete contents of `firestore.rules`, and click **Publish**. Do this before importing data.

### 5. Sign in once and provision your officer role

1. Open the GitHub Pages URL.
2. Click **Continue with Google** and sign in with the Google account that should be the first SSG officer.
3. It may say the account is not authorized. This is expected before the role document exists.
4. In Firebase Console, open **Build → Authentication → Users**, find that account, and copy its **UID**.
5. Open **Firestore Database → Data** and create a collection named `users` if it does not exist.
6. Create a document whose document ID is exactly that UID.
7. Add field `role` with type **string** and value **`officer`**. Optionally add `email` as a string for your own reference. Do not add any private credentials.
8. Return to the app and reload. Sign in again if needed. The user should now be authorized.

To authorize another officer, repeat steps 1, 4–7 for that person. Only the project owner should provision roles through Firebase Console; the app rules prohibit users from granting themselves access.

### 6. Import the supplied XLSX into Firestore (one time)

1. Open `import.html` at the deployed site:
   `https://protestadesnathangabriel-ssgchair.github.io/ssg-program-operator-tool/import.html`
2. Sign in with the officer account you just provisioned.
3. Select the local file **`SSG Program Flow - Tech Guide Database.xlsx`** that you previously supplied.
4. Click **Import workbook into Firestore** and wait for `Import complete`.
5. The importer intentionally skips `SESSIONS`, `SSG_ACCOUNTS`, `GUEST_ACCOUNTS`, and `GUEST_SESSIONS`. Do not manually import those tabs.
6. The workbook has about 17,100 documents across guides, songs, and lyrics. Firestore Spark's published free quota is 20,000 document writes/day; perform this as one import and do not repeatedly rerun it. Existing documents with the same IDs are overwritten, but stale documents not present in the workbook are not automatically deleted.
7. Once import succeeds, **remove `import.html` from the GitHub repository** and commit that deletion. Keep a local copy of `import.html` only if you need it for a later controlled re-import.

### 7. Smoke test

1. Reload the main GitHub Pages URL and sign in.
2. Confirm the guide list loads and open a guide.
3. Edit a test guide title, save it, reload, and verify it persists. Revert the test edit if appropriate.
4. Search a known song and a known lyric title.
5. Check presenter/display/control modes using the app's built-in controls. They need the same browser origin and an active signed-in Firebase session.
6. Check Firestore → Usage to watch free-quota usage.

## Public view-only access, live operator monitoring, and officer requests

- `guides` documents (including `PROGRAM_SEQUENCE` guides) are publicly readable by design. Only approved officers/admins can create, update, or delete them.
- The view-only dashboard request form asks for the requester's full name and Production-Technical Team role. Requests are stored in `officerAccessRequests/{uid}` for admin review; submitting a request never grants a role. Approve separately by creating/updating `users/{uid}` with `role: "officer"`.
- View-only users can open **Guide Preview**, **Independent Window Display**, and **Host View** for saved guides/sequences.
- Independent Window Display has local-only keyboard/scroll and timer controls. It does not publish changes to an operator's live session or edit the saved guide.
- **Follow Online Operator** lists approved operators actively publishing the selected guide. A viewer can follow one operator's current active item/take, timer, scroll position, and display state in real time. The follow window is read-only: it does not accept keyboard commands or operator-control actions.
- An operator appears online while their normal live Window Display is open and publishing the selected guide's live state. Presence expires automatically after a short heartbeat timeout if the browser closes unexpectedly. The app writes these live records to `operatorSessions/{uid}`; signed-in users can read sessions, while only each approved officer can publish their own session.
- Song, lyrics, and media libraries and `lineups` remain officer-only. Because saved guide documents are publicly readable, do not put private/personal information in guide content.
- For this update, publish the full contents of `firestore.rules` in Firebase Console → Firestore Database → Rules, then replace only `index.html`, `firebase-adapter.js`, and `firestore.rules` in the GitHub Pages repository and commit the changes.

## Security and backup notes

- Do not create or upload a service-account private key for this architecture. No service account is needed for the browser-side importer.
- The Firebase API key shown in `firebase-adapter.js` is public client config. Security must come from Authentication and Firestore Rules, not API-key secrecy.
- Never set Firestore Rules to `allow read, write: if true`.
- Before importing, keep a backup of the original XLSX locally. The importer writes to Firestore and does not alter the original spreadsheet.
- If you already have production data in Firestore, stop before importing and make a backup: this import overwrites documents with matching IDs.
