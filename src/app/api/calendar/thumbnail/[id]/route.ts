import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { findThumbnailPath, readEncryptedFile } from "@/lib/calendar/videos";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const entryId = Number(id);

  const filePath = findThumbnailPath(entryId);
  if (!filePath) {
    return NextResponse.json({ error: "Thumbnail not found." }, { status: 404 });
  }

  const buffer = readEncryptedFile(filePath, session.dataKey);
  if (!buffer) {
    return NextResponse.json(
      { error: "Could not decrypt thumbnail. Unlock with the correct PIN." },
      { status: 401 },
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
