# Security hardening tasks (for Claude Code)

These tasks make SoloFlow safe to reach from outside the home network. Work through them in order. Each task lists its files, what to change, and how to show it works. Tick a box only once its check passes.

The recommended setup is still a VPN (Tailscale or WireGuard) with nothing exposed. These tasks are worth doing anyway, and they are required before any public exposure. Section D lists the deployment options for that case.

## Ground rules

- Keep the access rules exactly as they are. An account and its statements are visible only to its holders. Shared records (banks, layouts) never reveal private ones.
- Any new setting goes in `.env.example`, with a comment, and in the README.
- On-screen text: headings in Title Case, everything else in sentence case. Errors say what to do next.
- Never run `prisma migrate reset` on a real install. Add schema changes with `prisma migrate dev --name <name>`.
- After each task, run `npm run typecheck`, `npm test` and `npm run e2e` (with the dev server and demo data). Commit each task on its own.

## A. Sign-in and sessions

- [ ] **A1. Limit sign-in attempts**
  - Files: `prisma/schema.prisma` (new model `LoginAttempt { id, key, ok Boolean, at DateTime, ip String? }` with an index on `[key, at]`), `src/lib/server/ratelimit.ts` (new), `src/app/signin/page.tsx`, `src/app/join/page.tsx` (password check for existing accounts), `src/lib/server/actions/user.ts` (`changeEmail`, `changePassword`).
  - Rule: count failures in the last 15 minutes, both per email (`key = 'email:' + lower(email)`) and per client IP (`key = 'ip:' + ip`).
    - Five failures for an email: wait 1 minute, doubling with each further failure up to 15 minutes.
    - Thirty failures from one IP: block that IP for 15 minutes.
    - A success clears the email's count.
  - Show one message whether the email exists or not: "That email and password don't match. Try again in N minutes." Never say which part was wrong.
  - Prune rows older than 24 hours from the job in `src/lib/server/jobs.ts`.
  - Check: a unit test for `ratelimit.ts`. The sixth wrong password inside 15 minutes is refused even when the password is then correct, and is allowed after the wait.

- [ ] **A2. Limit two-step code attempts**
  - Files: `src/app/twostep/page.tsx`, `src/lib/server/twofactor.ts`, plus `tfaVerify`, `tfaCodes` and `tfaOff` in `src/lib/server/actions/user.ts`.
  - Rule: allow five wrong codes per session, then delete the pending session and send the person back to sign in. Use key `totp:<userId>` in `ratelimit.ts`.
  - Also refuse a TOTP code that was already used in the current 30-second window. Store the last accepted time step in `User.prefs.totpLastStep`.
  - Check: an e2e step in `tools/e2e/twostep.js`. Six wrong codes lands on `/signin`.

- [ ] **A3. Use a trusted client IP only**
  - Files: `src/lib/server/auth.ts`, and the new `src/lib/server/clientip.ts`.
  - `x-forwarded-for` is currently trusted blindly. Add the env `SOLOFLOW_TRUST_PROXY` (default off).
    - When it is off, ignore forwarded headers and use the socket address if available, else null.
    - When it is on, take the address from `cf-connecting-ip` (Cloudflare) or the right-most untrusted `x-forwarded-for` entry.
  - Use the result in `startSession` and in A1.

- [ ] **A4. Make cookies HTTPS-only by default**
  - File: `src/lib/server/auth.ts`.
  - Set `secure: true` whenever the request arrived over HTTPS (`x-forwarded-proto === 'https'` behind a trusted proxy, or `SOLOFLOW_URL` starts with `https://`). Keep `SOLOFLOW_SECURE_COOKIE=false` as an escape hatch for plain-HTTP LAN use.
  - Rename the cookie to `__Host-soloflow_session` when it is secure.
  - Check: a sign-in through an HTTPS reverse proxy sets a `Secure` cookie.

