import { NextResponse } from "next/server";
import { desc, isNotNull } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { getAssignments } from "@/lib/assignments";
import { decryptCalendarFields } from "@/lib/crypto/records";
import { getDb } from "@/lib/db";
import { calendarMemories } from "@/lib/db/schema";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const db = getDb();
  const rows = await db
    .select()
    .from(calendarMemories)
    .where(isNotNull(calendarMemories.videoFileName))
    .orderBy(desc(calendarMemories.entryDate), desc(calendarMemories.createdAt));

  const entries = await Promise.all(
    rows.map(async (row) => {
      const decrypted = decryptCalendarFields(row, dataKey);
      const assignments = await getAssignments("calendar", row.id);
      return {
        id: row.id,
        entryDate: row.entryDate,
        title: decrypted.title,
        content: decrypted.content,
        mood: row.mood,
        location: decrypted.location,
        videoUrl: `/api/calendar/video/${row.id}`,
        thumbnailUrl: row.thumbnailFileName
          ? `/api/calendar/thumbnail/${row.id}`
          : null,
        leaveToBeneficiary: row.leaveToBeneficiary,
        recipientLabel: assignments.labels.join(", ") || null,
      };
    }),
  );

  return NextResponse.json({ entries });
}
