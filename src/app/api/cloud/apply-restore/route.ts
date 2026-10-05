import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import {
  destroySession,
  getSessionTokenFromCookies,
} from "@/lib/auth/session";
import {
  restoreDatabaseFromBuffer,
  restoreVideosFromMap,
} from "@/lib/backup/database";
import { parseVaultPlaintext } from "@/lib/cloud/vault-archive";
import { decryptVaultBuffer } from "@/lib/cloud/vault-crypto";
import { canUse } from "@/lib/entitlements";

const CONFIRM_TEXT = "RESTORE";

/**
 * Decrypt a .dlenc cloud vault and apply it to the live device
 * (database + videos). Ends the PIN session afterward.
 */
export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("cloud_backup"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const confirm = request.headers.get("x-confirm")?.trim() ?? "";
  if (confirm !== CONFIRM_TEXT) {
    return NextResponse.json(
      { error: `Send header x-confirm: ${CONFIRM_TEXT}` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length < 64) {
    return NextResponse.json({ error: "Invalid vault file." }, { status: 400 });
  }

  const plain = decryptVaultBuffer(buffer, session.dataKey);
  if (!plain) {
    return NextResponse.json(
      {
        error:
          "Could not decrypt. Use the same device PIN that created this backup.",
      },
      { status: 400 },
    );
  }

  try {
    const parsed = await parseVaultPlaintext(plain);
    restoreDatabaseFromBuffer(parsed.db);
    if (parsed.videos.size > 0) {
      restoreVideosFromMap(parsed.videos);
    }

    const token = await getSessionTokenFromCookies();
    await destroySession(token);

    return NextResponse.json({
      ok: true,
      relogin: true,
      kind: parsed.kind,
      videoCount: parsed.videos.size,
      message:
        "Cloud vault restored. Your session was ended; unlock again with your PIN.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Restore failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
