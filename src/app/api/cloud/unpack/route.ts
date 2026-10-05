import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import { parseVaultPlaintext } from "@/lib/cloud/vault-archive";
import { decryptVaultBuffer } from "@/lib/cloud/vault-crypto";
import JSZip from "jszip";

/**
 * Decrypt a .dlenc vault into a downloadable file.
 * New archives → .zip (db + videos). Legacy → .db only.
 * Does not overwrite the live database.
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
    const stamp = new Date().toISOString().slice(0, 10);

    if (parsed.kind === "legacy-db") {
      const filename = `digital-legacy-restored-${stamp}.db`;
      return new NextResponse(new Uint8Array(parsed.db), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(parsed.db.length),
          "X-Archive-Kind": "legacy-db",
          "X-Video-Count": "0",
        },
      });
    }

    // Re-emit a clear ZIP for the user (already have buffers)
    const zip = new JSZip();
    zip.file("dijital-miras.db", parsed.db);
    if (parsed.manifest) {
      zip.file("manifest.json", JSON.stringify(parsed.manifest, null, 2));
    }
    for (const [name, buf] of parsed.videos) {
      zip.file(`videos/${name}`, buf);
    }
    const out = Buffer.from(
      await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      }),
    );
    const filename = `digital-legacy-restored-${stamp}.zip`;

    return new NextResponse(new Uint8Array(out), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(out.length),
        "X-Archive-Kind": "dlvault",
        "X-Video-Count": String(parsed.videos.size),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not unpack vault.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
