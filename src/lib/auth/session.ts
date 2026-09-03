import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings, sessions } from "@/lib/db/schema";
import { PIN_SETTING_KEY, SESSION_COOKIE, SESSION_TTL_MS } from "./constants";

export async function isPinConfigured(): Promise<boolean> {
  const db = getDb();
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, PIN_SETTING_KEY))
    .limit(1);
  return row.length > 0;
}

export async function getPinHash(): Promise<string | null> {
  const db = getDb();
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, PIN_SETTING_KEY))
    .limit(1);
  return row[0]?.value ?? null;
}

export async function setPinHash(hash: string) {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key: PIN_SETTING_KEY, value: hash })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: hash },
    });
}

async function purgeExpiredSessions() {
  const db = getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function createSession(dataKey: Buffer): Promise<string> {
  await purgeExpiredSessions();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const db = getDb();

  await db.insert(sessions).values({
    token,
    dataKey: dataKey.toString("base64"),
    expiresAt,
  });

  return token;
}

export async function getSessionDataKey(
  token: string | undefined,
): Promise<Buffer | null> {
  if (!token) return null;

  const db = getDb();
  const row = await db
    .select({ dataKey: sessions.dataKey, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!row[0] || row[0].expiresAt.getTime() <= Date.now()) return null;
  if (!row[0].dataKey) return null;

  return Buffer.from(row[0].dataKey, "base64");
}

export async function validateSessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;

  await purgeExpiredSessions();

  const db = getDb();
  const row = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!row[0]) return false;
  return row[0].expiresAt.getTime() > Date.now();
}

export async function getSessionTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function isSessionValid(): Promise<boolean> {
  const token = await getSessionTokenFromCookies();
  return validateSessionToken(token);
}

export async function isSessionFullyUnlocked(): Promise<boolean> {
  const token = await getSessionTokenFromCookies();
  if (!(await validateSessionToken(token))) return false;
  const dataKey = await getSessionDataKey(token);
  return dataKey !== null;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.token, token));
  await clearSessionCookie();
}
