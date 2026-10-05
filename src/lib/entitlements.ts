import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

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

/** Demo / early unlock codes. Replace with Store IAP later. */
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
  return {
    plan,
    isPro: plan === "pro",
    unlockedAt,
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
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "empty" };
  }
  if (!VALID_UNLOCK_CODES.has(code)) {
    return { ok: false, error: "invalid" };
  }
  await setSetting(PLAN_KEY, "pro");
  await setSetting(UNLOCKED_AT_KEY, new Date().toISOString());
  return { ok: true, plan: "pro" };
}

/** Dev / support helper — not exposed in UI by default. */
export async function setPlan(plan: Plan) {
  await setSetting(PLAN_KEY, plan);
  if (plan === "pro") {
    await setSetting(UNLOCKED_AT_KEY, new Date().toISOString());
  }
}
