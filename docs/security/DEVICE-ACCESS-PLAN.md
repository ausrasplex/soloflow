# Device-Bound Access and Encryption (future plan)

Status: idea, planned for later. Nothing here is built yet.
Belongs in the Folio repo at `docs/security/DEVICE-ACCESS-PLAN.md`.
Builds on `docs/security/HARDENING-TASKS.md`, especially tasks A3 (trusted client IP) and B3 (home-network-only invites).

## The Goal

A device can only use Folio if it was registered while on the home network (or its VPN). A device without its key can't sign in, and can't connect at all when the front-door options are used. Optionally, the most sensitive details can only be read on registered devices, even by the server.

## Decision So Far

- **Do:** Part 1 (passkeys, registered only at home) and Part 2 (device certificates at the front door).
- **Maybe later:** Part 3 (account numbers and BSBs readable only on registered devices).
- **Not planned:** Part 4 (full end-to-end encryption of everything). It would break statement import on the server, forecasts, alerts and backups. The reasons are listed below so the choice can be revisited.

## Part 1: Passkeys, Registered Only at Home

**What the person sees**
- In Profile, under Devices, there's an "Add this device" button that only works on the home network or VPN. Elsewhere it says "Connect to your home network or VPN to add this device."
- Adding a device creates a passkey, unlocked with Face ID, a fingerprint, Windows Hello or the device PIN. The key stays in the device's secure chip and can't be copied.
- Away from home, signing in needs a registered passkey. A password alone is refused, with the message "Sign in from a device you've added at home."
- Each device is listed with a name, when it was added, when it was last used, and a Remove button (confirm, red, Restore within 30 days).

**Admin settings (Server tab)**
- Remote sign-in rule, one of:
  - Off (today's behaviour)
  - Passkey required away from home (recommended)
  - Passkey required everywhere
- New devices can be added from: home network and VPN only (default), or anywhere.

**How it works**
- WebAuthn through `@simplewebauthn/server` and `@simplewebauthn/browser`.
- New model:
  - `Passkey { id, userId, credentialId (unique), publicKey Bytes, counter Int, transports String[], name, createdAt, lastUsedAt, createdIp, removedAt? }`
- Registration checks the client IP (from task A3) is private or in 100.64.0.0/10. It requires a signed-in session that passed two-step within the last 10 minutes.
- "Away from home" is decided by the same trusted client IP. That makes task A3 a hard prerequisite: without it, a faked header could pretend to be at home.
- A passkey can replace the password and two-step code (passwordless), or count as the second step. Decide which (see open questions).
- Every add, remove and refused sign-in goes in the security log (task E2).

**Recovery**
- Recovery codes still work, but only on the home network.
- The admin can remove a lost device's passkeys from the Server tab.
- If the admin loses every device, they reset on the server's own console with a command, `npm run reset-passkeys -- <email>`.

**Done when**
- An e2e test can register a passkey from a private IP (Playwright's virtual authenticator).
- Registering from a public IP is refused.
- With "Passkey required away from home" on, a password-only sign-in from a public IP is refused.

## Part 2: Device Certificates at the Front Door (mutual TLS)

Each device gets a certificate. The front door (Cloudflare, or the reverse proxy in front of Authelia) drops any connection without one, so a stranger never reaches Folio's sign-in page.

**Setup outline (documentation only, plus a helper script)**
- Run a small private certificate authority on Unraid: `step-ca` in a container, or a script using `openssl`. A helper script `tools/device-cert.sh <device-name>` would make a `.p12` file and a one-time password to install it.
- Install the `.p12` on each device (iOS and Android profile, macOS Keychain, Windows certificate store). Do this at home, then delete the file.
- **Option A, Cloudflare:** upload the CA to Cloudflare and add a rule blocking requests without a valid client certificate. Check which Cloudflare plan this needs (see open questions).
- **Option B, Authelia:** in Caddy, Nginx Proxy Manager or SWAG, require client certificates (`ssl_verify_client on` in Nginx, `client_auth { mode require_and_verify }` in Caddy) before forwarding to Authelia and Folio.
- Keep a revocation list. Removing a device means revoking its certificate and reloading the proxy.
- Folio itself needs no code changes. Optionally, the proxy passes the certificate's device name in a header, and Folio shows it in the Devices list (trusted only from `SOLOFLOW_TRUSTED_PROXY_IPS`).

**Trade-off:** each new device needs a manual install. Some apps and browsers handle client certificates clumsily, especially on iOS. Passkeys (Part 1) are smoother, so Part 2 is the extra wall, not the only one.

## Part 3 (maybe later): Sensitive Details Readable Only on Registered Devices

Encrypt only account numbers, BSBs and customer IDs in the browser, with a key the server never sees. Folio rarely needs these, so nothing else is lost.

**How it would work**
- A household data key (AES-GCM 256) is made in the browser of the first registered device.
- Each registered device has its own key pair. The private key is stored as a non-extractable WebCrypto key in IndexedDB, or derived from the passkey using the WebAuthn PRF extension where the device supports it.
- The household data key is stored on the server once per device, wrapped with that device's public key. The server stores only wrapped keys and ciphertext.
- Adding a device: an already-registered device, at home, wraps the data key for the new one. This is an approve-on-the-other-device step.
- Removing a person: make a new data key, re-encrypt the few fields and re-wrap for the remaining devices.
- A printed recovery key also wraps the data key. Losing every device and the recovery key means those details are gone for good (the rest of Folio is unaffected).

**What changes:** the server can no longer show these fields in exports, backups (they stay encrypted inside), or the import check that matches statements by account suffix. That check would need the last two digits stored separately, in the clear, which is acceptable.

## Part 4 (not planned): Full End-to-End Encryption

Considered and set aside, because:
- **Statement reading and checks would move to the browser.** PDF and CSV reading, layout matching, checks and interest re-working all run on the server today.
- **Scheduled work would stop.** Alerts (missing statements, rate reviews, behind schedule), automatic backups of readable data and the privacy check need the server to read data while devices are off.
- **Sharing in a household gets complex.** Every change to who is on a loan means key re-wrapping.
- **A web app can't fully guarantee it.** The server sends the app's code each visit, so a compromised server could send code that takes the key. Only an installed, signed app avoids that.

Revisit if Folio ever gets an installed app (for example a desktop or mobile wrapper) and the server-side features above become optional.

## Open Questions

1. Should a passkey replace the password and two-step code completely, or count as the second step after the password?
2. Should registration be allowed over the VPN, or only on the local network itself?
3. How many devices per person? Is there a limit, and does each household member manage only their own?
4. Cloudflare: which plan supports blocking requests without a client certificate, and does it work with Cloudflare Tunnel? Check before choosing Option A.
5. Is Part 3 worth doing once Parts 1 and 2 are in place?
6. Does the WebAuthn PRF extension work on every device you use (iPhone, Android, Windows, Mac browsers)? If not, Part 3 needs the IndexedDB key route.

## Suggested Order

1. Finish hardening tasks A3, A4 and B3 (trusted client IP, secure cookies, home-only invites).
2. Part 1, passkeys registered only at home.
3. Part 2, device certificates, when Folio is reachable from outside.
4. Decide on Part 3.
