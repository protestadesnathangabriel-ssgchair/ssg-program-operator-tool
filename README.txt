SSG Program Operator Tool — Responsive UI Patch (Fixed)
=========================================================

This is a replacement for the previous UI patch. It fixes the sidebar problem visible in the screenshot:
- Navigation items stack vertically rather than being squeezed into columns.
- Sidebar width and spacing are more stable on tablet/mobile.
- Clicking Program Sequence opens the same existing editor/action and highlights Program Sequence, not Program Flow.
- Uses the SSG colors and home-page tool cards from the approved concept.

Scope:
- Site shell, sidebar navigation styling, responsive layout and home dashboard.
- No intentional changes to program editor, display windows, host view, Firestore/auth/data operations, or live-sync logic.

Install via GitHub website:
1. Download and extract this ZIP.
2. Open the repository's root index.html.
3. Replace it with this patch's index.html.
4. Upload/replace SSG Operator Tool Logo.png in the same root folder.
5. Commit both files together.
6. Wait for GitHub Pages deployment and hard-refresh (Ctrl+Shift+R / Cmd+Shift+R).

Important:
- This patch is based on the same source used to prepare the previous UI patch. If the repository index.html has newer functional changes, do not overwrite blindly; merge these UI changes into the current file.
- Test Program Flow, Program Sequence, Lyric Prompter, saved guides, live sync, and display/host windows after deployment.
