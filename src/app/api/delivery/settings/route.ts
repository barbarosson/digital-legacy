import { NextResponse } from "next/server";
import {
  MAX_INACTIVITY_DAYS,
  MAX_WARNING_WEEKS,
  MIN_INACTIVITY_DAYS,
  MIN_WARNING_WEEKS,
} from "@/lib/constants";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  getInactivityDays,
  getInactivityStatus,
  getWarningWeeks,
  setInactivityDays,
  setWarningWeeks,
} from "@/lib/delivery/activity";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const [days, weeks, status] = await Promise.all([
    getInactivityDays(),
    getWarningWeeks(),
    getInactivityStatus(),
  ]);

  return NextResponse.json({
    inactivityDays: days,
    warningWeeks: weeks,
    minDays: MIN_INACTIVITY_DAYS,
    maxDays: MAX_INACTIVITY_DAYS,
    minWarningWeeks: MIN_WARNING_WEEKS,
    maxWarningWeeks: MAX_WARNING_WEEKS,
    status,
  });
}

export async function PUT(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const days = Number(body.inactivityDays);

  if (Number.isNaN(days)) {
    return NextResponse.json(
      { error: "Enter a valid number of days." },
      { status: 400 },
    );
  }

  if (days < MIN_INACTIVITY_DAYS || days > MAX_INACTIVITY_DAYS) {
    return NextResponse.json(
      {
        error: `Inactivity period must be between ${MIN_INACTIVITY_DAYS} and ${MAX_INACTIVITY_DAYS} days.`,
      },
      { status: 400 },
    );
  }

  await setInactivityDays(days);

  if (body.warningWeeks !== undefined) {
    const weeks = Number(body.warningWeeks);
    if (
      Number.isNaN(weeks) ||
      weeks < MIN_WARNING_WEEKS ||
      weeks > MAX_WARNING_WEEKS
    ) {
      return NextResponse.json(
        {
          error: `Warning period must be between ${MIN_WARNING_WEEKS} and ${MAX_WARNING_WEEKS} weeks.`,
        },
        { status: 400 },
      );
    }
    await setWarningWeeks(weeks);
  }

  const status = await getInactivityStatus();
  const weeks = await getWarningWeeks();

  return NextResponse.json({
    ok: true,
    inactivityDays: days,
    warningWeeks: weeks,
    status,
  });
}
