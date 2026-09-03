import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  getAssignments,
  hasAssignments,
  parseAssignmentInput,
  setAssignments,
} from "@/lib/assignments";
import {
  saveThumbnailFile,
  saveVideoFile,
  validateEntryDate,
} from "@/lib/calendar/videos";
import {
  decryptCalendarFields,
  encryptCalendarInput,
} from "@/lib/crypto/records";
import { getDb } from "@/lib/db";
import { calendarMemories } from "@/lib/db/schema";

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

const entrySelection = {
  id: calendarMemories.id,
  entryDate: calendarMemories.entryDate,
  title: calendarMemories.title,
  content: calendarMemories.content,
  videoFileName: calendarMemories.videoFileName,
  videoMimeType: calendarMemories.videoMimeType,
  thumbnailFileName: calendarMemories.thumbnailFileName,
  mood: calendarMemories.mood,
  location: calendarMemories.location,
  beneficiaryId: calendarMemories.beneficiaryId,
  leaveToBeneficiary: calendarMemories.leaveToBeneficiary,
  createdAt: calendarMemories.createdAt,
  updatedAt: calendarMemories.updatedAt,
};

type EntryRow = {
  id: number;
  entryDate: string;
  title: string | null;
  content: string | null;
  videoFileName: string | null;
  videoMimeType: string | null;
  thumbnailFileName: string | null;
  mood: string | null;
  location: string | null;
  beneficiaryId: number | null;
  leaveToBeneficiary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

async function mapEntry(row: EntryRow, dataKey: Buffer) {
  const decrypted = decryptCalendarFields(row, dataKey);
  const assignments = await getAssignments("calendar", row.id);

  return {
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
    beneficiaryId: row.beneficiaryId,
    leaveToBeneficiary: row.leaveToBeneficiary,
    assignments,
    recipientLabel: assignments.labels.join(", ") || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const date = searchParams.get("date");

  const db = getDb();

  if (date) {
    if (!validateEntryDate(date)) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }

    const rows = await db
      .select(entrySelection)
      .from(calendarMemories)
      .where(eq(calendarMemories.entryDate, date))
      .orderBy(desc(calendarMemories.createdAt));

    return NextResponse.json({
      date,
      entries: await Promise.all(rows.map((row) => mapEntry(row, dataKey))),
    });
  }

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "year and month parameters are required." },
      { status: 400 },
    );
  }

  const { start, end } = monthRange(year, month);

  const rows = await db
    .select(entrySelection)
    .from(calendarMemories)
    .where(
      and(
        gte(calendarMemories.entryDate, start),
        lte(calendarMemories.entryDate, end),
      ),
    )
    .orderBy(desc(calendarMemories.entryDate));

  const dayCounts = await db
    .select({
      entryDate: calendarMemories.entryDate,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(calendarMemories)
    .where(
      and(
        gte(calendarMemories.entryDate, start),
        lte(calendarMemories.entryDate, end),
      ),
    )
    .groupBy(calendarMemories.entryDate);

  const daysWithEntries = Object.fromEntries(
    dayCounts.map((row) => [row.entryDate, row.count]),
  );

  const entries = await Promise.all(rows.map((row) => mapEntry(row, dataKey)));

  const dayThumbnails: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.thumbnailUrl && !dayThumbnails[entry.entryDate]) {
      dayThumbnails[entry.entryDate] = entry.thumbnailUrl;
    }
  }

  return NextResponse.json({
    year,
    month,
    entries,
    daysWithEntries,
    dayThumbnails,
  });
}

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const formData = await request.formData();
  const entryDate = String(formData.get("entryDate") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const mood = String(formData.get("mood") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim();
  const leaveToBeneficiary = formData.get("leaveToBeneficiary") === "true";
  const beneficiaryIdsRaw = String(formData.get("beneficiaryIds") ?? "[]");
  const groupIdsRaw = String(formData.get("groupIds") ?? "[]");
  const thumbnail = String(formData.get("thumbnail") ?? "");
  const video = formData.get("video");

  let beneficiaryIds: number[] = [];
  let groupIds: number[] = [];
  try {
    beneficiaryIds = JSON.parse(beneficiaryIdsRaw);
    groupIds = JSON.parse(groupIdsRaw);
  } catch {
    return NextResponse.json({ error: "Invalid heir selection." }, { status: 400 });
  }

  const assignments = parseAssignmentInput({ beneficiaryIds, groupIds });

  if (!validateEntryDate(entryDate)) {
    return NextResponse.json({ error: "Select a valid date." }, { status: 400 });
  }

  if (!title && !content && !(video instanceof File)) {
    return NextResponse.json(
      { error: "Add a title, memory text, or video." },
      { status: 400 },
    );
  }

  if (leaveToBeneficiary && !hasAssignments(assignments)) {
    return NextResponse.json(
      { error: "Select at least one heir or group to leave this memory." },
      { status: 400 },
    );
  }

  const encrypted = encryptCalendarInput({ title, content, location }, dataKey);
  const db = getDb();
  const now = new Date();
  const primaryBeneficiaryId = assignments.beneficiaryIds[0] ?? null;

  const [row] = await db
    .insert(calendarMemories)
    .values({
      entryDate,
      title: encrypted.title,
      content: encrypted.content,
      location: encrypted.location,
      mood,
      beneficiaryId: primaryBeneficiaryId,
      leaveToBeneficiary,
      updatedAt: now,
    })
    .returning();

  await setAssignments("calendar", row.id, assignments);

  try {
    if (video instanceof File && video.size > 0) {
      const saved = await saveVideoFile(row.id, video);
      let thumbnailFileName: string | null = null;
      if (thumbnail) {
        thumbnailFileName = await saveThumbnailFile(row.id, thumbnail);
      }
      await db
        .update(calendarMemories)
        .set({
          videoFileName: saved.fileName,
          videoMimeType: saved.mimeType,
          thumbnailFileName,
          updatedAt: new Date(),
        })
        .where(eq(calendarMemories.id, row.id));
    }
  } catch (error) {
    await db.delete(calendarMemories).where(eq(calendarMemories.id, row.id));
    const message =
      error instanceof Error ? error.message : "Could not save the video.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [created] = await db
    .select(entrySelection)
    .from(calendarMemories)
    .where(eq(calendarMemories.id, row.id))
    .limit(1);

  return NextResponse.json(await mapEntry(created, dataKey), { status: 201 });
}
