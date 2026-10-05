/**
 * Microsoft Store in-app purchase (IAP) skeleton.
 *
 * Until Partner Center IAP is configured, this module:
 * - documents the product id
 * - exposes a pluggable license check hook for Electron / Windows Runtime
 * - keeps demo unlock codes as a separate path (disabled in Store builds)
 */

export const STORE_PRO_PRODUCT_ID =
  process.env.STORE_PRO_PRODUCT_ID?.trim() || "digital_legacy_pro";

export type StoreLicenseStatus = {
  /** True when running inside a Store / MSIX package build flag. */
  storeBuild: boolean;
  /** Product id expected in Partner Center. */
  productId: string;
  /**
   * Whether a Store license was verified.
   * Always false until Windows.Services.Store (or electron-store bridge) is wired.
   */
  licensed: boolean;
  /** Human-readable reason for UI. */
  reason: "not_wired" | "not_store_build" | "licensed" | "not_licensed";
};

/** Store / MSIX builds set DIGITAL_LEGACY_STORE_BUILD=true at pack time. */
export function isStoreBuild(): boolean {
  return (
    process.env.DIGITAL_LEGACY_STORE_BUILD === "true" ||
    process.env.DIGITAL_LEGACY_STORE_BUILD === "1"
  );
}

/**
 * Demo unlock codes are for sideload / early access only.
 * Store builds must not accept them (Partner Center IAP is the path).
 */
export function allowDemoUnlockCodes(): boolean {
  if (isStoreBuild()) return false;
  if (process.env.DIGITAL_LEGACY_ALLOW_DEMO_CODES === "false") return false;
  return true;
}

/**
 * Placeholder Store license probe.
 * Wire to Electron preload → Windows Store CurrentApp / StoreContext later.
 */
export async function probeStoreProLicense(): Promise<StoreLicenseStatus> {
  const storeBuild = isStoreBuild();
  const productId = STORE_PRO_PRODUCT_ID;

  // Optional future hook: ELECTRON_STORE_LICENSE=true injected by main process
  if (process.env.ELECTRON_STORE_PRO_LICENSE === "true") {
    return {
      storeBuild,
      productId,
      licensed: true,
      reason: "licensed",
    };
  }

  if (!storeBuild) {
    return {
      storeBuild,
      productId,
      licensed: false,
      reason: "not_store_build",
    };
  }

  return {
    storeBuild,
    productId,
    licensed: false,
    reason: "not_wired",
  };
}
