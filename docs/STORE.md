# Microsoft Store — phased plan

Product name stays **Digital Legacy** until a Partner Center reservation exists.

**Version:** `1.0.0` · npm package name: `digital-legacy`

**Store listing (reserved):** [Digital Legacy](https://apps.microsoft.com/detail/9P579XWZ748T) · Store ID `9P579XWZ748T`  
Publisher display name: **MODULUSTECH** · Identity name: `MODULUSTECH.DigitalLegacy`

Put Package Identity values in **`.env.store`** (gitignored). Do not commit Publisher CN.

## Phase 1 — Run locally

```bash
cd C:\Cursor\DigitalLegacy
npm install
npm run electron:dev
```

Browser-only: `npm run dev` then open http://localhost:3002

Smoke tests: `npm run test:smoke`

Community / Chat stay **off** unless `NEXT_PUBLIC_ENABLE_COMMUNITY=true` is set. Store / MSIX builds force Community **off**. Do not enable Community for the first Store submission (UGC report/block is not built yet).

## Phase 2 — Ready before the Store account (done in repo)

- English default UI; Turkish optional in Settings
- English panel routes (`/login`, `/panel/assets`, …) with permanent redirects from legacy Turkish paths
- Responsive sidebar (drawer under `lg`)
- Electron min window 960×640; English notification titles
- Playwright smoke suite (`tests/smoke.spec.ts`)
- Screenshot script includes Pro Cloud scroll (`08-pro-cloud`); regenerate with `npm run screenshots` while `npm run dev` is up
- Privacy policy + public Pages URL
- Icons / listing assets / NSIS + MSIX scripts
- Pro Cloud + dead-man + IAP skeleton (demo codes disabled in Store builds)

Public privacy URL:

- https://barbarosson.github.io/digital-legacy/privacy/

Monetization:

- Free: core vault
- Pro: trusted contacts, USB reminders, Pro Cloud, dead-man email
- Sideload unlock codes: `DIGITAL-LEGACY-PRO` / `DL-PRO-2026`
- Store IAP product id: `STORE_PRO_PRODUCT_ID` (default `digital_legacy_pro`)

Still needed before upload (Phase 3):

- Partner Center developer account + app identity
- Pro add-on + StoreContext purchase UI
- Fresh Pro Cloud screenshot if Store listing needs it
- WACK on a clean PC

## Phase 3 — Microsoft Store submission (step by step)

Do this on a Windows 10/11 PC. Keep Community **off**. Product name: **Digital Legacy**. Privacy URL (paste in listing):

https://barbarosson.github.io/digital-legacy/privacy/

### A. One-time Partner Center setup

1. Open [Partner Center](https://partner.microsoft.com/dashboard) and create an **individual or company** Windows developer account (~USD 19, one-time).
2. Complete identity / tax / payout profile if prompted (needed before paid IAP).
3. **Create a new app** → reserve the name **Digital Legacy** (or the free English name you choose — then keep `package.json` `build.productName` in sync).
4. Open the app → **Product management → Product identity**. Copy into **`.env.store`** (gitignored; see `.env.example`):
   - Package/Identity **Name** → `STORE_IDENTITY_NAME` (e.g. `MODULUSTECH.DigitalLegacy`)
   - **Publisher** (`CN=…`) → `STORE_PUBLISHER`
   - **Publisher display name** → `STORE_PUBLISHER_DISPLAY` (e.g. `MODULUSTECH`)
5. Do **not** commit `.env.store` to git.

### B. Local identity check

In PowerShell:

```powershell
cd C:\Cursor\DigitalLegacy

$env:STORE_IDENTITY_NAME = "YourIdentityNameFromPartnerCenter"
$env:STORE_PUBLISHER = "CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
$env:STORE_PUBLISHER_DISPLAY = "Your Publisher Display Name"
# optional:
# $env:STORE_PRO_PRODUCT_ID = "digital_legacy_pro"

npm run store:check-identity
```

You should see `Store identity OK`. If it exits with “incomplete”, fix the three env vars and retry.

### C. Build the Store package (MSIX / AppX)

```powershell
cd C:\Cursor\DigitalLegacy
npm install
npm run electron:msix
```

- Output lands under `release\` (`.appx` / `.msix` from electron-builder).
- This run sets `DIGITAL_LEGACY_STORE_BUILD=true` so **demo unlock codes are disabled**.
- NSIS (`npm run electron:build`) is for sideload/website installers only — **not** for Store upload.

### D. Sideload smoke on a clean PC

1. Use a Windows 10/11 machine **without** requiring Node for the end user.
2. Enable Developer Mode or sideloading if needed for local install.
3. Double-click / `Add-AppxPackage` the built package.
4. Launch **Digital Legacy**, set a PIN, open Overview / Settings / Backup.
5. Confirm: unlock works over `http://127.0.0.1`, notifications optional, Community not visible.

### E. Windows App Certification Kit (WACK)

1. Install [Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/) (includes WACK).
2. Run WACK against the installed Store package.
3. Fix any **failures** before upload (warnings: review case by case).
4. Keep the report for your records.

### F. Store listing assets

English UI only for v1 screenshots.

```powershell
# Terminal 1
cd C:\Cursor\DigitalLegacy
npm run dev

# Terminal 2 (after the app answers on :3002)
npm run screenshots
```

Upload from `docs/screenshots/*-1920.png` (and `08-pro-cloud` if present).  
Store logo / icons: `public/store-listing-300.png`, `build\` tiles, `build/icon.ico`.

### G. Upload in Partner Center

1. **Packages** → upload the `.appx` / `.msix` from `release\`.
2. **Store listings** (en-US at minimum):
   - Description, what’s new, screenshots
   - **Privacy policy URL:** `https://barbarosson.github.io/digital-legacy/privacy/`
3. **Age ratings** → Productivity / suitable questionnaire answers.
4. **Properties / capabilities:** note full-trust desktop (local Node server, SQLite, camera, mic, notifications).
5. **Notes for certification** (suggested text):

```
Digital Legacy is a full-trust Win32 desktop app packaged as MSIX.
It runs a local Next.js server on 127.0.0.1, uses SQLite under the app data folder,
optional camera/microphone for a private video diary, and Windows notifications.
Community/chat features are disabled in this Store build.
No network is required for the core vault.
```

6. Submit for certification.

### H. Pro IAP (can ship after free v1 if needed)

1. Partner Center → **Add-ons** → durable / subscription for Pro.
2. Product ID should match `STORE_PRO_PRODUCT_ID` (default `digital_legacy_pro`).
3. Wire `Windows.Services.Store` / `StoreContext` in `electron/main.mjs` (preload already exposes `window.digitalLegacyStore`).
4. Re-test purchase + restore on a Store-installed build (not NSIS).

### I. After publish

- Install from the Store on a clean PC and repeat the smoke path.
- Monitor Partner Center certification feedback.
- Do **not** enable Community until in-app report/block exists.

---

### Already prepared in this repo (no Partner Center needed)

- Electron preload IAP bridge: `window.digitalLegacyStore`
- Identity preflight: `npm run store:check-identity`
- MSIX script stops cleanly if identity env is missing
- NSIS desktop build: `npm run electron:build` (non-Store)

Do not add Community to the Store listing until in-app report and block exist.
