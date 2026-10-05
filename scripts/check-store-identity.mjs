/**
 * Validates Partner Center identity env vars before `npm run electron:msix`.
 * Does not print secret CN beyond length checks.
 */
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

Set them from Partner Center → App identity, then retry:
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
console.log("Ready for: npm run electron:msix");
