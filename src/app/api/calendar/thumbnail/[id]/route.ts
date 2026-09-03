import fs from "node:fs";
import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { findThumbnailPath } from "@/lib/calendar/videos";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const entryId = Number(id);

  const filePath = findThumbnailPath(entryId);
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Thumbnail not found." }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
