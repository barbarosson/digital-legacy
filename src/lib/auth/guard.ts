import { NextResponse } from "next/server";
import {
  getSessionDataKey,
  getSessionTokenFromCookies,
  isSessionFullyUnlocked,
  validateSessionToken,
} from "@/lib/auth/session";
import {
  getLastActivityAt,
  touchLastActivity,
} from "@/lib/delivery/activity";
import { processInactivityDeliveries } from "@/lib/delivery/engine";

const ACTIVITY_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

async function runDeliveryAndTouchActivity(dataKey: Buffer) {
  await processInactivityDeliveries(dataKey);

  const lastActivity = await getLastActivityAt();
  const now = Date.now();
  const shouldTouch =
    !lastActivity ||
    now - lastActivity.getTime() >= ACTIVITY_TOUCH_INTERVAL_MS;

  if (shouldTouch) {
    await touchLastActivity();
  }
}

export async function requireSession() {
  const valid = await isSessionFullyUnlocked();
  if (!valid) {
    return NextResponse.json(
      {
        error:
          "A session is required. Sign out and unlock again with your PIN.",
      },
      { status: 401 },
    );
  }
  return null;
}

export async function requireUnlockedSession(): Promise<
  { dataKey: Buffer } | NextResponse
> {
  const token = await getSessionTokenFromCookies();
  const valid = await validateSessionToken(token);

  if (!valid) {
    return NextResponse.json(
      { error: "A session is required. Unlock with your PIN." },
      { status: 401 },
    );
  }

  const dataKey = await getSessionDataKey(token);
  if (!dataKey) {
    return NextResponse.json(
      {
        error:
          "Encryption key not found. Sign out and unlock again with your PIN.",
      },
      { status: 401 },
    );
  }

  await runDeliveryAndTouchActivity(dataKey);

  return { dataKey };
}

export async function getValidSessionOrNull() {
  const token = await getSessionTokenFromCookies();
  const valid = await validateSessionToken(token);
  return valid ? token : null;
}
