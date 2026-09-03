import { NextResponse } from "next/server";
import { isPinConfigured, isSessionFullyUnlocked } from "@/lib/auth/session";

export async function GET() {
  const pinConfigured = await isPinConfigured();
  const unlocked = pinConfigured ? await isSessionFullyUnlocked() : false;

  return NextResponse.json({
    pinConfigured,
    unlocked,
  });
}
