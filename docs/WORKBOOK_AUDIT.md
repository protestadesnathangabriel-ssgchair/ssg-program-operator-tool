# Workbook audit — SSG Program Flow - Tech Guide Database.xlsx

Audited from the uploaded workbook using read-only worksheet iteration. This is an inventory, not a comparison against the live Google Sheet.

| Worksheet | Rows including header | Migration handling |
|---|---:|---|
| Sheet1 | 0 | Empty; skip |
| SESSIONS | 24 | **Do not import**: session/token hashes and expiry data are ephemeral credentials |
| MCGI_SONG_LIBRARY_2 | 138,871 | Candidate for song-library migration; normalize and deduplicate before import; split into bounded batches |
| MCGI_SONG_LIBRARY_1 | 8,160 | Candidate legacy/source sheet; inspect overlap with SONG_LIBRARY_2 before importing |
| SSG_ACCOUNTS | 2 | **Do not import**: contains password hashes/salts and account details; recreate access through Firebase Authentication |
| GUIDES | 6 | Candidate source for guide documents; validate IDs, fields, timestamps and duplicates |
| SECTIONS | 13 | Child records; associate by Guide ID and preserve Sort Order |
| ITEMS | 102 | Child records; associate by Guide ID + Section ID and preserve Sort Order |
| GUEST_ACCOUNTS | 1 | Do not migrate without a documented requirement; personal data / activity metadata |
| GUEST_SESSIONS | 17 | **Do not import**: session/token hashes and expiry data are ephemeral credentials |
| LYRICS_LIBRARY | 787 | Candidate for lyrics migration; review licensing/access rules and normalize IDs |
| MEDIA_LIBRARY | 1 | Header only; no indexed media rows present |
| LINEUPS | 1 | Header only; no saved lineup rows present |
| LIVE_SESSIONS | 1 | Header only; no active session rows present |

## Safety and migration gates

1. This workbook inventory does **not** establish that the workbook matches the live Google Sheet. No live-sheet export was available for comparison in this audit.
2. Do not commit the workbook or its contents to the public GitHub repository. It contains account and session-related fields.
3. Do not migrate SESSIONS, GUEST_SESSIONS, or password hash/salt columns into Firestore. Recreate user access with Firebase Authentication and approved email identities.
4. Before importing guides, verify all `GUIDES` IDs have valid `SECTIONS` and `ITEMS` references. Preserve ordering and original creation/update times where safe.
5. `MCGI_SONG_LIBRARY_2` has 138,870 data rows by worksheet iteration and may exceed practical single-batch import sizes. Deduplicate against `MCGI_SONG_LIBRARY_1` and import in batches with resumable progress.
6. Current web app scaffold still lacks complete legacy feature parity (song/media/lyrics search and refresh, lineup management, and formatted document export). Do not deploy as a production replacement until implemented and acceptance-tested.
