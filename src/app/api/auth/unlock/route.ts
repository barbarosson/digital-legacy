import { NextResponse } from "next/server";
import { verifyPin, validatePinFormat } from "@/lib/auth/pin";
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

  const body = await request.json();
  const { pin } = body;

  const formatError = validatePinFormat(pin ?? "");
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  const stored = await getPinHash();
  if (!stored || !verifyPin(pin, stored)) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  const dataKey = await unlockDataKey(pin);
  if (!dataKey) {
    return NextResponse.json(
      { error: "Could not unlock the data key. Is the PIN correct?" },
      { status: 401 },
    );
  }

  const token = await createSession(dataKey);
  await setSessionCookie(token);

  await processInactivityDeliveries(dataKey);
  await touchLastActivity();

  return NextResponse.json({ ok: true });
}