- [ ] **A5. Tighten session lifetime and rotation**
  - File: `src/lib/server/auth.ts`.
  - Add an absolute session limit of 30 days from `createdAt`, alongside the 30-day idle limit already there.
  - Rotate the session token when two-step completes: delete the pending session and start a new one.
  - Delete all of a person's sessions when their password changes, apart from the current one when "sign out other devices" is off. This already happens when it is on.

- [ ] **A6. Use one password rule everywhere**
  - Files: `src/app/setup/page.tsx`, `src/app/join/page.tsx` (both allow 8 characters today), `src/lib/server/actions/user.ts` (12).
  - Add a shared `passwordProblem(pw, email)` in `src/lib/server/auth.ts`. It needs at least 12 characters, and the password must not equal the email or contain the person's name. Use it in all three places, with the same message.

- [ ] **A7. Let the admin require two-step**
  - Files: the `saveServer` action in `src/lib/server/actions/server.ts` (new setting `requireTwoStep`), the Server tab in `src/screens/Settings.jsx` (the "Require two-step verification for everyone" row is marked "Later"; make it a real toggle), `src/lib/server/guard.ts`.
  - When it is on, anyone signed in without two-step is sent to `/profile?setup=twostep` until they turn it on. Only the profile page and the two-step actions work in the meantime.
  - Profile opens the two-step set-up when it sees that query.
  - Check: an e2e test for the redirect.

## B. Requests and pages

- [ ] **B1. Add security headers**
  - File: `next.config.ts` (`headers()`), or `src/middleware.ts` if a per-request nonce is needed.
  - Headers:
    - `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. Tighten `script-src` with nonces if Next allows without breaking the screens. The screens use inline styles, so `style-src 'unsafe-inline'` stays.
    - `Referrer-Policy: same-origin`
    - `X-Content-Type-Options: nosniff`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - `Strict-Transport-Security: max-age=31536000`, only when `SOLOFLOW_URL` is https.
  - Check: the e2e smoke passes with no CSP console errors. The pdf.js worker (`/pdf.worker.min.mjs`) and fonts (`/pdf-fonts/`) still load.

- [ ] **B2. Check where requests come from**
  - File: `src/app/api/act/route.ts`, and the other POST routes (`/api/import`, `/api/restore`).
  - Refuse POSTs whose `Origin` header is present and doesn't match the host (or `SOLOFLOW_URL`).
  - The JSON content type already forces a preflight for `/api/act`. Multipart routes don't have that protection, so this check matters most for them.
  - Check: a curl POST with `Origin: https://evil.example` returns 403.

- [ ] **B3. Make invite links match what the screen says**
  - Files: `src/app/join/page.tsx`, the invite card text in `src/screens/Settings.jsx`.
  - The screen says invites "only open on your network", but nothing enforces it.
  - Add the setting `invitesLocalOnly` (default on). The join page refuses the invite when the client IP (from A3) is public, with the message "Open this invite on the same network as the server, or over its VPN."
  - Use the same private and VPN ranges as `privacyCheck` in `src/lib/server/actions/server.ts`. Move that helper to a shared module.
  - When the setting is off, change the card text so it no longer claims the limit.

- [ ] **B4. Add small limits on everything**
  - Files: `src/app/api/act/route.ts` (refuse bodies over 2 MB), `src/app/api/import/route.ts` (already 25 MB; add at most 20 files per minute per person through `ratelimit.ts`), `src/app/api/restore/route.ts` (admin only already; add a size cap from the env `SOLOFLOW_MAX_RESTORE_MB`, default 2048).

## C. Statement files

- [ ] **C1. Read PDFs in a worker with limits**
  - File: `pdfPages` in `src/lib/server/importer.ts`.
  - Run the pdf.js text extraction in a `worker_threads` worker with a 20-second timeout and a memory cap (`resourceLimits.maxOldGenerationSizeMb: 256`). Stop after 50 pages.
  - A timeout or crash becomes the import error "This file could not be read." The server keeps running.
  - Check: a unit test with a 60-page generated PDF reads 50 pages. A test that feeds random bytes gets the error rather than a crash.

