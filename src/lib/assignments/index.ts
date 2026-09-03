import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  assetBeneficiaries,
  assetGroups,
  beneficiaries,
  beneficiaryGroupMembers,
  beneficiaryGroups,
  calendarBeneficiaries,
  calendarGroups,
  messageBeneficiaries,
  messageGroups,
} from "@/lib/db/schema";

export type AssignmentTarget = "message" | "asset" | "calendar";

export type AssignmentInput = {
  beneficiaryIds: number[];
  groupIds: number[];
};

export type AssignmentView = {
  beneficiaryIds: number[];
  groupIds: number[];
  beneficiaries: { id: number; name: string; relationship: string }[];
  groups: { id: number; name: string; memberCount: number }[];
  labels: string[];
};

export function parseAssignmentInput(body: {
  beneficiaryIds?: unknown;
  groupIds?: unknown;
  beneficiaryId?: unknown;
}): AssignmentInput {
  const beneficiaryIds = Array.isArray(body.beneficiaryIds)
    ? body.beneficiaryIds.map(Number).filter((id) => id > 0)
    : body.beneficiaryId
      ? [Number(body.beneficiaryId)].filter((id) => id > 0)
      : [];

  const groupIds = Array.isArray(body.groupIds)
    ? body.groupIds.map(Number).filter((id) => id > 0)
    : [];

  return {
    beneficiaryIds: [...new Set(beneficiaryIds)],
    groupIds: [...new Set(groupIds)],
  };
}

export function hasAssignments(input: AssignmentInput) {
  return input.beneficiaryIds.length > 0 || input.groupIds.length > 0;
}

export async function setAssignments(
  target: AssignmentTarget,
  targetId: number,
  input: AssignmentInput,
) {
  const db = getDb();

  if (target === "message") {
    await db
      .delete(messageBeneficiaries)
      .where(eq(messageBeneficiaries.messageId, targetId));
    await db.delete(messageGroups).where(eq(messageGroups.messageId, targetId));

    if (input.beneficiaryIds.length > 0) {
      await db.insert(messageBeneficiaries).values(
        input.beneficiaryIds.map((beneficiaryId) => ({
          messageId: targetId,
          beneficiaryId,
        })),
      );
    }

    if (input.groupIds.length > 0) {
      await db.insert(messageGroups).values(
        input.groupIds.map((groupId) => ({
          messageId: targetId,
          groupId,
        })),
      );
    }
    return;
  }

  if (target === "asset") {
    await db
      .delete(assetBeneficiaries)
      .where(eq(assetBeneficiaries.assetId, targetId));
    await db.delete(assetGroups).where(eq(assetGroups.assetId, targetId));

    if (input.beneficiaryIds.length > 0) {
      await db.insert(assetBeneficiaries).values(
        input.beneficiaryIds.map((beneficiaryId) => ({
          assetId: targetId,
          beneficiaryId,
        })),
      );
    }

    if (input.groupIds.length > 0) {
      await db.insert(assetGroups).values(
        input.groupIds.map((groupId) => ({
          assetId: targetId,
          groupId,
        })),
      );
    }
    return;
  }

  await db
    .delete(calendarBeneficiaries)
    .where(eq(calendarBeneficiaries.memoryId, targetId));
  await db.delete(calendarGroups).where(eq(calendarGroups.memoryId, targetId));

  if (input.beneficiaryIds.length > 0) {
    await db.insert(calendarBeneficiaries).values(
      input.beneficiaryIds.map((beneficiaryId) => ({
        memoryId: targetId,
        beneficiaryId,
      })),
    );
  }

  if (input.groupIds.length > 0) {
    await db.insert(calendarGroups).values(
      input.groupIds.map((groupId) => ({
        memoryId: targetId,
        groupId,
      })),
    );
  }
}

