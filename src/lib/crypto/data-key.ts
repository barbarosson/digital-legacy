import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { WRAPPED_DATA_KEY_SETTING } from "@/lib/auth/constants";
import {
  generateDataKey,
  unwrapDataKey,
  wrapDataKey,
} from "@/lib/crypto/fields";

export async function getWrappedDataKey(): Promise<string | null> {
  const db = getDb();
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, WRAPPED_DATA_KEY_SETTING))
    .limit(1);
  return row[0]?.value ?? null;
}

export async function setWrappedDataKey(wrapped: string) {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key: WRAPPED_DATA_KEY_SETTING, value: wrapped })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: wrapped },
    });
}

export async function initializeDataKey(pin: string): Promise<Buffer> {
  const dataKey = generateDataKey();
  await setWrappedDataKey(wrapDataKey(pin, dataKey));
  return dataKey;
}

export async function unlockDataKey(pin: string): Promise<Buffer | null> {
  const wrapped = await getWrappedDataKey();

  if (!wrapped) {
    return initializeDataKey(pin);
  }

  return unwrapDataKey(pin, wrapped);
}

/** Re-wrap the existing data key under a new PIN (after verifying the old one). */
export async function rewrapDataKey(
  currentPin: string,
  newPin: string,
): Promise<Buffer | null> {
  const dataKey = await unlockDataKey(currentPin);
  if (!dataKey) return null;
  await setWrappedDataKey(wrapDataKey(newPin, dataKey));
  return dataKey;
}
