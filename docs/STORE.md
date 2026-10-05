# Microsoft Store — phased plan

Product name stays **Digital Legacy** until a Partner Center reservation exists.

**Version:** `1.0.0` · npm package name: `digital-legacy`

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

## Phase 3 — When the Store account arrives

1. One-time Microsoft developer account (~$19).
2. Partner Center → reserve the name **Digital Legacy** (or keep this name if it is free).
3. Copy Identity values into the environment (do not commit secrets):

```
STORE_IDENTITY_NAME=...
STORE_PUBLISHER=CN=...
STORE_PUBLISHER_DISPLAY=...
```

4. `npm run electron:msix`
5. Sideload the `.appx` / `.msix` on a clean Windows 10/11 PC with no Node installed.
6. Run the Windows App Certification Kit.
7. Upload the package. Paste the privacy URL. Age rating: Productivity. Notes for certification: full-trust desktop app because it runs a local Node server, SQLite, camera, and notifications. Community is off.
8. Screenshots must show the English UI.
9. Create durable Pro add-on (`digital_legacy_pro` or set `STORE_PRO_PRODUCT_ID`) and connect StoreContext in Electron.

Do not add Community to the Store listing until in-app report and block exist.
