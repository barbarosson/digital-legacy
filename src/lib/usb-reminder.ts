import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { DATA_DIR } from "@/lib/paths";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export const USB_REMINDER_ENABLED_KEY = "usb_reminder_enabled";
export const USB_REMINDER_INTERVAL_KEY = "usb_reminder_interval_days";
export const USB_REMINDER_MESSAGE_KEY = "usb_reminder_message";
export const USB_LAST_EXPORTED_KEY = "usb_last_exported_at";

export const DEFAULT_USB_INTERVAL_DAYS = 30;
export const DEFAULT_USB_REMINDER_MESSAGE =
  "Time to copy your Digital Legacy backup to a USB drive for your trusted contact.";

export type UsbReminderSettings = {
  enabled: boolean;
  intervalDays: number;
  message: string;
  lastExportedAt: string | null;
};

export type UsbReminderFileConfig = {
  enabled: boolean;
  intervalDays: number;
  message: string;
  lastExportedAt: string | null;
  lastShownOn: string | null;
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

export async function getUsbReminderSettings(): Promise<UsbReminderSettings> {
  const [enabled, interval, message, lastExported] = await Promise.all([
    getSetting(USB_REMINDER_ENABLED_KEY),
    getSetting(USB_REMINDER_INTERVAL_KEY),
    getSetting(USB_REMINDER_MESSAGE_KEY),
    getSetting(USB_LAST_EXPORTED_KEY),
  ]);

  const parsedInterval = Number(interval);
  return {
    enabled: enabled === "true",
    intervalDays:
      Number.isFinite(parsedInterval) && parsedInterval >= 1
        ? Math.min(365, Math.floor(parsedInterval))
        : DEFAULT_USB_INTERVAL_DAYS,
    message: message?.trim() || DEFAULT_USB_REMINDER_MESSAGE,
    lastExportedAt: lastExported || null,
  };
}

/** True when enabled and interval days have passed since last export (or never). */
export function isUsbReminderDue(settings: UsbReminderSettings): boolean {
  if (!settings.enabled) return false;
  if (!settings.lastExportedAt) return true;
  const last = Date.parse(settings.lastExportedAt);
  if (!Number.isFinite(last)) return true;
  const dueAt = last + settings.intervalDays * 24 * 60 * 60 * 1000;
  return Date.now() >= dueAt;
}

export async function setUsbReminderSettings(
  settings: Omit<UsbReminderSettings, "lastExportedAt">,
) {
  await Promise.all([
    setSetting(USB_REMINDER_ENABLED_KEY, settings.enabled ? "true" : "false"),
    setSetting(USB_REMINDER_INTERVAL_KEY, String(settings.intervalDays)),
    setSetting(USB_REMINDER_MESSAGE_KEY, settings.message),
  ]);
  const current = await getUsbReminderSettings();
  writeUsbReminderConfig(current);
}

export async function markUsbExportDone() {
  const iso = new Date().toISOString();
  await setSetting(USB_LAST_EXPORTED_KEY, iso);
  const current = await getUsbReminderSettings();
  writeUsbReminderConfig({ ...current, lastExportedAt: iso });
  return iso;
}

export function writeUsbReminderConfig(settings: UsbReminderSettings) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const file = path.join(DATA_DIR, "usb-reminder.json");
    let lastShownOn: string | null = null;
    if (fs.existsSync(file)) {
      try {
        const prev = JSON.parse(
          fs.readFileSync(file, "utf-8"),
        ) as UsbReminderFileConfig;
        lastShownOn = prev.lastShownOn ?? null;
      } catch {
        /* ignore */
      }
    }
    const payload: UsbReminderFileConfig = {
      enabled: settings.enabled,
      intervalDays: settings.intervalDays,
      message: settings.message,
      lastExportedAt: settings.lastExportedAt,
      lastShownOn,
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  } catch {
    /* non-critical */
  }
}
