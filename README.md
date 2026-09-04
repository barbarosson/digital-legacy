# Digital Legacy

Personal digital legacy planner for Windows. Manage digital assets, heirs, and messages you want left behind. Data stays on this computer (SQLite). Optional Community/Chat uses Supabase when configured.

This repository is **standalone**. Do not mix it with the old monorepo, WinAirPlay, or PixReady.

Phased Store plan: [docs/STORE.md](docs/STORE.md). Privacy: [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md).

## Folder

`C:\Cursor\DigitalLegacy`

## Setup

```bash
cd C:\Cursor\DigitalLegacy
npm install
copy .env.example .env.local
npm run dev
```

App: [http://localhost:3002](http://localhost:3002)

Desktop window:

```bash
npm run electron:dev
```

Windows package:

```bash
npm run electron:build
```

Output is in `release/`. Installed data lives under `%APPDATA%\digital-legacy\data` (Electron `userData`).

## GitHub

- Repo: https://github.com/barbarosson/digital-legacy
- Do **not** commit this app into https://github.com/barbarosson/project or pixready.

## Features

- PIN lock and AES-256-GCM field encryption
- Digital assets, heirs, groups, messages
- Calendar video diary, feed, search
- Inactivity delivery with warning phase
- Backup / restore and GDPR ZIP export
- Optional closed-circuit Community and chat (Supabase)

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, SQLite + Drizzle, Electron.
