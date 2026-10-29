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
