# Deploy to Hostinger

Atelier is a standard Node.js Next.js app. Works on any Hostinger plan that exposes Node.js (Cloud, Business, VPS).

## 1. Upload + extract

Hostinger panel → **Files → File Manager** → `public_html/`. Upload `atelier-template-latest.zip`, right-click → **Extract**.

## 2. Create the Node.js app

Hostinger panel → **Advanced → Node.js → Create application**.

| Field | Value |
|---|---|
| Application mode | Production |
| Node.js version | **22 LTS** (or 20 / 24 — anything ≥ 20.9) |
| Application root | extracted folder, e.g. `public_html/atelier` |
| Application URL | your domain or subdomain |
| Startup file | `node_modules/next/dist/bin/next` · args `start` |

Leave env vars empty — SMTP and analytics are configured later from the admin UI.

## 3. Install + build

In the Node.js panel click **Run NPM Install**. When it finishes, open **Terminal**:

```bash
cd ~/public_html/atelier
npm run build
```

Click **Restart Application**. Site is live.

## 4. First-time setup

Visit your URL → the **Atelier wizard** opens. Pick a template, fill business info, create the admin account, install. ~2 minutes.

## 5. Wire up email + analytics (optional)

Admin → **Settings → General** → SMTP fields (host, port, user, pass, from). Send test. Booking confirmations + 8h reminders start flowing.

GA4 / GTM / Meta Pixel IDs go in **Settings → Analytics**.

## 6. Ongoing

- Edit content with the ✎ pencils (visible only when admin is signed in)
- Backup any time from **Admin → Settings → Tools → Download backup**
- Restore from a `.json` snapshot the same way
- Pull a fresh ZIP from your customer portal at `/support/account` any time you want to upgrade. Drop `data/` from the old install into the new one.

## Environment variables

The customer template reads a small set of env vars at build/runtime. Set these
in your Hostinger Node.js panel (or `.env.local` for local dev).

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **yes** | Full URL of the site root, e.g. `https://yoursalon.com`. Without it, canonical URLs, the sitemap, and password-reset email links all fall back to `yoursalon.local` and point nowhere useful. |
| `ATELIER_LICENSE_URL` / `NEXT_PUBLIC_ATELIER_LICENSE_URL` | no | License validation endpoint on the mothership. Defaults to `https://atelier.mindscrollers.com/api/licenses/validate`. Override only if you host a custom mothership. |
| `ATELIER_TEMPLATE_DOWNLOAD_URL` / `NEXT_PUBLIC_ATELIER_TEMPLATE_DOWNLOAD_URL` | no | License-gated download endpoint behind the `Admin → Update → Download & stage update` button. Defaults to `https://atelier.mindscrollers.com/api/template-download`. Override only if you host a custom mothership. |
| `DEMO_MODE` | no | Set `1` to show the gold "demo" banner. Omit or set `0` on live customer sites. |
| `DEMO_RESET_SECRET` | no | Secret token for the `GET /api/cron/demo-reset?secret=` nightly reset endpoint. Only needed if you run the demo reset cron. |

## Troubleshooting

| Symptom | Fix |
|---|---|
| 502 / app won't start | Hostinger Node.js panel → Logs. Most often missing `npm run build`. |
| `/admin` infinite-loops to `/setup` | `data/settings.json` has `"onboarded": false`. Run the wizard, or set it to `true`. |
| Photos broken | CSP blocks the host. `next.config.ts` already allows `images.unsplash.com` — add yours to `images.remotePatterns`. |
| Email never arrives | SMTP credentials wrong. Test in **Settings → Send test email**. Check `data/emails.log.json` for queued items. |
| Logo doesn't appear | Hard refresh — SVG cache pinned 5 min via `next.config.ts`. Or check `data/settings.json.branding.logoUrl` exists. |
