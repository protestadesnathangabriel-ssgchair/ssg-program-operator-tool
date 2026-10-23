# GAWIN ITO — SSG Program Guide Builder (Firebase)

## Ano ang laman nito?
Ito ang iisang consolidated working project. **Huwag nang i-upload ang Build 01/02/03/04 ZIPs.** Gamitin lamang ang folder na `ssg-program-guide-builder-main` mula sa ZIP na ito.

## Mahalagang status
Ito ay migration working copy, HINDI pa full replacement ng lumang Google Apps Script app. Gumagana ang basic guide editor, Google sign-in allowlist, Firestore save/live updates, JSON export, print/PDF, at library-search UI. Ang library search ay mangangailangan ng imported library records. Hindi pa kumpleto ang migration ng lahat ng legacy feature/data (lalo na ang full lyrics/lineup workflows, original guide data migration, at exact parity ng host/display/timers/export). Panatilihin ang lumang Apps Script app bilang backup.

## Part A — GitHub (source code)
1. I-download at i-extract ang ZIP.
2. Buksan ang extracted folder na `ssg-program-guide-builder-main`.
3. Buksan ang GitHub repository mo: `https://github.com/protestadesnathangabriel-ssgchair/ssg-program-guide-builder`
4. Kung may `docs`, `src`, `index.html`, `firebase.json`, `firestore.rules`, at iba pang files na, palitan ang mga ito ng kaparehong files mula sa extracted folder. **Huwag i-upload ang ZIP file bilang kapalit ng source files.**
5. HUWAG i-upload ang `.xlsx` workbook, account/session export, password/hash, token, service-account key, o secrets sa GitHub. Public repo = kahit sino puwedeng makabasa.
6. I-commit ang changes. Kung hindi sigurado sa overwrite, gumawa muna ng backup branch o i-download ang current repository ZIP.

## Part B — Firebase (database/security + hosting)
**Hindi sa Firebase Console ina-upload ang ZIP.** Firebase Hosting ay dini-deploy mula sa extracted project folder gamit ang Firebase CLI.

1. Sa Firebase Console (`https://console.firebase.google.com/project/ssg-program-operator-tool`), tiyaking naka-enable ang **Authentication → Sign-in method → Google**.
2. Sa Authentication → Settings → Authorized domains, idagdag ang domain kung saan iho-host ang site. Para sa Firebase Hosting: `ssg-program-operator-tool.web.app` at `ssg-program-operator-tool.firebaseapp.com`. Kung gagamit ng GitHub Pages, idagdag din ang `protestadesnathangabriel-ssgchair.github.io`.
3. Sa Firestore Database, gumawa ng database kung wala pa. Huwag muna mag-import ng workbook o account/session tabs.
4. Sa local computer, install Node.js LTS mula `https://nodejs.org/` at Firebase CLI. Buksan ang terminal sa extracted project folder at patakbuhin:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use ssg-program-operator-tool
   npm test
   npm run check
   firebase deploy --only hosting,firestore:rules
   ```

5. Buksan ang URL na ipapakita ng Firebase CLI. Subukan ang Google sign-in at gumawa ng TEST guide lamang.
6. Kapag nag-error ang `firebase use`, huwag magpatuloy sa deploy; sabihin ang eksaktong error.

## Part C — bago mag-live
- Subukan ang admin, operator, at account na hindi authorized.
- Subukan ang paggawa, pag-save, pag-edit, pag-delete (admin lamang), at live display sa dalawang browser.
- Subukan ang Print / Save as PDF.
- Huwag mag-import ng production workbook hangga't walang reviewed import mapping at backup.
- Panatilihing gumagana ang lumang Apps Script deployment bilang rollback.

## Ano ang hindi mo dapat gawin
- Huwag mag-upload ng workbook sa public GitHub.
- Huwag mag-paste ng service-account private key, password, recovery code, session token, o OAuth client secret sa chat.
- Huwag burahin o palitan ang live Apps Script app.
- Huwag ipagpalagay na library search ay may data hangga't hindi na-import at na-test ang library records.

## Bakit hindi pa ito tinatawag na complete?
Ang original Apps Script app ay may legacy authentication/session rules, guide records, song/lyrics/media libraries, lyric lineups, exports at host/display behaviors. Ang working copy ay hindi pa proven parity sa lahat ng iyon. Ang ZIP na ito ay source/deployment handoff na may malinaw na deployment steps; hindi ito claim na natapos na ang buong migration.
