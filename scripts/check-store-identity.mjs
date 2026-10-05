/**
 * Validates Partner Center identity env vars before `npm run electron:msix`.
 * Loads `.env.store` if present (gitignored).
 */
import { loadStoreEnv } from "./load-store-env.mjs";

loadStoreEnv();

const required = [
  "STORE_IDENTITY_NAME",
  "STORE_PUBLISHER",
  "STORE_PUBLISHER_DISPLAY",
];

const missing = required.filter((key) => !process.env[key]?.trim());
const productId =
  process.env.STORE_PRO_PRODUCT_ID?.trim() || "digital_legacy_pro";

if (missing.length) {
  console.error(`Store identity incomplete. Missing:

  ${missing.join("\n  ")}

Create .env.store in the project root (see .env.example) or set env vars, then retry:
  npm run electron:msix

Optional:
  STORE_PRO_PRODUCT_ID=${productId}

See docs/STORE.md Phase 3.
`);
  process.exit(1);
}

const publisher = process.env.STORE_PUBLISHER.trim();
if (!publisher.startsWith("CN=")) {
  console.error(
    'STORE_PUBLISHER should look like: CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
  );
  process.exit(1);
}

console.log("Store identity OK");
console.log(`  STORE_IDENTITY_NAME=${process.env.STORE_IDENTITY_NAME.trim()}`);
console.log(`  STORE_PUBLISHER_DISPLAY=${process.env.STORE_PUBLISHER_DISPLAY.trim()}`);
console.log(`  STORE_PUBLISHER=CN=… (${publisher.length} chars)`);
console.log(`  STORE_PRO_PRODUCT_ID=${productId}`);
if (process.env.STORE_ID) {
  console.log(`  STORE_ID=${process.env.STORE_ID.trim()}`);
}
console.log("Ready for: npm run electron:msix");
