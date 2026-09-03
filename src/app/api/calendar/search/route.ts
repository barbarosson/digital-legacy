import { NextResponse } from "next/server";
import { and, desc, gte, lte } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { getAssignments } from "@/lib/assignments";
import { decryptCalendarFields } from "@/lib/crypto/records";
import { getDb } from "@/lib/db";
import { calendarMemories } from "@/lib/db/schema";

export async function GET(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim().toLocaleLowerCase("tr");
  const mood = (searchParams.get("mood") ?? "").trim();
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();
  const onlyVideo = searchParams.get("onlyVideo") === "true";

  const conditions = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    conditions.push(gte(calendarMemories.entryDate, from));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    conditions.push(lte(calendarMemories.entryDate, to));
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(calendarMemories)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(calendarMemories.entryDate), desc(calendarMemories.createdAt));

  const results = [];
  for (const row of rows) {
    if (mood && row.mood !== mood) continue;
    if (onlyVideo && !row.videoFileName) continue;

    const decrypted = decryptCalendarFields(row, dataKey);

    if (text) {
      const haystack = [decrypted.title, decrypted.content, decrypted.location]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");
      if (!haystack.includes(text)) continue;
    }

    const assignments = await getAssignments("calendar", row.id);
    results.push({
      id: row.id,
      entryDate: row.entryDate,
      title: decrypted.title,
      content: decrypted.content,
      mood: row.mood,
      location: decrypted.location,
      hasVideo: Boolean(row.videoFileName),
      videoUrl: row.videoFileName ? `/api/calendar/video/${row.id}` : null,
      thumbnailUrl: row.thumbnailFileName
        ? `/api/calendar/thumbnail/${row.id}`
        : null,
      leaveToBeneficiary: row.leaveToBeneficiary,
      recipientLabel: assignments.labels.join(", ") || null,
    });
  }

  return NextResponse.json({ count: results.length, results });
}
