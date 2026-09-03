import { NextResponse } from "next/server";
import {
  destroySession,
  getSessionTokenFromCookies,
} from "@/lib/auth/session";

export async function POST() {
  const token = await getSessionTokenFromCookies();
  await destroySession(token);
  return NextResponse.json({ ok: true });
}
