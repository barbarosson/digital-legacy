import { and, desc, eq, inArray } from "drizzle-orm";
import {
  getAssignments,
  resolveBeneficiaryIds,
} from "@/lib/assignments";
import { getDb } from "@/lib/db";
import {
  assetBeneficiaries,
  beneficiaries,
  calendarMemories,
  deliveries,
  legacyAssets,
  messages,
} from "@/lib/db/schema";
import {
  decryptAssetFields,
  decryptCalendarFields,
  decryptMessageFields,
} from "@/lib/crypto/records";
import { getInactivityStatus, touchLastActivity } from "./activity";

type DeliveryTrigger = "hemen" | "hareketsizlik" | "manuel";

type DeliverySnapshot = {
  message: {
    id: number;
    title: string;
    content: string;
    deliveryType: string;
  };
  beneficiary: {
    id: number;
    name: string;
    email: string | null;
    relationship: string;
  };
  recipients: {
    id: number;
    name: string;
    email: string | null;
    relationship: string;
  }[];
  groups: {
    id: number;
    name: string;
    memberCount: number;
  }[];
  assets: {
    id: number;
    title: string;
    category: string;
    description: string | null;
    details: string | null;
    priority: string;
  }[];
  calendarMemories: {
    id: number;
    entryDate: string;
    title: string | null;
    content: string | null;
    hasVideo: boolean;
    videoFileName: string | null;
  }[];
  deliveredAt: string;
  trigger: DeliveryTrigger;
};

async function buildSnapshot(
  messageId: number,
  trigger: DeliveryTrigger,
  dataKey: Buffer,
): Promise<DeliverySnapshot | null> {
  const db = getDb();

  const [messageRow] = await db
    .select({
      id: messages.id,
      title: messages.title,
      content: messages.content,
      deliveryType: messages.deliveryType,
      status: messages.status,
      beneficiaryId: messages.beneficiaryId,
      beneficiaryName: beneficiaries.name,
      beneficiaryEmail: beneficiaries.email,
      beneficiaryRelationship: beneficiaries.relationship,
    })
    .from(messages)
    .innerJoin(beneficiaries, eq(messages.beneficiaryId, beneficiaries.id))
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!messageRow || messageRow.status === "teslim") return null;

  const assignments = await getAssignments("message", messageId);
  const resolvedIds = await resolveBeneficiaryIds(
    assignments.beneficiaryIds,
    assignments.groupIds,
  );

  const decryptedMessage = decryptMessageFields(
    {
      id: messageRow.id,
      title: messageRow.title,
      content: messageRow.content,
      deliveryType: messageRow.deliveryType,
    },
    dataKey,
  );

  const recipientRows =
    resolvedIds.length > 0
      ? await db
          .select()
          .from(beneficiaries)
          .where(inArray(beneficiaries.id, resolvedIds))
      : [];

  const linkedAssetIds = resolvedIds.length
    ? await db
        .select({ assetId: assetBeneficiaries.assetId })
        .from(assetBeneficiaries)
        .where(inArray(assetBeneficiaries.beneficiaryId, resolvedIds))
    : [];

  const assetIdSet = new Set(linkedAssetIds.map((row) => row.assetId));
  const allAssets = resolvedIds.length
    ? await db
        .select()
        .from(legacyAssets)
        .where(inArray(legacyAssets.beneficiaryId, resolvedIds))
    : [];

  const junctionAssets =
    assetIdSet.size > 0
      ? await db
          .select()
          .from(legacyAssets)
          .where(inArray(legacyAssets.id, [...assetIdSet]))
      : [];

  const assetMap = new Map<number, (typeof allAssets)[number]>();
  for (const asset of [...allAssets, ...junctionAssets]) {
    assetMap.set(asset.id, asset);
  }

  const memoryCandidates = await db
    .select()
    .from(calendarMemories)
    .where(eq(calendarMemories.leaveToBeneficiary, true))
    .orderBy(desc(calendarMemories.entryDate));

  const memoryRows: typeof memoryCandidates = [];
  for (const memory of memoryCandidates) {
    const memoryAssignments = await getAssignments("calendar", memory.id);
    const memoryRecipientIds = await resolveBeneficiaryIds(
      memoryAssignments.beneficiaryIds,
      memoryAssignments.groupIds,
    );
    if (memoryRecipientIds.some((id) => resolvedIds.includes(id))) {
      memoryRows.push(memory);
    }
  }

  return {
    message: {
      id: decryptedMessage.id,
      title: decryptedMessage.title,
      content: decryptedMessage.content,
      deliveryType: decryptedMessage.deliveryType,
    },
    beneficiary: {
      id: messageRow.beneficiaryId,
      name: messageRow.beneficiaryName,
      email: messageRow.beneficiaryEmail,
      relationship: messageRow.beneficiaryRelationship,
    },
    recipients: recipientRows.map((recipient) => ({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      relationship: recipient.relationship,
    })),
    groups: assignments.groups.map((group) => ({
      id: group.id,
      name: group.name,
      memberCount: group.memberCount,
    })),
    assets: [...assetMap.values()].map((asset) => {
      const decrypted = decryptAssetFields(asset, dataKey);
      return {
        id: decrypted.id,
        title: decrypted.title,
        category: decrypted.category,
        description: decrypted.description,
        details: decrypted.details,
        priority: decrypted.priority,
      };
    }),
    calendarMemories: memoryRows.map((memory) => {
      const decrypted = decryptCalendarFields(memory, dataKey);
      return {
        id: memory.id,
        entryDate: memory.entryDate,
        title: decrypted.title,
        content: decrypted.content,
        hasVideo: Boolean(memory.videoFileName),
        videoFileName: memory.videoFileName,
      };
    }),
    deliveredAt: new Date().toISOString(),
    trigger,
  };
}

