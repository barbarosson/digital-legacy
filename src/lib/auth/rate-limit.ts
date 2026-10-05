import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

const FAIL_COUNT_KEY = "pin_fail_count";
const FAIL_UNTIL_KEY = "pin_fail_until";

const MAX_FAILURES = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

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

export type PinLockStatus =
  | { locked: false; remainingAttempts: number }
  | { locked: true; retryAfterSec: number };

export async function getPinLockStatus(): Promise<PinLockStatus> {
  const untilRaw = await getSetting(FAIL_UNTIL_KEY);
  const until = untilRaw ? Number(untilRaw) : 0;
  if (until > Date.now()) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((until - Date.now()) / 1000),
    };
  }

  const count = Number((await getSetting(FAIL_COUNT_KEY)) ?? "0") || 0;
  return {
    locked: false,
    remainingAttempts: Math.max(0, MAX_FAILURES - count),
  };
}

export async function recordPinFailure(): Promise<PinLockStatus> {
  const status = await getPinLockStatus();
  if (status.locked) return status;

  const count =
    (Number((await getSetting(FAIL_COUNT_KEY)) ?? "0") || 0) + 1;

  if (count >= MAX_FAILURES) {
    await setSetting(FAIL_COUNT_KEY, "0");
    await setSetting(FAIL_UNTIL_KEY, String(Date.now() + LOCKOUT_MS));
    return {
      locked: true,
      retryAfterSec: Math.ceil(LOCKOUT_MS / 1000),
    };
  }

  await setSetting(FAIL_COUNT_KEY, String(count));
  return {
    locked: false,
    remainingAttempts: MAX_FAILURES - count,
  };
}

export async function clearPinFailures() {
  await setSetting(FAIL_COUNT_KEY, "0");
  await setSetting(FAIL_UNTIL_KEY, "0");
}
