# Running SoloFlow on Unraid

SoloFlow runs as one container (`ghcr.io/ausrasplex/soloflow`) next to a PostgreSQL container. The template is
`unraid/soloflow.xml`. Database changes are applied automatically every time the container starts.

## 1. Make the image available

GitHub builds the image on every push to `main` (`.github/workflows/docker.yml`) and publishes it to GitHub
Container Registry. While the repository is private, the image is private too. Either:

- make the package public: on GitHub open the repository, then **Packages > soloflow > Package settings > Change
  visibility > Public** (the code stays private), or
- keep it private and sign Unraid in to the registry once, from the Unraid terminal:
  `docker login ghcr.io -u ausrasplex` with a GitHub personal access token that has `read:packages`.

The template's icon is loaded from the repository, so it only shows once the repository (or the icon) is public.

## 2. PostgreSQL

1. In **Apps**, install a PostgreSQL 16 container (for example `postgresql16`). Set its password and keep port 5432.
2. Open its console (Docker tab, click the icon, **Console**) and make the database:

   ```
   psql -U postgres -c "CREATE USER soloflow WITH PASSWORD 'pick-a-password';"
   psql -U postgres -c "CREATE DATABASE soloflow OWNER soloflow;"
   ```

## 3. Add the SoloFlow template

Copy the template into Unraid's user templates, from the Unraid terminal:

```
wget -O /boot/config/plugins/dockerMan/templates-user/my-SoloFlow.xml \
  https://raw.githubusercontent.com/ausrasplex/soloflow/main/unraid/soloflow.xml
```

(While the repository is private, copy `unraid/soloflow.xml` to that path another way, for example from your computer
to the flash share at `\\tower\flash\config\plugins\dockerMan\templates-user\my-SoloFlow.xml`.)

Then **Docker > Add Container > Template: SoloFlow**.

## 4. Fill in the template

| Setting | What to enter |
| --- | --- |
| Web port | 3000, or any free port |
| Backups | `/mnt/user/appdata/soloflow/backups` (the default) |
| Database URL | `postgresql://soloflow:pick-a-password@UNRAID-IP:5432/soloflow?schema=public`. Use the server's IP address, not `localhost`: the containers are separate. |
| Secret | A long random string. Make one in the Unraid terminal with `openssl rand -base64 32`. |
| Address (optional) | How people reach SoloFlow, for example `http://tower.local:3000`, for links in alerts and invites |

**Keep a copy of the Secret somewhere safe (for example your password manager) and never change it.** It encrypts
account numbers, BSBs and two-step secrets. A backup restored without the same secret cannot read them.

The template runs the container as Unraid's `nobody:users` (99:100), so backups in appdata get the usual owner.

## 5. First visit

Open the WebUI. The first visit asks you to make the admin account and your business. Then add your banks and
accounts, and import statements.

## Installing It as an App

SoloFlow can be installed as its own app (its own window and icon, no address bar or tabs) on a computer, an Android
phone or an iPhone. Browsers only allow a real install from an HTTPS address. From a plain `http://` address, Chrome's
"Install" only makes a shortcut that opens in a normal browser window, with the address bar still showing.

Give SoloFlow an HTTPS address in one of these ways:

- **Tailscale (easiest):** install the Tailscale plugin on Unraid, turn on MagicDNS and HTTPS certificates in the
  Tailscale admin console, then run `tailscale serve --bg 3000` on Unraid. SoloFlow is then at
  `https://tower.your-tailnet.ts.net` on every device in your tailnet, at home or away.
- **A reverse proxy:** Nginx Proxy Manager or SWAG with your own domain and a Let's Encrypt certificate (the DNS
  challenge works for addresses only used at home).

Then set **Address** to the HTTPS address and **Secure cookies** to `true` in the template, and apply.

To install:
- **Chrome or Edge on a computer:** open the HTTPS address, then the install icon at the right of the address bar
  (or the menu, **Cast, save and share > Install page as app**).
- **Android (Chrome):** menu, **Add to home screen > Install**.
- **iPhone or iPad (Safari):** Share, **Add to Home Screen**.

If you installed SoloFlow from an `http://` address before, uninstall that copy first, then install from the HTTPS
address.

For a quick test on one computer only, Chrome can treat one `http://` address as secure: open
`chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://YOUR-UNRAID-IP:3000`, and restart Chrome.

The installed app never stores your statements or figures on the device. It keeps only icons and the app's code, and
shows a "Can't Reach SoloFlow" page when the server is unreachable.

## Updating

Docker tab, **Check for Updates**, then **Apply Update**. Migrations run when the container starts.

## Backups

The admin's Settings > Server tab sets automatic backups (daily or weekly, keeping 7, 14 or 30) into the Backups
folder. Include `/mnt/user/appdata/soloflow/backups` in your own backups (for example the Appdata Backup plugin), and
back up the PostgreSQL appdata too.

## Reaching it away from home

Use a VPN such as Tailscale or WireGuard. Don't expose SoloFlow to the internet until the work in
`docs/security/REMOTE-ACCESS.md` is done.
