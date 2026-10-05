import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  getEntitlement,
  unlockProWithCode,
} from "@/lib/entitlements";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const entitlement = await getEntitlement();
  return NextResponse.json(entitlement);
}

export async function PUT(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as { code?: string };
  const result = await unlockProWithCode(body.code ?? "");

  if (!result.ok) {
    const message =
      result.error === "empty"
        ? "Enter an unlock code."
        : "Invalid unlock code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const entitlement = await getEntitlement();
  return NextResponse.json(entitlement);
}
