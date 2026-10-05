import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import {
  getUsbReminderSettings,
  isUsbReminderDue,
  markUsbExportDone,
  setUsbReminderSettings,
} from "@/lib/usb-reminder";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("usb_export_reminder"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const settings = await getUsbReminderSettings();
  return NextResponse.json({
    ...settings,
    due: isUsbReminderDue(settings),
  });
}

export async function PUT(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("usb_export_reminder"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    enabled?: boolean;
    intervalDays?: number;
    message?: string;
    markExported?: boolean;
  };

  if (body.markExported) {
    const lastExportedAt = await markUsbExportDone();
    const settings = await getUsbReminderSettings();
    return NextResponse.json({ ...settings, lastExportedAt });
  }

  const intervalDays = Number(body.intervalDays);
  if (
    !Number.isFinite(intervalDays) ||
    intervalDays < 1 ||
    intervalDays > 365
  ) {
    return NextResponse.json(
      { error: "Interval must be between 1 and 365 days." },
      { status: 400 },
    );
  }

  await setUsbReminderSettings({
    enabled: Boolean(body.enabled),
    intervalDays: Math.floor(intervalDays),
    message:
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : "Time to copy your Digital Legacy backup to a USB drive for your trusted contact.",
  });

  const settings = await getUsbReminderSettings();
  return NextResponse.json(settings);
}
