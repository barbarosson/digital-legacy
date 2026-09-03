import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { getDeliveryOverview } from "@/lib/delivery/engine";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const overview = await getDeliveryOverview(session.dataKey);
  return NextResponse.json(overview);
}
