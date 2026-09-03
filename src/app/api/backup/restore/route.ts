import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  destroySession,
  getSessionTokenFromCookies,
} from "@/lib/auth/session";
import { restoreDatabaseFromBuffer } from "@/lib/backup/database";

const CONFIRM_TEXT = "RESTORE";

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const formData = await request.formData();
  const file = formData.get("file");
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (confirm !== CONFIRM_TEXT) {
    return NextResponse.json(
      { error: `Type "${CONFIRM_TEXT}" to confirm.` },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Select a valid .db file." },
      { status: 400 },
    );
  }

  if (!file.name.toLowerCase().endsWith(".db")) {
    return NextResponse.json(
      { error: "Only SQLite files with a .db extension are accepted." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    restoreDatabaseFromBuffer(buffer);

    const token = await getSessionTokenFromCookies();
    await destroySession(token);

    return NextResponse.json({
      ok: true,
      relogin: true,
      message:
        "Backup restored. Your session was ended; unlock again with your PIN.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Restore failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
