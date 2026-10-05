# Pro Cloud — encrypted backup + dead-man email

Requires **Digital Legacy Pro** unlock and Supabase env vars.

## What it does

1. **Encrypted cloud backup** — local SQLite is packed with the PIN session key (AES-256-GCM) and uploaded to private Storage bucket `dm-vaults`. The server cannot read vault contents.
2. **Check-in** — updates `last_checkin_at` (also happens on successful upload).
3. **Dead-man email** — Edge Function `deadman-check` warns the owner, then emails heir addresses. Mail never includes secrets.

## App UI

Settings → Digital Legacy Pro → **Pro Cloud** (after Pro unlock).

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

```
POST https://<project>.supabase.co/functions/v1/deadman-check
Header: x-deadman-secret: <DEADMAN_CRON_SECRET>
```

Response includes `mailProvider` so you can confirm which backend ran.

## SQL

See `supabase/migrations/0002_cloud.sql` (applied to the linked project).

## Restore flow

1. Download & decrypt → `.db` file
2. Backup page → Restore that `.db`
