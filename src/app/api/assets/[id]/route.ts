import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { legacyAssets } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  await getDb().delete(legacyAssets).where(eq(legacyAssets.id, Number(id)));
  return NextResponse.json({ ok: true });
}
