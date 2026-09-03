import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  enrichWithAssignments,
  hasAssignments,
  parseAssignmentInput,
  resolveBeneficiaryIds,
  setAssignments,
} from "@/lib/assignments";
import {
  decryptMessageFields,
  encryptMessageInput,
} from "@/lib/crypto/records";
import { deliverImmediateIfNeeded } from "@/lib/delivery/engine";
import { getDb } from "@/lib/db";
import { messages } from "@/lib/db/schema";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.createdAt));

  const decrypted = rows.map((row) => decryptMessageFields(row, dataKey));
  const enriched = await enrichWithAssignments("message", decrypted);

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const body = await request.json();
  const { title, content, deliveryType, status } = body;
  const assignments = parseAssignmentInput(body);

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: "Title and content are required." },
      { status: 400 },
    );
  }

  if (!hasAssignments(assignments)) {
    return NextResponse.json(
      { error: "Select at least one heir or group." },
      { status: 400 },
    );
  }

  const deliveryTypeValue = deliveryType || "manuel";
  const statusValue = status || "taslak";
  const resolvedIds = await resolveBeneficiaryIds(
    assignments.beneficiaryIds,
    assignments.groupIds,
  );
  const primaryBeneficiaryId =
    assignments.beneficiaryIds[0] ?? resolvedIds[0] ?? null;

  if (!primaryBeneficiaryId) {
    return NextResponse.json(
      { error: "Select at least one heir or a group that has members." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [row] = await db
    .insert(messages)
    .values({
      title: title.trim(),
      content: encryptMessageInput(content, dataKey),
      beneficiaryId: primaryBeneficiaryId,
      deliveryType: deliveryTypeValue,
      status: statusValue,
    })
    .returning();

  await setAssignments("message", row.id, assignments);
  await deliverImmediateIfNeeded(
    row.id,
    deliveryTypeValue,
    statusValue,
    dataKey,
  );

  const [updated] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, row.id))
    .limit(1);

  const decrypted = decryptMessageFields(updated, dataKey);
  const [enriched] = await enrichWithAssignments("message", [decrypted]);

  return NextResponse.json(enriched, { status: 201 });
}
