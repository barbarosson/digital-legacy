import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { deliverMessage } from "@/lib/delivery/engine";
import { decryptMessageFields } from "@/lib/crypto/records";
import { getDb } from "@/lib/db";
import { messages } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;
  const { dataKey } = session;

  const { id } = await params;
  const messageId = Number(id);

  const db = getDb();
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  if (message.status === "teslim") {
    return NextResponse.json(
      { error: "This message has already been delivered." },
      { status: 400 },
    );
  }

  if (message.status !== "hazir") {
    return NextResponse.json(
      { error: "Only messages in Ready status can be delivered." },
      { status: 400 },
    );
  }

  if (message.deliveryType !== "manuel") {
    return NextResponse.json(
      {
        error:
          "This message is not marked for manual delivery. Check the delivery type.",
      },
      { status: 400 },
    );
  }

  const delivery = await deliverMessage(messageId, "manuel", dataKey);
  if (!delivery) {
    return NextResponse.json(
      { error: "Delivery failed." },
      { status: 500 },
    );
  }

  const [updated] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  return NextResponse.json({
    ok: true,
    message: decryptMessageFields(updated, dataKey),
    deliveryId: delivery.id,
  });
}