export async function getAssignments(
  target: AssignmentTarget,
  targetId: number,
): Promise<AssignmentView> {
  const db = getDb();

  let beneficiaryRows: { id: number; name: string; relationship: string }[] = [];
  let groupRows: { id: number; name: string }[] = [];

  if (target === "message") {
    [beneficiaryRows, groupRows] = await Promise.all([
      db
        .select({
          id: beneficiaries.id,
          name: beneficiaries.name,
          relationship: beneficiaries.relationship,
        })
        .from(messageBeneficiaries)
        .innerJoin(
          beneficiaries,
          eq(messageBeneficiaries.beneficiaryId, beneficiaries.id),
        )
        .where(eq(messageBeneficiaries.messageId, targetId)),
      db
        .select({
          id: beneficiaryGroups.id,
          name: beneficiaryGroups.name,
        })
        .from(messageGroups)
        .innerJoin(
          beneficiaryGroups,
          eq(messageGroups.groupId, beneficiaryGroups.id),
        )
        .where(eq(messageGroups.messageId, targetId)),
    ]);
  } else if (target === "asset") {
    [beneficiaryRows, groupRows] = await Promise.all([
      db
        .select({
          id: beneficiaries.id,
          name: beneficiaries.name,
          relationship: beneficiaries.relationship,
        })
        .from(assetBeneficiaries)
        .innerJoin(
          beneficiaries,
          eq(assetBeneficiaries.beneficiaryId, beneficiaries.id),
        )
        .where(eq(assetBeneficiaries.assetId, targetId)),
      db
        .select({
          id: beneficiaryGroups.id,
          name: beneficiaryGroups.name,
        })
        .from(assetGroups)
        .innerJoin(
          beneficiaryGroups,
          eq(assetGroups.groupId, beneficiaryGroups.id),
        )
        .where(eq(assetGroups.assetId, targetId)),
    ]);
  } else {
    [beneficiaryRows, groupRows] = await Promise.all([
      db
        .select({
          id: beneficiaries.id,
          name: beneficiaries.name,
          relationship: beneficiaries.relationship,
        })
        .from(calendarBeneficiaries)
        .innerJoin(
          beneficiaries,
          eq(calendarBeneficiaries.beneficiaryId, beneficiaries.id),
        )
        .where(eq(calendarBeneficiaries.memoryId, targetId)),
      db
        .select({
          id: beneficiaryGroups.id,
          name: beneficiaryGroups.name,
        })
        .from(calendarGroups)
        .innerJoin(
          beneficiaryGroups,
          eq(calendarGroups.groupId, beneficiaryGroups.id),
        )
        .where(eq(calendarGroups.memoryId, targetId)),
    ]);
  }

  const groupsWithCounts = await Promise.all(
    groupRows.map(async (group) => {
      const members = await db
        .select({ id: beneficiaryGroupMembers.beneficiaryId })
        .from(beneficiaryGroupMembers)
        .where(eq(beneficiaryGroupMembers.groupId, group.id));
      return { ...group, memberCount: members.length };
    }),
  );

  const labels = [
    ...beneficiaryRows.map((b) => b.name),
    ...groupsWithCounts.map((g) => `${g.name} (${g.memberCount} people)`),
  ];

  return {
    beneficiaryIds: beneficiaryRows.map((b) => b.id),
    groupIds: groupsWithCounts.map((g) => g.id),
    beneficiaries: beneficiaryRows,
    groups: groupsWithCounts,
    labels,
  };
}

export async function resolveBeneficiaryIds(
  beneficiaryIds: number[],
  groupIds: number[],
): Promise<number[]> {
  if (groupIds.length === 0) {
    return [...new Set(beneficiaryIds)];
  }

  const db = getDb();
  const members = await db
    .select({ beneficiaryId: beneficiaryGroupMembers.beneficiaryId })
    .from(beneficiaryGroupMembers)
    .where(inArray(beneficiaryGroupMembers.groupId, groupIds));

  return [
    ...new Set([
      ...beneficiaryIds,
      ...members.map((member) => member.beneficiaryId),
    ]),
  ];
}

export async function enrichWithAssignments<
  T extends { id: number },
>(target: AssignmentTarget, rows: T[]) {
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const assignments = await getAssignments(target, row.id);
      return {
        ...row,
        assignments,
        recipientLabel: assignments.labels.join(", ") || null,
      };
    }),
  );
  return enriched;
}
