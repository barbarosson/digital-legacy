# Faz 2 — Dedicated Supabase project (Store-ready)

Digital Legacy Pro Cloud leaves the shared Modulus ERP project (`itvrvouaxcutpetyzhvg`) and runs on its own Supabase project.

## Why

- Auth confirmation / SMTP isolated from ERP and iSendAI triggers  
- Storage, RLS, Edge secrets scoped to this product  
- Safer for Microsoft Store production  

## You create the project (once)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. Organization: your Modulus / personal org  
3. **Name:** `digital-legacy`  
4. **Database password:** generate and store in a password manager (not git)  
5. **Region:** `Frankfurt (eu-central-1)` (or closest EU)  
6. Plan: Free is OK for Store launch testing; upgrade if Storage/Auth limits bite  
7. Create project → wait until healthy  

### Copy these (Settings → API)

| Value | Where it goes |
|--------|----------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` |
| Project ref (subdomain) | CLI / docs / GitHub secret `DIGITAL_LEGACY_SUPABASE_URL` |

Paste URL + anon key into the Digital Legacy chat (or put them in `.env.local` yourself) so the agent can finish schema + function deploy.

Do **not** commit keys. Do **not** paste the `service_role` key into chat unless required for a one-time migrate; prefer Dashboard SQL + CLI login.

## Agent / CLI finishes

1. Apply `supabase/migrations/0002_cloud.sql` (tables, RLS, `dm-vaults` bucket)  
2. Deploy Edge Function `deadman-check` (`verify_jwt = false`)  
3. Set Edge secrets: `DEADMAN_CRON_SECRET`, `MAIL_PROVIDER=auto`, `RESEND_API_KEY`, `RESEND_FROM`  
4. Auth → URL config: `http://127.0.0.1:3002`, `http://localhost:3002/**`  
5. Auth → Email confirm ON + Custom SMTP (Resend) — same as before, on **this** project  
6. Update GitHub Actions cron URL (`DIGITAL_LEGACY_SUPABASE_URL` secret)  
7. Smoke: Sign up → confirm mail → Upload  

## After cutover

| Old shared project | Action |
|--------------------|--------|
| `dm_cloud_*`, `dm_vault_backups` | Leave until smoke OK, then deprecate |
| `dm-vaults` bucket | Same |
| `deadman-check` function | Disable or delete after new cron points to new URL |

Test users on the old project must **sign up again** on the new project (expected; few/test accounts).

## App env

```env
NEXT_PUBLIC_ENABLE_COMMUNITY=false
NEXT_PUBLIC_SUPABASE_URL=https://<NEW_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
```
