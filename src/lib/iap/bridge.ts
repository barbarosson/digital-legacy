export type DigitalLegacyStoreBridge = {
  getLicenseStatus: () => Promise<{
    productId: string;
    windowsStore: boolean;
    storeBuild: boolean;
    licensed: boolean;
    wired: boolean;
    note?: string;
  }>;
  requestProPurchase: () => Promise<{
    ok: boolean;
    reason?: string;
    productId?: string;
    message?: string;
  }>;
};

declare global {
  interface Window {
    digitalLegacyStore?: DigitalLegacyStoreBridge;
  }
}

export function getStoreBridge(): DigitalLegacyStoreBridge | null {
  if (typeof window === "undefined") return null;
  return window.digitalLegacyStore ?? null;
}
