import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import {
  allowDemoUnlockCodes,
  probeStoreProLicense,
} from "@/lib/iap/store-purchase";

export type Plan = "free" | "pro";

export type ProFeature =
  | "trusted_contacts"
  | "usb_export_reminder"
  | "cloud_backup"
  | "deadman_email";

export const PRO_FEATURES: Record<
  ProFeature,
  { titleKey: string; descKey: string }
> = {
  trusted_contacts: {
    titleKey: "pro.featureTrustedTitle",
    descKey: "pro.featureTrustedDesc",
  },
  usb_export_reminder: {
    titleKey: "pro.featureUsbTitle",
    descKey: "pro.featureUsbDesc",
  },
  cloud_backup: {
    titleKey: "pro.featureCloudTitle",
    descKey: "pro.featureCloudDesc",
  },
  deadman_email: {
    titleKey: "pro.featureDeadmanTitle",
    descKey: "pro.featureDeadmanDesc",
  },
};

const PLAN_KEY = "license_plan";
const UNLOCKED_AT_KEY = "pro_unlocked_at";
const UNLOCK_SOURCE_KEY = "pro_unlock_source";

/** Demo / early unlock codes. Disabled in Store builds. */
const VALID_UNLOCK_CODES = new Set([
  "DIGITAL-LEGACY-PRO",
  "DL-PRO-2026",
]);

async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return row[0]?.value ?? null;
}

async function setSetting(key: string, value: string) {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export async function getPlan(): Promise<Plan> {
  if (process.env.DIGITAL_LEGACY_FORCE_PRO === "true") return "pro";
  const value = await getSetting(PLAN_KEY);
  return value === "pro" ? "pro" : "free";
}

export async function isPro(): Promise<boolean> {
  return (await getPlan()) === "pro";
}

export async function canUse(_feature: ProFeature): Promise<boolean> {
  return isPro();
}

export async function getEntitlement() {
  const plan = await getPlan();
  const unlockedAt = await getSetting(UNLOCKED_AT_KEY);
  const unlockSource = await getSetting(UNLOCK_SOURCE_KEY);
  const store = await probeStoreProLicense();
  return {
    plan,
    isPro: plan === "pro",
    unlockedAt,
    unlockSource: unlockSource as "code" | "store" | "force" | null,
    demoCodesAllowed: allowDemoUnlockCodes(),
    store,
    features: {
      trusted_contacts: plan === "pro",
      usb_export_reminder: plan === "pro",
      cloud_backup: plan === "pro",
      deadman_email: plan === "pro",
    },
  };
}

export async function unlockProWithCode(rawCode: string): Promise<
  | { ok: true; plan: Plan }
  | { ok: false; error: string }
> {
  if (!allowDemoUnlockCodes()) {
    return { ok: false, error: "codes_disabled" };
  }
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "empty" };
  }
  if (!VALID_UNLOCK_CODES.has(code)) {
    return { ok: false, error: "invalid" };
  }
  await setSetting(PLAN_KEY, "pro");
  await setSetting(UNLOCKED_AT_KEY, new Date().toISOString());
  await setSetting(UNLOCK_SOURCE_KEY, "code");
  return { ok: true, plan: "pro" };
}

/**
 * Apply a verified Store license (or env bridge during development).
 * Real Windows StoreContext wiring lands in Electron when Partner Center IAP exists.
 */
export async function unlockProFromStore(): Promise<
  | {
      ok: true;
      plan: Plan;
      store: Awaited<ReturnType<typeof probeStoreProLicense>>;
    }
  | {
      ok: false;
      error: string;
      store: Awaited<ReturnType<typeof probeStoreProLicense>>;
    }
> {
  const store = await probeStoreProLicense();
  if (!store.licensed) {
    return { ok: false, error: store.reason, store };
  }
  await setSetting(PLAN_KEY, "pro");
  await setSetting(UNLOCKED_AT_KEY, new Date().toISOString());
  await setSetting(UNLOCK_SOURCE_KEY, "store");
  return { ok: true, plan: "pro", store };
}

/** Dev / support helper — not exposed in UI by default. */
export async function setPlan(plan: Plan) {
  await setSetting(PLAN_KEY, plan);
  if (plan === "pro") {
    await setSetting(UNLOCKED_AT_KEY, new Date().toISOString());
    await setSetting(UNLOCK_SOURCE_KEY, "force");
  }
}
