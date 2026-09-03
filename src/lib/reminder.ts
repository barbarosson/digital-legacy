import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { DATA_DIR } from "@/lib/paths";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export const REMINDER_ENABLED_KEY = "reminder_enabled";
export const REMINDER_TIME_KEY = "reminder_time";
export const REMINDER_MESSAGE_KEY = "reminder_message";

export const DEFAULT_REMINDER_TIME = "20:00";
export const DEFAULT_REMINDER_MESSAGE =
  "How was today? Don't forget to record your daily video.";

export type ReminderSettings = {
  enabled: boolean;
  time: string;
  message: string;
};

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
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const [enabled, time, message] = await Promise.all([
    getSetting(REMINDER_ENABLED_KEY),
    getSetting(REMINDER_TIME_KEY),
    getSetting(REMINDER_MESSAGE_KEY),
  ]);

  return {
    enabled: enabled === "true",
    time: time && isValidTime(time) ? time : DEFAULT_REMINDER_TIME,
    message: message?.trim() || DEFAULT_REMINDER_MESSAGE,
  };
}

export async function setReminderSettings(settings: ReminderSettings) {
  await Promise.all([
    setSetting(REMINDER_ENABLED_KEY, settings.enabled ? "true" : "false"),
    setSetting(REMINDER_TIME_KEY, settings.time),
    setSetting(REMINDER_MESSAGE_KEY, settings.message),
  ]);
  writeReminderConfig(settings);
}

/**
 * Electron ana sürecinin okuyabilmesi için hatırlatıcı ayarlarını
 * DATA_DIR/reminder.json dosyasına yazar. (Renderer ve main aynı userData
 * klasörünü paylaşır.)
 */
export function writeReminderConfig(settings: ReminderSettings) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      path.join(DATA_DIR, "reminder.json"),
      JSON.stringify(settings, null, 2),
    );
  } catch {
    // bildirim zamanlaması kritik değil; sessizce geç
  }
}
