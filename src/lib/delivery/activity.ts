import { eq } from "drizzle-orm";
import {
  DEFAULT_INACTIVITY_DAYS,
  DEFAULT_WARNING_WEEKS,
  MAX_INACTIVITY_DAYS,
  MAX_WARNING_WEEKS,
  MIN_INACTIVITY_DAYS,
  MIN_WARNING_WEEKS,
} from "@/lib/constants";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export const LAST_ACTIVITY_KEY = "last_activity_at";
export const INACTIVITY_DAYS_KEY = "inactivity_days";
export const WARNING_WEEKS_KEY = "warning_weeks";

async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return row[0]?.value ?? null;
}

async function setSetting(key: string, value: string) {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value },
    });
}

export async function getLastActivityAt(): Promise<Date | null> {
  const value = await getSetting(LAST_ACTIVITY_KEY);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function touchLastActivity(at: Date = new Date()) {
  await setSetting(LAST_ACTIVITY_KEY, at.toISOString());
}

export async function getInactivityDays(): Promise<number> {
  const value = await getSetting(INACTIVITY_DAYS_KEY);
  const parsed = Number(value);
  if (!value || Number.isNaN(parsed)) return DEFAULT_INACTIVITY_DAYS;
  return Math.min(MAX_INACTIVITY_DAYS, Math.max(MIN_INACTIVITY_DAYS, parsed));
}

export async function setInactivityDays(days: number) {
  const clamped = Math.min(
    MAX_INACTIVITY_DAYS,
    Math.max(MIN_INACTIVITY_DAYS, Math.round(days)),
  );
  await setSetting(INACTIVITY_DAYS_KEY, String(clamped));
}

export async function getWarningWeeks(): Promise<number> {
  const value = await getSetting(WARNING_WEEKS_KEY);
  const parsed = Number(value);
  if (value === null || Number.isNaN(parsed)) return DEFAULT_WARNING_WEEKS;
  return Math.min(MAX_WARNING_WEEKS, Math.max(MIN_WARNING_WEEKS, parsed));
}

export async function setWarningWeeks(weeks: number) {
  const clamped = Math.min(
    MAX_WARNING_WEEKS,
    Math.max(MIN_WARNING_WEEKS, Math.round(weeks)),
  );
  await setSetting(WARNING_WEEKS_KEY, String(clamped));
}

export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

export async function getInactivityStatus() {
  const lastActivity = await getLastActivityAt();
  const inactivityDays = await getInactivityDays();
  const warningWeeks = await getWarningWeeks();
  const warningDays = warningWeeks * 7;
  const now = new Date();

  if (!lastActivity) {
    return {
      lastActivityAt: null,
      inactivityDays,
      warningWeeks,
      daysSinceActivity: 0,
      daysUntilDelivery: inactivityDays,
      isOverdue: false,
      inWarningPhase: false,
      currentWarningWeek: 0,
      warningWeeksRemaining: warningWeeks,
    };
  }

  const daysSince = daysBetween(lastActivity, now);
  const daysUntil = Math.max(0, inactivityDays - daysSince);
  const isOverdue = daysSince >= inactivityDays;

  // Uyarı fazı: teslime kalan süre, ayarlanan uyarı penceresinin içindeyse.
  const inWarningPhase =
    !isOverdue && warningDays > 0 && daysUntil <= warningDays;

  // Kaçıncı uyarı haftasındayız (1 = ilk hafta).
  const currentWarningWeek = inWarningPhase
    ? Math.min(warningWeeks, Math.floor((warningDays - daysUntil) / 7) + 1)
    : 0;

  return {
    lastActivityAt: lastActivity.toISOString(),
    inactivityDays,
    warningWeeks,
    daysSinceActivity: Math.floor(daysSince),
    daysUntilDelivery: Math.ceil(daysUntil),
    isOverdue,
    inWarningPhase,
    currentWarningWeek,
    warningWeeksRemaining: inWarningPhase
      ? Math.max(0, warningWeeks - currentWarningWeek + 1)
      : warningWeeks,
  };
}