export async function deliverMessage(
  messageId: number,
  trigger: DeliveryTrigger,
  dataKey: Buffer,
) {
  const snapshot = await buildSnapshot(messageId, trigger, dataKey);
  if (!snapshot) return null;

  const db = getDb();
  const deliveredAt = new Date();

  await db
    .update(messages)
    .set({ status: "teslim" })
    .where(eq(messages.id, messageId));

  const [row] = await db
    .insert(deliveries)
    .values({
      messageId,
      beneficiaryId: snapshot.beneficiary.id,
      trigger,
      snapshot: JSON.stringify(snapshot),
      deliveredAt,
    })
    .returning();

  return row;
}

export async function deliverImmediateIfNeeded(
  messageId: number,
  deliveryType: string,
  status: string,
  dataKey: Buffer,
) {
  if (deliveryType === "hemen" && status === "hazir") {
    return deliverMessage(messageId, "hemen", dataKey);
  }
  return null;
}

export async function processInactivityDeliveries(dataKey: Buffer) {
  const status = await getInactivityStatus();
  if (!status.isOverdue) {
    return { delivered: 0, messageIds: [] as number[] };
  }

  const db = getDb();
  const pending = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.deliveryType, "hareketsizlik"),
        eq(messages.status, "hazir"),
      ),
    );

  const deliveredIds: number[] = [];

  for (const message of pending) {
    const result = await deliverMessage(message.id, "hareketsizlik", dataKey);
    if (result) deliveredIds.push(message.id);
  }

  return { delivered: deliveredIds.length, messageIds: deliveredIds };
}

export async function runDeliveryChecks(dataKey: Buffer, touchActivity = true) {
  const inactivity = await processInactivityDeliveries(dataKey);

  if (touchActivity) {
    await touchLastActivity();
  }

  return { inactivity };
}

export async function listDeliveries(dataKey: Buffer) {
  const db = getDb();

  const rows = await db
    .select({
      id: deliveries.id,
      messageId: deliveries.messageId,
      beneficiaryId: deliveries.beneficiaryId,
      trigger: deliveries.trigger,
      snapshot: deliveries.snapshot,
      deliveredAt: deliveries.deliveredAt,
      beneficiaryName: beneficiaries.name,
      messageTitle: messages.title,
    })
    .from(deliveries)
    .innerJoin(beneficiaries, eq(deliveries.beneficiaryId, beneficiaries.id))
    .innerJoin(messages, eq(deliveries.messageId, messages.id))
    .orderBy(desc(deliveries.deliveredAt));

  return rows.map((row) => {
    let parsed: DeliverySnapshot | null = null;
    if (row.snapshot) {
      try {
        parsed = JSON.parse(row.snapshot) as DeliverySnapshot;
      } catch {
        parsed = null;
      }
    }

    const recipientLabel = parsed
      ? [
          ...(parsed.recipients?.map((recipient) => recipient.name) ?? []),
          ...(parsed.groups?.map(
            (group) => `${group.name} (${group.memberCount} people)`,
          ) ?? []),
        ].join(", ") || row.beneficiaryName
      : row.beneficiaryName;

    return {
      id: row.id,
      messageId: row.messageId,
      beneficiaryId: row.beneficiaryId,
      trigger: row.trigger,
      deliveredAt: row.deliveredAt,
      beneficiaryName: row.beneficiaryName,
      recipientLabel,
      messageTitle: parsed?.message.title ?? row.messageTitle,
      snapshot: parsed,
    };
  });
}

export async function listPendingManualDeliveries(dataKey: Buffer) {
  const db = getDb();

  const rows = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.deliveryType, "manuel"), eq(messages.status, "hazir")),
    )
    .orderBy(desc(messages.createdAt));

  const decrypted = rows.map((row) => decryptMessageFields(row, dataKey));
  const { enrichWithAssignments } = await import("@/lib/assignments");

  return enrichWithAssignments("message", decrypted);
}

export async function getDeliveryOverview(dataKey: Buffer) {
  const [activity, pendingManual, deliveryLog, inactivityPending] =
    await Promise.all([
      getInactivityStatus(),
      listPendingManualDeliveries(dataKey),
      listDeliveries(dataKey),
      getDb()
        .select({ id: messages.id, title: messages.title })
        .from(messages)
        .where(
          and(
            eq(messages.deliveryType, "hareketsizlik"),
            eq(messages.status, "hazir"),
          ),
        ),
    ]);

  return {
    activity,
    pendingManual,
    inactivityPending,
    deliveryLog,
    totals: {
      delivered: deliveryLog.length,
      pendingManual: pendingManual.length,
      pendingInactivity: inactivityPending.length,
    },
  };
}

export type { DeliverySnapshot };
