import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import {
  deleteTrustedContact,
  updateTrustedContact,
} from "@/lib/trusted-contacts";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("trusted_contacts"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    handoffInstruction?: string;
  };

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const contact = await updateTrustedContact(Number(id), body);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
  return NextResponse.json({ contact });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("trusted_contacts"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const { id } = await params;
  await deleteTrustedContact(Number(id));
  return NextResponse.json({ ok: true });
}
