import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  getEntitlement,
  unlockProWithCode,
  unlockProFromStore,
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

  const body = (await request.json()) as {
    code?: string;
    /** Restore / apply Microsoft Store license when wired. */
    storePurchase?: boolean;
  };

  if (body.storePurchase) {
    const result = await unlockProFromStore();
    if (!result.ok) {
      const message =
        result.error === "not_wired"
          ? "Microsoft Store purchases are not connected yet. Use Partner Center IAP after the Store account is ready."
          : result.error === "not_store_build"
            ? "This is not a Store package. Use an unlock code, or install the MSIX build."
            : "No Store Pro license found.";
      return NextResponse.json(
        { error: message, store: result.store },
        { status: 400 },
      );
    }
    const entitlement = await getEntitlement();
    return NextResponse.json(entitlement);
  }

  const result = await unlockProWithCode(body.code ?? "");

  if (!result.ok) {
    const message =
      result.error === "empty"
        ? "Enter an unlock code."
        : result.error === "codes_disabled"
          ? "Demo unlock codes are disabled in the Store build. Purchase Pro from Microsoft Store."
          : "Invalid unlock code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const entitlement = await getEntitlement();
  return NextResponse.json(entitlement);
}
