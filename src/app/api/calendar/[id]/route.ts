import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { deleteVideoFile } from "@/lib/calendar/videos";
import { getDb } from "@/lib/db";
import { calendarMemories } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const entryId = Number(id);

  deleteVideoFile(entryId);
  await getDb()
    .delete(calendarMemories)
    .where(eq(calendarMemories.id, entryId));

  return NextResponse.json({ ok: true });
}
