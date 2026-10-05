import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import { listTrustedContacts } from "@/lib/trusted-contacts";

/** Download trusted contacts as plaintext JSON (unlocked session only). */
export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("trusted_contacts"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const contacts = await listTrustedContacts(session.dataKey);
  const stamp = new Date().toISOString().slice(0, 10);
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Digital Legacy",
    contacts: contacts.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      notes: c.notes,
      handoffInstruction: c.handoffInstruction,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trusted-contacts-${stamp}.json"`,
    },
  });
}
