import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  enrichWithAssignments,
  parseAssignmentInput,
  setAssignments,
} from "@/lib/assignments";
import {
  decryptAssetFields,
  encryptAssetInput,
} from "@/lib/crypto/records";
import { getDb } from "@/lib/db";
import { legacyAssets } from "@/lib/db/schema";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const db = getDb();
  const rows = await db
    .select()
    .from(legacyAssets)
    .orderBy(desc(legacyAssets.updatedAt));

  const decrypted = rows.map((row) => decryptAssetFields(row, dataKey));
  const enriched = await enrichWithAssignments("asset", decrypted);

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const body = await request.json();
  const { title, category, description, details, priority } = body;
  const assignments = parseAssignmentInput(body);

  if (!title?.trim() || !category) {
    return NextResponse.json(
      { error: "Title and category are required." },
      { status: 400 },
    );
  }

  const encrypted = encryptAssetInput({ description, details }, dataKey);
  const primaryBeneficiaryId = assignments.beneficiaryIds[0] ?? null;

  const [row] = await getDb()
    .insert(legacyAssets)
    .values({
      title: title.trim(),
      category,
      description: encrypted.description,
      details: encrypted.details,
      beneficiaryId: primaryBeneficiaryId,
      priority: priority || "orta",
      updatedAt: new Date(),
    })
    .returning();

  await setAssignments("asset", row.id, assignments);

  const decrypted = decryptAssetFields(row, dataKey);
  const [enriched] = await enrichWithAssignments("asset", [decrypted]);

  return NextResponse.json(enriched, { status: 201 });
}
