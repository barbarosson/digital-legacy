# Pro Cloud — encrypted backup + dead-man email

Requires **Digital Legacy Pro** unlock and Supabase env vars.

## What it does

1. **Encrypted cloud backup** — local SQLite **and calendar videos** are packed into a ZIP (`dlvault`), encrypted with the PIN session key (AES-256-GCM, `DLENC1`), and uploaded to private Storage bucket `dm-vaults`. The server cannot read vault contents. Videos stay PIN-encrypted inside the archive as well.
2. **Check-in** — updates `last_checkin_at` (also happens on successful upload).
3. **Dead-man email** — Edge Function `deadman-check` warns the owner, then emails heir addresses. Mail never includes secrets.

Legacy backups that were **database-only** still decrypt and restore.

## App UI

Settings → Digital Legacy Pro → **Pro Cloud** (after Pro unlock).

- **Upload to cloud** — pack DB + videos → encrypt → Storage
- **Download & decrypt** — get a `.zip` (or legacy `.db`) without overwriting the live vault
- **Restore to this device** — apply the latest cloud vault live (auto local backup first; then re-unlock with PIN)

## Env (app)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Mail providers (Edge Function)

Supabase does **not** send arbitrary mail by itself. The function uses a pluggable provider:

| `MAIL_PROVIDER` | Behavior |
|-----------------|----------|
| `auto` (default) | SES if AWS keys + `SES_FROM`; else Resend if `RESEND_API_KEY`; else **off** |
| `off` | No email; logs skip; dead-man **status still advances** (zero cost / dry-run) |
| `ses` | Amazon SES (cheapest at scale) |
| `resend` | Resend API |

### Secrets (Dashboard → Edge Functions → Secrets)

| Secret | When |
|--------|------|
| `MAIL_PROVIDER` | Optional: `auto` / `off` / `ses` / `resend` |
| `AWS_ACCESS_KEY_ID` | SES |
| `AWS_SECRET_ACCESS_KEY` | SES |
| `AWS_REGION` | SES (default `eu-central-1`) |
| `SES_FROM` or `MAIL_FROM` | Verified SES sender, e.g. `Digital Legacy <noreply@yourdomain.com>` |
| `RESEND_API_KEY` | Resend |
| `RESEND_FROM` | Optional Resend from |
| `DEADMAN_CRON_SECRET` | Optional header `x-deadman-secret` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

### Cost tip

- Dev / no mail yet → leave secrets empty → **`off`**
- Production, low cost → **SES** (~$0.10 / 1000 emails)
- Quick free tier → **Resend** free allowance

## Cron

Schedule a daily (or hourly) call:

```
POST https://<project>.supabase.co/functions/v1/deadman-check
Header: x-deadman-secret: <DEADMAN_CRON_SECRET>
```

Options:

1. **GitHub Actions** (repo): `.github/workflows/deadman-cron.yml` — daily `12:00 UTC` + manual `workflow_dispatch`
2. Supabase Dashboard → Edge Functions → deadman-check → Schedules
3. External cron with the same POST

Linked project (app `.env.local`): `https://itvrvouaxcutpetyzhvg.supabase.co`

Response includes `mailProvider` so you can confirm which backend ran.

### Ops checklist

1. Deploy function: `deadman-check` (MCP / `supabase functions deploy deadman-check`) — **done on linked project**
2. Set **matching** `DEADMAN_CRON_SECRET` in:
   - Supabase → Project Settings → Edge Functions → Secrets
   - GitHub repo secret `DEADMAN_CRON_SECRET` (Actions cron) — **GitHub side set**
   - Local copy (gitignored): `.env.deadman.local`
3. Optional mail: `RESEND_API_KEY` (+ `RESEND_FROM`) or SES keys; without them `MAIL_PROVIDER` stays **off** (status still advances, no email)
4. Enable dead-man in the app (Pro Cloud) and save heir emails
5. Check in once so `last_checkin_at` is fresh
6. Trigger Actions workflow **Dead-man cron** once (or POST the function); expect `checked` ≥ 1 when enabled
7. In the app UI, the Pro Cloud section shows days until warning / heir alert

### Auth note

Pro Cloud sign-up uses this project’s Auth. If email confirmation is required in Dashboard → Authentication, confirm the inbox before Sign in works.

## SQL

See `supabase/migrations/0002_cloud.sql` (applied to the linked project).

## Archive format

After decrypting `.dlenc`:

| Kind | Detection | Contents |
|------|-----------|----------|
| `dlvault` (current) | ZIP (`PK…`) | `manifest.json`, `dijital-miras.db`, `videos/*` |
| `legacy-db` | SQLite header | Database only |

## Size note

Supabase Storage free projects often cap single-object size (~50 MB). Large video libraries may need a paid Storage plan or selective export.

## Restore flow

1. **In-app:** Pro Cloud → **Restore to this device** (recommended)
2. **Manual:** Download & decrypt → Backup page → Restore `.db` (videos from the `.zip` can be copied into `data/videos/` if needed)
