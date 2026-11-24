# Folio: notes for Claude Code

- Self-hosted Next.js 15 + Prisma 6 + PostgreSQL app for home-loan statements and payoff forecasts. Read `README.md` and `docs/SPEC.md` first.
- Screens are in `src/screens` (converted mockups; logic in `renderVals`). Data comes from `/api/state` (`src/lib/server/state.ts`). Changes go through `/api/act` (`src/lib/server/actions/*`), and each action checks access itself.
- Access rules are strict: a loan is visible only to its borrowers and an account only to its holders. Shared records never reveal private ones.
- Never run `prisma migrate reset` on a real database.
- Open security work: `docs/security/HARDENING-TASKS.md`. Future device-bound access: `docs/security/DEVICE-ACCESS-PLAN.md`.
- Checks: `npm run typecheck`, `npm test`, `npm run e2e` (needs the dev server running and the demo seed).
