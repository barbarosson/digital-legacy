import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trustedContacts, type NewTrustedContact } from "@/lib/db/schema";

export async function listTrustedContacts() {
  const db = getDb();
  return db
    .select()
    .from(trustedContacts)
    .orderBy(desc(trustedContacts.updatedAt));
}

export async function createTrustedContact(
  input: Omit<NewTrustedContact, "id" | "createdAt" | "updatedAt">,
) {
  const db = getDb();
  const [row] = await db
    .insert(trustedContacts)
    .values({
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      handoffInstruction: input.handoffInstruction?.trim() || null,
    })
    .returning();
  return row;
}

export async function updateTrustedContact(
  id: number,
  input: Partial<
    Omit<NewTrustedContact, "id" | "createdAt" | "updatedAt">
  >,
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
        ? { notes: input.notes?.trim() || null }
        : {}),
      ...(input.handoffInstruction !== undefined
        ? {
            handoffInstruction: input.handoffInstruction?.trim() || null,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(trustedContacts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteTrustedContact(id: number) {
  const db = getDb();
  await db.delete(trustedContacts).where(eq(trustedContacts.id, id));
}
