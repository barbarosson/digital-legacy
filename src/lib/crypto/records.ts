import { decryptField, encryptField } from "@/lib/crypto/fields";

export function decryptAssetFields<
  T extends { description?: string | null; details?: string | null },
>(row: T, dataKey: Buffer): T {
  return {
    ...row,
    description: decryptField(row.description, dataKey),
    details: decryptField(row.details, dataKey),
  };
}

export function decryptMessageFields<
  T extends { content?: string | null },
>(row: T, dataKey: Buffer): T {
  return {
    ...row,
    content: decryptField(row.content, dataKey) ?? "",
  };
}

export function decryptBeneficiaryFields<
  T extends { notes?: string | null },
>(row: T, dataKey: Buffer): T {
  return {
    ...row,
    notes: decryptField(row.notes, dataKey),
  };
}

export function encryptAssetInput(
  input: { description?: string | null; details?: string | null },
  dataKey: Buffer,
) {
  return {
    description: encryptField(input.description?.trim() || null, dataKey),
    details: encryptField(input.details?.trim() || null, dataKey),
  };
}

export function encryptMessageInput(
  content: string,
  dataKey: Buffer,
): string {
  return encryptField(content.trim(), dataKey) ?? "";
}

export function encryptBeneficiaryNotes(
  notes: string | null | undefined,
  dataKey: Buffer,
) {
  return encryptField(notes?.trim() || null, dataKey);
}

export function decryptCalendarFields<
  T extends {
    title?: string | null;
    content?: string | null;
    location?: string | null;
  },
>(row: T, dataKey: Buffer): T {
  return {
    ...row,
    title: decryptField(row.title, dataKey),
    content: decryptField(row.content, dataKey),
    location: decryptField(row.location, dataKey),
  };
}

export function encryptCalendarInput(
  input: {
    title?: string | null;
    content?: string | null;
    location?: string | null;
  },
  dataKey: Buffer,
) {
  return {
    title: encryptField(input.title?.trim() || null, dataKey),
    content: encryptField(input.content?.trim() || null, dataKey),
    location: encryptField(input.location?.trim() || null, dataKey),
  };
}
