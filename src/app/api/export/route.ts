import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import JSZip from "jszip";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { enrichWithAssignments } from "@/lib/assignments";
import { findThumbnailPath, findVideoPath, readEncryptedFile } from "@/lib/calendar/videos";
import {
  decryptAssetFields,
  decryptBeneficiaryFields,
  decryptCalendarFields,
  decryptMessageFields,
} from "@/lib/crypto/records";
import { getDb } from "@/lib/db";
import { isPro } from "@/lib/entitlements";
import {
  beneficiaries,
  beneficiaryGroups,
  calendarMemories,
  legacyAssets,
  messages,
} from "@/lib/db/schema";
import { listTrustedContacts } from "@/lib/trusted-contacts";
import { markUsbExportDone } from "@/lib/usb-reminder";

export async function POST() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const db = getDb();
  const pro = await isPro();

  const [beneficiaryRows, groupRows, assetRows, messageRows, memoryRows] =
    await Promise.all([
      db.select().from(beneficiaries).orderBy(desc(beneficiaries.createdAt)),
      db.select().from(beneficiaryGroups),
      db.select().from(legacyAssets).orderBy(desc(legacyAssets.updatedAt)),
      db.select().from(messages).orderBy(desc(messages.createdAt)),
      db
        .select()
        .from(calendarMemories)
        .orderBy(desc(calendarMemories.entryDate)),
    ]);

  const trustedContactRows = pro
    ? await listTrustedContacts(dataKey)
    : [];

  const decryptedBeneficiaries = beneficiaryRows.map((row) =>
    decryptBeneficiaryFields(row, dataKey),
  );
  const decryptedAssets = await enrichWithAssignments(
    "asset",
    assetRows.map((row) => decryptAssetFields(row, dataKey)),
  );
  const decryptedMessages = await enrichWithAssignments(
    "message",
    messageRows.map((row) => decryptMessageFields(row, dataKey)),
  );
  const decryptedMemories = await enrichWithAssignments(
    "calendar",
    memoryRows.map((row) => decryptCalendarFields(row, dataKey)),
  );

  const zip = new JSZip();

  zip.file(
    "data.json",
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        app: "Digital Legacy",
        heirs: decryptedBeneficiaries,
        groups: groupRows,
        assets: decryptedAssets,
        messages: decryptedMessages,
        calendarMemories: decryptedMemories,
        ...(pro ? { trustedContacts: trustedContactRows } : {}),
      },
      null,
      2,
    ),
  );

  const readme = [
    "Digital Legacy — data export (GDPR)",
    "",
    "This archive contains your personal data in readable (decrypted) form:",
    "- data.json: heirs, groups, assets, messages, and calendar memories",
    ...(pro ? ["- data.json also includes Pro trusted contacts (decrypted)"] : []),
    "- videos/: calendar daily videos",
    "- thumbnails/: video thumbnails (decrypted for this export)",
    "",
    "On disk inside the app, videos are encrypted with your PIN key.",
    "This ZIP is readable — store it in a safe place.",
  ].join("\n");
  zip.file("README.txt", readme);

  const videosFolder = zip.folder("videos");
  const thumbsFolder = zip.folder("thumbnails");

  for (const memory of memoryRows) {
    if (memory.videoFileName) {
      const videoPath = findVideoPath(memory.id);
      if (videoPath) {
        const buffer = readEncryptedFile(videoPath, dataKey, false);
        if (buffer) {
          const ext = memory.videoFileName.split(".").pop() ?? "mp4";
          videosFolder?.file(
            `${memory.entryDate}-memory-${memory.id}.${ext}`,
            buffer,
          );
        }
      }
    }
    if (memory.thumbnailFileName) {
      const thumbPath = findThumbnailPath(memory.id);
      if (thumbPath) {
        const buffer = readEncryptedFile(thumbPath, dataKey, false);
        if (buffer) {
          thumbsFolder?.file(
            `${memory.entryDate}-memory-${memory.id}.jpg`,
            buffer,
          );
        }
      }
    }
  }

  const content = await zip.generateAsync({ type: "nodebuffer" });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `digital-legacy-export-${stamp}.zip`;

  if (await isPro()) {
    await markUsbExportDone().catch(() => {});
  }

  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(content.length),
    },
  });
}
