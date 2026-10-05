import { NextResponse } from "next/server";
import { hashPin, validatePinFormat, verifyPin } from "@/lib/auth/pin";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  createSession,
  destroyAllSessions,
  getPinHash,
  setPinHash,
  setSessionCookie,
} from "@/lib/auth/session";
import { rewrapDataKey } from "@/lib/crypto/data-key";

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as {
    currentPin?: string;
    newPin?: string;
    confirmPin?: string;
  };

  const formatError = validatePinFormat(body.newPin ?? "");
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  if (body.newPin !== body.confirmPin) {
    return NextResponse.json(
      { error: "PIN confirmation does not match." },
      { status: 400 },
    );
  }

  const stored = await getPinHash();
  if (!stored || !verifyPin(body.currentPin ?? "", stored)) {
    return NextResponse.json(
      { error: "Current PIN is incorrect." },
      { status: 401 },
    );
  }

  const dataKey = await rewrapDataKey(body.currentPin!, body.newPin!);
  if (!dataKey) {
    return NextResponse.json(
      { error: "Could not re-encrypt the data key." },
      { status: 500 },
    );
  }

  await setPinHash(hashPin(body.newPin!));
  await destroyAllSessions();
  const token = await createSession(dataKey);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
