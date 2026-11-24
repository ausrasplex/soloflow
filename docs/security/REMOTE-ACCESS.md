# Using Folio Away From Home

Folio holds your loan and bank details, so how you reach it from outside matters. Here are your options, best first, and what to sort out before Folio is ever reachable from the internet.

## The Short Version

1. **Use a VPN.** Tailscale is easiest. Nothing is exposed, and it works today.
2. **Want a normal web address without a VPN app?** Put a login page in front of Folio: Cloudflare Access, or Authelia if you'd rather host it yourself. Do the security fixes below first.
3. **Never** forward a router port straight to Folio or to its database.

## Option 1: A VPN (recommended)

Your phone or laptop joins your home network privately, from anywhere. Folio stays invisible to everyone else.

- **Tailscale** has an Unraid plugin and phone apps. Install it on the server and your devices, sign in to the same account, then open Folio at the server's Tailscale address. Folio's privacy check shows these addresses as "Your VPN". It's free for personal use.
- **WireGuard** is built into Unraid (Settings, VPN Manager). It needs a port forwarded on your router, but only for WireGuard itself.

What it costs you: you need the VPN app switched on to reach Folio, and anyone you share with needs it too.

## Option 2: Cloudflare Tunnel With Cloudflare Access

A small Cloudflare program runs on your server and connects out to Cloudflare. Nothing opens on your router. People go to a web address like `folio.yourdomain.com`, and Cloudflare asks them to prove who they are (usually a one-time code emailed to an address you've allowed) before they ever see Folio. Then Folio's own sign-in still applies.

**You need:** a domain name using Cloudflare, a free Cloudflare Zero Trust account, and the `cloudflared` container on Unraid.

**Good:**
- No open ports.
- Strangers never reach Folio.
- Free for personal use.
- Quick to set up.

**Keep in mind:** Cloudflare handles the HTTPS, so your statements and balances pass through Cloudflare's servers unencrypted on their way to you. Most people accept that, but it's a trade-off for financial data.

## Option 3: Authelia (self-hosted login page)

Authelia is a login page you run yourself. It works with a reverse proxy (Nginx Proxy Manager, SWAG or Caddy on Unraid). Every visit has to pass Authelia's sign-in, with its own two-step check, before reaching Folio.

**You need:**
- a domain name
- a port forwarded on your router to the reverse proxy only (443)
- an HTTPS certificate from Let's Encrypt, which the proxy can get for you
- Authelia and its settings

**Good:**
- Everything stays on your own hardware.
- Nothing passes through a third party.
- The same login can protect your other self-hosted apps.

**Keep in mind:** it's more to set up and look after than Cloudflare. Your home address is reachable on port 443, so the proxy and Authelia must be kept up to date.

## Fixes Folio Needs Before It Faces the Internet

These are worth having even on a VPN. Claude Code's version of this list, with the technical detail, is `docs/security/HARDENING-TASKS.md`.

**Signing in**
- Slow down password guessing: after a few wrong tries, make people wait, and block addresses that keep trying.
- Limit wrong two-step codes, and stop the same code being used twice.
- Only believe a visitor's address when it comes from your own proxy.
- Send the sign-in cookie over HTTPS only whenever Folio is used over HTTPS.
- Sessions end after 30 days no matter what, and signing in with two-step starts a fresh session.
- Use one password rule everywhere: at least 12 characters, and not your email or name. Set-up and invites currently allow 8.
- Let the admin require two-step for everyone. The Server tab shows this as "Later" today.

**Pages and requests**
- Add the standard browser security settings that stop other sites from framing or injecting into Folio.
- Refuse changes that come from another website.
- Make invite links really work only on your network. The invite screen already says they do, but nothing checks it yet.
- Put sensible size and speed limits on uploads and changes.

**Statement files**
- Read PDFs in a separate, time-limited process, so a broken or hostile file can't hang the server.
- Check uploaded files really are PDFs or CSVs, whatever they're called.

**Looking after it**
- Check the app's building blocks for known problems before each update.
- Keep a record of sign-ins, lockouts and security changes that you can view in your profile.

**Optional extras with Cloudflare or Authelia**
- Folio can check that a visit really came through Cloudflare Access, so nobody can reach it around the tunnel.
- Folio can refuse any outside visit that didn't come through Authelia.

## Before You Go Public: Checklist

- [ ] All the fixes above are done
- [ ] Two-step verification is required for everyone
- [ ] Folio's address is set to an `https://` address
- [ ] Folio knows it's behind a proxy
- [ ] Cloudflare Access or Authelia is in front, and it works
- [ ] Your router forwards nothing to Folio or its database directly
- [ ] A fresh backup is made, and a test restore worked
- [ ] Folio and its building blocks are up to date
