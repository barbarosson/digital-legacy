# Digital Legacy — Privacy Policy

Last updated: 3 September 2026

Digital Legacy is a Windows desktop app for planning a personal digital estate: assets, heirs, messages, and optional video diary entries.

## Data we store on your computer

The app stores data locally on the device where it is installed, typically under your Windows user profile (`%APPDATA%`). This includes:

- A PIN hash used to unlock the app
- Digital asset notes (accounts, documents, instructions, optional password notes)
- Heir and group details
- Messages intended for delivery
- Calendar memories, videos, and thumbnails
- Backup copies you create
- Appearance and reminder preferences

Sensitive fields are encrypted with AES-256-GCM. The PIN is required to decrypt them. If you forget the PIN, the encrypted data cannot be recovered.

Video diary files and thumbnails on disk are also encrypted with the same PIN-derived key. They can only be played after you unlock the app with your PIN. Older plaintext media files are upgraded to encrypted form the next time they are opened while unlocked.

Videos and the SQLite database never leave your computer unless you export a backup, use GDPR export, enable optional Community features, or enable optional **Pro Cloud** backup.

## Camera and microphone

The in-app camera records daily videos only when you start a recording. Camera and microphone access are used for that purpose. Recordings stay on this device.

## Notifications

If you enable the daily reminder, the desktop app may show a Windows notification at the time you choose. Reminders run only while the app is open.

## Network

The core vault does not require an internet connection.

Optional **Pro Cloud** (paid) can upload an **encrypted** copy of your database to Supabase Storage and store dead-man alert email addresses so a scheduled job can warn you or notify heirs after prolonged missed check-ins. Cloud backups are encrypted with your device PIN session key; we cannot read vault contents. Alert emails do not include passwords or decrypted vault data. Email delivery may use a third-party provider (for example Resend).

Optional Community and Chat (disabled in the Store v1 build unless you turn them on) use a third-party backend (Supabase) for accounts, posts, and messages between connected users. If you enable that feature, the privacy terms of that service also apply, and you should review what you share with other users.

## Your controls

You can:

- Change or remove local records inside the app
- Download a database backup
- Export a decrypted ZIP archive of your data (keep it in a safe place)
- Uninstall the app; local data under `%APPDATA%` may remain until you delete it

## Children

Digital Legacy is not directed at children under 13.

## Contact

Support contact will be published on the Microsoft Store listing when the app is submitted. Until then, use the GitHub repository associated with this product.
