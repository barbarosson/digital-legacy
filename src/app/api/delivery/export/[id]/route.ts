import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { deliveries } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const db = getDb();

  const [row] = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.id, Number(id)))
    .limit(1);

  if (!row?.snapshot) {
    return NextResponse.json({ error: "Delivery record not found." }, { status: 404 });
  }

  const snapshot = JSON.parse(row.snapshot);
  const filename = `delivery-${row.id}-${snapshot.beneficiary.name.replace(/\s+/g, "-").toLowerCase()}.json`;

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
