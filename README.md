# SoloFlow

Self-hosted bookkeeping for Australian sole traders. Import your business bank and credit card statements, check they add up, and (in the coming milestones) categorise transactions, work out GST and BAS figures, and print a report for your accountant. It runs on your own computer or server and is meant to be reached on your home network or VPN.

SoloFlow started as a branch of Folio, a home-loan statement app, and keeps its look, statement reading, layouts, sign-in and backups.

This guide gets it running on your computer with Node.js and PostgreSQL.

## What you need

- **Node.js 20 or newer** (22 recommended). Check with `node -v`.
- **PostgreSQL 14 or newer** (16 recommended), running on your computer.
  - macOS: `brew install postgresql@16 && brew services start postgresql@16`
  - Windows: the installer from postgresql.org (remember the password you give the `postgres` user)
  - Linux: your package manager, for example `sudo apt install postgresql`

## 1. Make the database

Open a PostgreSQL prompt (`psql postgres` on macOS, `sudo -u postgres psql` on Linux, or "SQL Shell (psql)" on Windows) and run:

```sql
CREATE USER soloflow WITH PASSWORD 'pick-a-password';
CREATE DATABASE soloflow OWNER soloflow;
```

## 2. Settings

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL="postgresql://soloflow:pick-a-password@localhost:5432/soloflow?schema=public"
SOLOFLOW_SECRET="a long random string"
```

Make the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

**Keep `SOLOFLOW_SECRET` safe and never change it.** It encrypts account numbers, BSBs and two-step secrets. A backup restored on another install only reads those back if that install has the same secret.

## 3. Install and start

```
npm install
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000. The first visit asks you to make the admin account and your first business.

### Trying it with sample data instead

On an **empty** database you can load a demo business before opening the app:

```
npm run db:seed
```

It signs in as `alex@soloflow.local`, `sam@soloflow.local` or `jordan@soloflow.local`, all with the password `soloflow-demo`. Alex is the server admin. The seed refuses to run once real people exist. To go back to a real setup, drop the database and make it again (step 1), then run `npx prisma migrate deploy`.

### Running it the faster way

`npm run dev` is for trying things out. For everyday use on your computer:

```
npm run build
npm start
```

## Using it

- **Add an account** from the + button: a business transaction or savings account, or a business credit card. You can attach its first statement as you go.
- **Statements** takes PDF or CSV statements, several at once. Each file is matched against every saved layout (and every version of each), checked, and shown to you before anything is saved.
- **A statement from a bank SoloFlow has not seen** needs a layout. Use *Map a layout* on the review card (or Settings, Layouts, +): choose the statement, say whether it is a bank account or a credit card statement, draw a box around each section (or press *Suggest*), and SoloFlow reads it back and checks the totals before you save.
- **Settings** holds the business, invites (with a QR code), alerts and where they go (Discord, Telegram, ntfy, Gotify, Home Assistant or a webhook), banks, layouts, your data export and, for the admin, backups.
- **Profile** holds your name, photo, sign-in email, password, two-step verification and signed-in devices.

Who sees what: an account and its statements are visible only to its holders. Banks are shared in a business, and layouts are shared on the whole server. Shared things never reveal accounts you are not on. One person can belong to several businesses, for example a bookkeeper helping more than one sole trader.

## Backups

The admin's Server tab backs up everything (database and statement files) to a folder, daily or weekly, and keeps the last 7, 14 or 30. *Back up now* makes one straight away, and each backup can be downloaded. *Restore* replaces everything on the server with a backup and signs everyone out.

Backups are written to `./backups` unless you choose another folder.

## Using it away from home

Use a VPN such as Tailscale. Don't expose SoloFlow to the internet until the fixes in `docs/security/REMOTE-ACCESS.md` are done. That file also covers Cloudflare Access and Authelia, and `docs/security/HARDENING-TASKS.md` is the same list for Claude Code.

## Checks

```
npm run typecheck   # TypeScript
npm test            # statement-reading and ABN tests
```

The browser tests need Playwright (`npm install` brings it; `npx playwright install chromium` downloads its browser, or set `CHROME_PATH` to an installed Chrome) and the app running on port 3100 (`npx next dev -p 3100`):

```
sh tools/testdb-reset.sh && npm run e2e            # demo data: visits every screen on desktop and phone sizes
node tools/e2e/twostep.js                          # turns two-step on and off with real codes
node tools/e2e/layout-editor.js "" save "Test"     # maps and saves a layout from tools/testdata/business-account.pdf
sh tools/testdb-reset.sh --empty && node tools/e2e/first-run.js   # empty server: setup, account, PDF and CSV imports, review, invite, backup and restore
```

`tools/testdb-reset.sh` drops and recreates the `soloflow` database. Only use it on a throwaway test database.

## Good to know

- There is no mail server, so changing your sign-in email asks for your password and changes it straight away.
- Alerts are worked out from your data each time you load a page. When you connect a service, SoloFlow checks every 15 minutes and sends each new alert once.
- Automatic backups and alert sending run inside the app, so they only happen while it is running.
- Statements are read on your server and never sent anywhere.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/app/(app)` | Signed-in pages, each folder with its `page.tsx` and its screen; `layout.tsx` draws the shared frame |
| `src/app/(auth)` | Setup, sign-in, two-step, join and sign-out |
| `src/app/api` | The API (`/api/state`, `/api/act`, `/api/import`, files, export, backups) |
| `src/components` | The shared frame (`AppData`, `AppShell`) and the sign-in card |
| `src/lib/server` | Data access, actions, statement reading, backups, alerts |
| `prisma` | Database schema, migrations and the demo seed |
| `tools` | The mockup converter, test data and browser tests |
| `docs/SPEC.md` | The product spec |
