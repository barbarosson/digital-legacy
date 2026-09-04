# Microsoft Store — phased plan

Product name stays **Digital Legacy** until a Partner Center reservation exists.

## Phase 1 — Run locally (now)

```bash
cd C:\Cursor\DigitalLegacy
npm install
npm run electron:dev
```

Browser-only: `npm run dev` then open http://localhost:3002

Community / Chat stay **off** unless `NEXT_PUBLIC_ENABLE_COMMUNITY=true` is set. Do not enable this for the first Store submission (UGC report/block is not built yet).

## Phase 2 — Ready before the Store account (this repo)

Already in the repo:

- English default UI and product name
- Isolated GitHub: https://github.com/barbarosson/digital-legacy (private)
- Privacy policy: `docs/PRIVACY_POLICY.md` + public HTML: `docs/privacy/index.html`
- App icons: `build/icon.ico`, `public/icon-256.png`, Store listing `public/store-listing-300.png`
- Screenshots (1920×1200): `docs/screenshots/*-1920.png`
- Electron shows an error dialog if the local server fails to start
- NSIS desktop build: `npm run electron:build`
- MSIX script waits for Partner Center identity: `npm run electron:msix`

Still needed before upload:

- **Public HTTPS privacy URL** — enable GitHub Pages (Settings → Pages → Deploy from branch `main` / folder `/docs`). Target URL:
  `https://barbarosson.github.io/digital-legacy/privacy/`
  (Private repos need GitHub Pro for Pages, or make the repo public / host elsewhere.)
- Partner Center developer account + app identity (Phase 3)

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

Do not add Community to the Store listing until in-app report and block exist.
