import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { beneficiaryGroupMembers, beneficiaryGroups } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  await getDb()
    .delete(beneficiaryGroups)
    .where(eq(beneficiaryGroups.id, Number(id)));

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const groupId = Number(id);
  const body = await request.json();
  const { name, description, memberIds } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Group name is required." },
      { status: 400 },
    );
  }

  const ids = Array.isArray(memberIds)
    ? [...new Set(memberIds.map(Number).filter((value) => value > 0))]
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Add at least one heir to the group." },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .update(beneficiaryGroups)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
    })
    .where(eq(beneficiaryGroups.id, groupId));

  await db
    .delete(beneficiaryGroupMembers)
    .where(eq(beneficiaryGroupMembers.groupId, groupId));

  await db.insert(beneficiaryGroupMembers).values(
    ids.map((beneficiaryId) => ({
      groupId,
      beneficiaryId,
    })),
  );

  return NextResponse.json({ ok: true });
}
