import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse, getEntitlement } from "@/lib/entitlements";

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const entitlement = await getEntitlement();
  const cloudOk = await canUse("cloud_backup");

  return NextResponse.json({
    ...entitlement,
    cloudAvailable: cloudOk,
    supabaseConfigured: supabaseConfigured(),
  });
}
