import { count } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { beneficiaries, legacyAssets, messages } from "@/lib/db/schema";

export async function getDashboardStats() {
  const db = getDb();
  const [[assetCount], [beneficiaryCount], [messageCount]] = await Promise.all([
    db.select({ value: count() }).from(legacyAssets),
    db.select({ value: count() }).from(beneficiaries),
    db.select({ value: count() }).from(messages),
  ]);

  return {
    assets: assetCount.value,
    beneficiaries: beneficiaryCount.value,
    messages: messageCount.value,
  };
}
