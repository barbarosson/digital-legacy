import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import {
  buildHandoffSummary,
  handoffSummaryToHtml,
  handoffSummaryToText,
} from "@/lib/handoff-summary";

/**
 * Pro handoff packet: printable HTML (default) or plain text (?format=txt).
 */
export async function GET(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("trusted_contacts"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const format = new URL(request.url).searchParams.get("format") ?? "html";
  const summary = await buildHandoffSummary(session.dataKey);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "txt" || format === "text") {
    const body = handoffSummaryToText(summary);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="digital-legacy-handoff-${stamp}.txt"`,
      },
    });
  }

  const html = handoffSummaryToHtml(summary);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="digital-legacy-handoff-${stamp}.html"`,
    },
  });
}
