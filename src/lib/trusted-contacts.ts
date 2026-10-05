import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trustedContacts, type NewTrustedContact } from "@/lib/db/schema";
import {
  decryptTrustedContactFields,
  encryptTrustedContactInput,
} from "@/lib/crypto/records";

export async function listTrustedContacts(dataKey: Buffer) {
  const db = getDb();
  const rows = await db
    .select()
    .from(trustedContacts)
    .orderBy(desc(trustedContacts.updatedAt));
  return rows.map((row) => decryptTrustedContactFields(row, dataKey));
}

export async function createTrustedContact(
  input: Omit<NewTrustedContact, "id" | "createdAt" | "updatedAt">,
  dataKey: Buffer,
) {
  const db = getDb();
  const encrypted = encryptTrustedContactInput(
    {
      notes: input.notes,
      handoffInstruction: input.handoffInstruction,
    },
    dataKey,
  );
  const [row] = await db
    .insert(trustedContacts)
    .values({
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      notes: encrypted.notes,
      handoffInstruction: encrypted.handoffInstruction,
    })
    .returning();
  return decryptTrustedContactFields(row, dataKey);
}

export async function updateTrustedContact(
  id: number,
  input: Partial<
    Omit<NewTrustedContact, "id" | "createdAt" | "updatedAt">
  >,
  dataKey: Buffer,
) {
  const db = getDb();

  const [row] = await db
    .update(trustedContacts)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined
        ? { email: input.email?.trim() || null }
        : {}),
      ...(input.phone !== undefined
        ? { phone: input.phone?.trim() || null }
        : {}),
      ...(input.notes !== undefined
        ? {
            notes: encryptTrustedContactInput(
              { notes: input.notes },
              dataKey,
            ).notes,
          }
        : {}),
      ...(input.handoffInstruction !== undefined
        ? {
            handoffInstruction: encryptTrustedContactInput(
              { handoffInstruction: input.handoffInstruction },
              dataKey,
            ).handoffInstruction,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(trustedContacts.id, id))
    .returning();
  return row ? decryptTrustedContactFields(row, dataKey) : null;
}

export async function deleteTrustedContact(id: number) {
  const db = getDb();
  await db.delete(trustedContacts).where(eq(trustedContacts.id, id));
}
