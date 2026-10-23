# Build 04 — Firestore library search

## Added
- Editor button opens a library search dialog.
- Searches `songLibrary`, `lyricsLibrary`, and `mediaLibrary` collections already present in Firestore.
- Search results can insert a selected record's title and available URL into the last program item in the editor.
- Firestore rules allow approved accounts to read those library collections and admins to write them.

## Important limitation
This build does **not** import the Excel workbook into Firestore and does not yet implement the original Apps Script refresh/indexing jobs. A search returning no records can mean the collections have not been populated. The current search loads up to 500 documents per library collection and filters them in the browser; it is a starter implementation, not suitable for the 138k+ row song library at full scale. For production, import the workbook using a trusted one-time migration script and use indexed/paged search (or a dedicated search service).

## Validation
- `npm test`: 5/5 passed.
- `npm run check`: passed.

## Deploy caution
Review and deploy Firestore rules in the Firebase console. Do not upload account hashes, guest sessions, active sessions, tokens, or other private workbook data into public GitHub. This remains a development build, not full feature parity with Apps Script.
