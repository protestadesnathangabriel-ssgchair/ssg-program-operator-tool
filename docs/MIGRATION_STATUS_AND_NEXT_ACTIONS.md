# SSG migration status — 24 October 2026

## Working copy updated
- Firebase Web App config now targets `ssg-program-operator-tool`.
- Firebase Hosting config (`firebase.json`) and project alias (`.firebaserc`) added.
- Firestore rules are included for deployment review.
- The app currently supports Google sign-in allowlisting, basic guide create/list/edit/delete, autosave, live draft updates, read-only display mode, and JSON export.

## Verification performed
- `npm test`: 5 tests passed.
- `npm run check`: JavaScript syntax checks passed.

These checks cover the current scaffold only. They are not end-to-end or production-readiness verification.

## Not yet migrated from the original Apps Script
The original app's MCGI song/media search and refresh indexes, lyrics search/library/lineups, document export, original authentication/session and guide visibility behavior, and full host-view presentation controls are not yet implemented with feature parity in this working copy. Existing workbook records have not been imported. The live Google Sheet and uploaded workbook have not been independently reconciled by this build step.

## Data protection
Do not commit the workbook, account hashes, guest sessions, access codes, tokens, or any private credentials to the repository. Before importing, create a field-by-field migration map and explicitly exclude session/secret data. Keep the existing Apps Script app as rollback until every acceptance test passes.

## Deployment gate
Do not call this production-ready until the missing feature set above is implemented, Firestore rules are tested against allowed and denied accounts, migration/import is verified, and editor/host behavior passes end-to-end tests.
