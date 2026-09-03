import { NextResponse } from "next/server";
import { hashPin, validatePinFormat } from "@/lib/auth/pin";
import {
  createSession,
  isPinConfigured,
  setPinHash,
  setSessionCookie,
} from "@/lib/auth/session";
import { initializeDataKey } from "@/lib/crypto/data-key";
import { touchLastActivity } from "@/lib/delivery/activity";

export async function POST(request: Request) {
  if (await isPinConfigured()) {
    return NextResponse.json(
      { error: "A PIN is already set. Sign in or use reset." },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { pin, confirmPin } = body;

  const formatError = validatePinFormat(pin ?? "");
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  if (pin !== confirmPin) {
    return NextResponse.json({ error: "PIN confirmation does not match." }, { status: 400 });
  }

  const dataKey = await initializeDataKey(pin);
  await setPinHash(hashPin(pin));
  const token = await createSession(dataKey);
  await setSessionCookie(token);
  await touchLastActivity();

  return NextResponse.json({ ok: true });
}
