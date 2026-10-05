import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadStoreEnv } from "./load-store-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadStoreEnv();

const identityName = process.env.STORE_IDENTITY_NAME?.trim();
const publisher = process.env.STORE_PUBLISHER?.trim();
const publisherDisplay = process.env.STORE_PUBLISHER_DISPLAY?.trim();

if (!identityName || !publisher || !publisherDisplay) {
  console.error(`MSIX build needs Partner Center identity.

Create .env.store (gitignored) or set:

  STORE_IDENTITY_NAME
  STORE_PUBLISHER          (example: CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
  STORE_PUBLISHER_DISPLAY

Then: npm run store:check-identity && npm run electron:msix

See docs/STORE.md. NSIS installers do not need these: npm run electron:build
`);
  process.exit(1);
}

execSync(
  `npx electron-builder --win appx --config.appx.identityName="${identityName}" --config.appx.publisher="${publisher}" --config.appx.publisherDisplayName="${publisherDisplay}"`,
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
      // Disable demo unlock codes inside Store packages.
      DIGITAL_LEGACY_STORE_BUILD: "true",
    },
  },
);

console.log("Rebuilding better-sqlite3 for system Node...");
execSync("npm rebuild better-sqlite3", {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
