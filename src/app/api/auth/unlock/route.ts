import { NextResponse } from "next/server";
import { hashPin, validatePinFormat, verifyPin } from "@/lib/auth/pin";
import {
  clearPinFailures,
  getPinLockStatus,
  recordPinFailure,
} from "@/lib/auth/rate-limit";
import {
  createSession,
  getPinHash,
  isPinConfigured,
  setSessionCookie,
} from "@/lib/auth/session";
import { unlockDataKey } from "@/lib/crypto/data-key";
import { processInactivityDeliveries } from "@/lib/delivery/engine";
import { touchLastActivity } from "@/lib/delivery/activity";

export async function POST(request: Request) {
  if (!(await isPinConfigured())) {
    return NextResponse.json(
      { error: "Create a PIN first." },
      { status: 400 },
    );
  }

  const lock = await getPinLockStatus();
  if (lock.locked) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${lock.retryAfterSec} seconds.`,
        retryAfterSec: lock.retryAfterSec,
      },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { pin } = body;

  const formatError = validatePinFormat(pin ?? "");
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  const stored = await getPinHash();
  if (!stored || !verifyPin(pin, stored)) {
    const after = await recordPinFailure();
    if (after.locked) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${after.retryAfterSec} seconds.`,
          retryAfterSec: after.retryAfterSec,
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      {
        error: "Incorrect PIN.",
        remainingAttempts: after.remainingAttempts,
      },
      { status: 401 },
    );
  }

  const dataKey = await unlockDataKey(pin);
  if (!dataKey) {
    return NextResponse.json(
      { error: "Could not unlock the data key. Is the PIN correct?" },
      { status: 401 },
    );
  }

  await clearPinFailures();
  const token = await createSession(dataKey);
  await setSessionCookie(token);

  await processInactivityDeliveries(dataKey);
  await touchLastActivity();

  return NextResponse.json({ ok: true });
}
