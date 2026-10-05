import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { findVideoPath, readEncryptedFile } from "@/lib/calendar/videos";
import { getDb } from "@/lib/db";
import { calendarMemories } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const entryId = Number(id);

  const db = getDb();
  const [row] = await db
    .select({
      videoMimeType: calendarMemories.videoMimeType,
      videoFileName: calendarMemories.videoFileName,
    })
    .from(calendarMemories)
    .where(eq(calendarMemories.id, entryId))
    .limit(1);

  if (!row?.videoFileName) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  const filePath = findVideoPath(entryId);
  if (!filePath) {
    return NextResponse.json({ error: "Video file not found." }, { status: 404 });
  }

  const buffer = readEncryptedFile(filePath, session.dataKey);
  if (!buffer) {
    return NextResponse.json(
      { error: "Could not decrypt video. Unlock with the correct PIN." },
      { status: 401 },
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.videoMimeType ?? "video/mp4",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
