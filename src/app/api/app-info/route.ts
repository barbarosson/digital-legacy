import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { DATA_DIR, PROJECT_ROOT } from "@/lib/paths";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  let version = "0.1.0";
  let productName = "Digital Legacy";
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8"),
    ) as { version?: string; productName?: string; build?: { productName?: string } };
    version = pkg.version ?? version;
    productName =
      pkg.build?.productName ?? pkg.productName ?? productName;
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    version,
    productName,
    dataDir: DATA_DIR,
    electronHttp: process.env.ELECTRON_HTTP === "1",
  });
}
