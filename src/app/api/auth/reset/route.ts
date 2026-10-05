import { NextResponse } from "next/server";
import { factoryResetVault } from "@/lib/auth/factory-reset";
import { clearSessionCookie } from "@/lib/auth/session";

export const CONFIRM_TEXT = "RESET LEGACY";

/**
 * Destructive wipe — works without unlock (forgot PIN).
 * Body: { confirm: "RESET LEGACY" }
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { confirm?: string };
  if ((body.confirm ?? "").trim() !== CONFIRM_TEXT) {
    return NextResponse.json(
      {
        error: `Type ${CONFIRM_TEXT} to confirm factory reset.`,
        confirmText: CONFIRM_TEXT,
      },
      { status: 400 },
    );
  }

  await factoryResetVault();
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
