# SoloFlow: notes for Claude Code

- Self-hosted Next.js 15 + Prisma 6 + PostgreSQL bookkeeping app for Australian sole traders, branched from Folio. Read `README.md` and `docs/SPEC.md` first. The product brief and decisions live in the claude.ai Project.
- Signed-in pages are in `src/app/(app)`: each folder has `page.tsx` and its screen beside it. `src/app/(app)/layout.tsx` loads the data once (`AppData`, from `/api/state`, built in `src/lib/server/state.ts`) and draws the shared frame (`AppShell`). Screens draw only their own content; never add a nav, top bar or footer to a screen.
- Changes go through `/api/act` (`src/lib/server/actions/*`), and each action checks access itself.
- Access rules are strict: an account and its statements are visible only to its holders. Shared records (banks, layouts) never reveal private ones. Business roles cover business settings only.
- Statement layouts have two kinds: `account` (balance held) and `card` (balance owed). Credit card accounts take card layouts.
- New data-heavy screens (transactions, BAS, reports) load their own data per page, server-side and paged, not through `/api/state`.
- New screens from mockups: `python3 tools/convert.py Name` after adding the board to SCREENS.
- Interface writing: headings in Title Case, everything else in sentence case; nothing on screen is static sample text; destructive actions confirm, are red, soft-delete and offer Restore.
- Never run `prisma migrate reset` on a real database. `tools/testdb-reset.sh` is for the throwaway test database only.
- Open security work: `docs/security/HARDENING-TASKS.md`. Future device-bound access: `docs/security/DEVICE-ACCESS-PLAN.md`.
- Checks: `npm run typecheck`, `npm test`, and the browser tests listed in the README (dev server on port 3100, demo seed).
