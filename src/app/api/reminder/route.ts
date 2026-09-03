import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  getReminderSettings,
  isValidTime,
  setReminderSettings,
} from "@/lib/reminder";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  return NextResponse.json(await getReminderSettings());
}

export async function PUT(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const time = String(body.time ?? "");

  if (!isValidTime(time)) {
    return NextResponse.json(
      { error: "Enter a valid time (HH:MM)." },
      { status: 400 },
    );
  }

  const settings = {
    enabled: Boolean(body.enabled),
    time,
    message: String(body.message ?? "").trim() || "Daily reminder",
  };

  await setReminderSettings(settings);

  return NextResponse.json({ ok: true, ...settings });
}
