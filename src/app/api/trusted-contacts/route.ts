import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import {
  createTrustedContact,
  listTrustedContacts,
} from "@/lib/trusted-contacts";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("trusted_contacts"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const contacts = await listTrustedContacts();
  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("trusted_contacts"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    handoffInstruction?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const contact = await createTrustedContact({
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    notes: body.notes ?? null,
    handoffInstruction: body.handoffInstruction ?? null,
  });

  return NextResponse.json({ contact }, { status: 201 });
}
