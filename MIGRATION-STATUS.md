# Migration status and deliberate trade-offs

## Included in this build
- Existing single-page UI adapted to GitHub Pages.
- Firebase Google Authentication.
- Firestore officer-role authorization.
- Firestore guide list/load/save/delete with nested sections and items.
- Import of guide, song, and lyric data from the supplied workbook.
- Song and lyric search using Firestore search-term arrays.
- Lineup save/list/load/delete.
- Original CFPC template data copied from the supplied Apps Script source.

## Not included in the Spark-only build
- Apps Script runtime or Google Sheets as a live database.
- Automatic recursive Google Drive media indexing.
- Automatic Google Drive video duration lookup.
- Google Docs/DOCX server-side export.
- Automatic Drive/lyrics library refreshes from external source spreadsheets.
- Live session records or the legacy account/session system.

Those features need separate implementation and/or a trusted server-side integration. Cloud Functions are not available on Firebase Spark, so this bundle does not attempt to deploy them. Firebase documents Cloud Functions as a Blaze-plan service, while Firestore has a no-cost quota on Spark. See the Firebase plan and Firestore pricing documentation before enabling billing:
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/firestore/pricing

## Before public production use
The original UI was adapted from a large legacy app and a client-side adapter now covers its known API calls. Perform the README smoke test on the deployed site before using it for an event. Keep a local backup of the XLSX and the original Apps Script source.


## View-only operator monitoring update (2026-10-25)

- Request form uses full name + Production-Technical Team role and remains admin-reviewed.
- Viewer dashboard includes Guide Preview, Follow Online Operator, and Host View. Independent Display has been removed from the viewer dashboard.
- Follow Online Operator subscribes read-only to the selected officer's live display state and shows the prompt plus a smoothly updating timer; control-panel actions remain unavailable to viewers.
- Added `operatorSessions/{uid}` Firestore presence/state records and corresponding rules.
- JavaScript syntax checks passed. Live Firebase/Firestore Rules emulator testing and two-account browser testing have not been performed in this environment.


Live draft sync update: added Firestore guideLiveDrafts publish/subscribe path so editor changes can reach Host View and display windows without waiting for permanent guide save. Publish updated Firestore rules in Firebase Console. Live Firebase behavior remains unverified until tested with separate accounts.