- [ ] **C2. Check file contents, not just names**
  - File: `src/app/api/import/route.ts`.
  - A PDF must start with `%PDF-`. A CSV must be valid UTF-8 text with no NUL bytes.
  - Serve stored files from `/api/file/[id]` with `Content-Security-Policy: sandbox` and `X-Content-Type-Options: nosniff`. Serve CSVs as `text/plain` when shown inline.

## D. Deployment (README and docs only, unless noted)

- [ ] **D1. Recommend a VPN first**
  - File: `README.md`, new section "Reaching SoloFlow from outside your home".
  - Recommend Tailscale (there is an Unraid plugin) or WireGuard (built into Unraid). SoloFlow's privacy check already reports 100.64.0.0/10 as "Your VPN". Link to `docs/security/REMOTE-ACCESS.md`.

- [ ] **D2. Support Cloudflare Tunnel and Access**
  - Docs: step-by-step in `docs/security/REMOTE-ACCESS.md`, covering the `cloudflared` container, a public hostname for SoloFlow, and an Access application with an allow policy for the owner's email.
  - Code (optional, behind an env setting):
    - `SOLOFLOW_CF_ACCESS_AUD` and `SOLOFLOW_CF_ACCESS_TEAM`. When both are set, `src/middleware.ts` checks the `Cf-Access-Jwt-Assertion` header against the team's public keys (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`) and the audience tag. A missing or invalid token returns 403.
    - This stops anyone reaching SoloFlow around the tunnel. SoloFlow's own sign-in still applies.
    - Requests from the LAN, with no header, are allowed only when `SOLOFLOW_CF_ACCESS_LAN_BYPASS=true` and the IP is private.
  - Note in the docs: Cloudflare ends HTTPS at its edge, so statement uploads and balances pass through Cloudflare decrypted.

- [ ] **D3. Support Authelia**
  - Docs: step-by-step in `docs/security/REMOTE-ACCESS.md` for Authelia with a reverse proxy (Nginx Proxy Manager, SWAG or Caddy) using forward auth. Cover one-factor and two-factor policy, and a Let's Encrypt certificate.
  - Code (optional):
    - `SOLOFLOW_TRUSTED_PROXY_IPS`, a comma-separated list. Accept `Remote-User` and `Remote-Email` headers only from those IPs.
    - SoloFlow does not use them to sign anyone in by default. They are only a second gate: when `SOLOFLOW_REQUIRE_PROXY_AUTH=true`, any request without them from a non-private IP gets 403.

- [ ] **D4. Write a pre-exposure checklist**
  - File: `docs/security/REMOTE-ACCESS.md`, a checklist section. Each item is a tick box:
    - A1 to A7, B1 to B4, C1 and C2 done
    - `SOLOFLOW_URL` set to https
    - `SOLOFLOW_TRUST_PROXY=true`
    - Two-step required
    - A backup made, and a restore tested
    - `npm audit` clean, or each finding noted
    - Front-door login (Cloudflare Access or Authelia) in place
    - Port forwarding only to the proxy, never straight to SoloFlow or Postgres

## E. Keeping it up to date

- [ ] **E1. Add dependency checks**
  - Add `npm run audit` (`npm audit --omit=dev`) and a short "Updating" section to the README.
  - Pin exact versions in `package.json` for `next`, `prisma`, `@prisma/client` and `pdfjs-dist`, so builds repeat.

- [ ] **E2. Keep a security log**
  - Add `SecurityEvent { id, userId?, kind, ip?, at, detail Json }`. Record sign-ins, failed sign-ins, lockouts, two-step on and off, password and email changes, sessions signed out, backups, restores and settings changes.
  - Show the newest 50 events for your own account in Profile, and the server-wide list in the admin's Server tab. Keep events for 180 days.
