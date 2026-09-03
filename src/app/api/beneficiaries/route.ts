import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  decryptBeneficiaryFields,
  encryptBeneficiaryNotes,
} from "@/lib/crypto/records";
import { getDb } from "@/lib/db";
import { beneficiaries } from "@/lib/db/schema";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const db = getDb();
  const rows = await db
    .select()
    .from(beneficiaries)
    .orderBy(desc(beneficiaries.createdAt));

  return NextResponse.json(
    rows.map((row) => decryptBeneficiaryFields(row, dataKey)),
  );
}

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const body = await request.json();
  const { name, email, relationship, notes } = body;

  if (!name?.trim() || !relationship?.trim()) {
    return NextResponse.json(
      { error: "Name and relationship are required." },
      { status: 400 },
    );
  }

  const [row] = await getDb()
    .insert(beneficiaries)
    .values({
      name: name.trim(),
      email: email?.trim() || null,
      relationship: relationship.trim(),
      notes: encryptBeneficiaryNotes(notes, dataKey),
    })
    .returning();

  return NextResponse.json(decryptBeneficiaryFields(row, dataKey), {
    status: 201,
  });
}
