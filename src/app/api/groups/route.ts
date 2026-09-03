import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import {
  beneficiaries,
  beneficiaryGroupMembers,
  beneficiaryGroups,
} from "@/lib/db/schema";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const db = getDb();
  const groups = await db
    .select()
    .from(beneficiaryGroups)
    .orderBy(desc(beneficiaryGroups.createdAt));

  const enriched = await Promise.all(
    groups.map(async (group) => {
      const members = await db
        .select({
          id: beneficiaries.id,
          name: beneficiaries.name,
          relationship: beneficiaries.relationship,
        })
        .from(beneficiaryGroupMembers)
        .innerJoin(
          beneficiaries,
          eq(beneficiaryGroupMembers.beneficiaryId, beneficiaries.id),
        )
        .where(eq(beneficiaryGroupMembers.groupId, group.id));

      return {
        ...group,
        members,
        memberCount: members.length,
      };
    }),
  );

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const { name, description, memberIds } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Group name is required." },
      { status: 400 },
    );
  }

  const ids = Array.isArray(memberIds)
    ? [...new Set(memberIds.map(Number).filter((id) => id > 0))]
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Add at least one heir to the group." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [group] = await db
    .insert(beneficiaryGroups)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
    })
    .returning();

  await db.insert(beneficiaryGroupMembers).values(
    ids.map((beneficiaryId) => ({
      groupId: group.id,
      beneficiaryId,
    })),
  );

  const members = await db
    .select({
      id: beneficiaries.id,
      name: beneficiaries.name,
      relationship: beneficiaries.relationship,
    })
    .from(beneficiaryGroupMembers)
    .innerJoin(
      beneficiaries,
      eq(beneficiaryGroupMembers.beneficiaryId, beneficiaries.id),
    )
    .where(eq(beneficiaryGroupMembers.groupId, group.id));

  return NextResponse.json(
    { ...group, members, memberCount: members.length },
    { status: 201 },
  );
}
