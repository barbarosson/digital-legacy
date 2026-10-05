import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveMailProvider, sendMail } from "./mail.ts";

/**
 * Dead-man check for Digital Legacy Pro Cloud.
 *
 * Mail: MAIL_PROVIDER=auto|off|resend|ses (see mail.ts + docs/CLOUD.md)
 * Auth: optional DEADMAN_CRON_SECRET via x-deadman-secret header
 */

type CloudRow = {
  user_id: string;
  deadman_enabled: boolean;
  inactivity_days: number;
  warning_days: number;
  last_checkin_at: string;
  owner_email: string | null;
  alert_emails: string[] | null;
  status: string;
  handoff_note: string | null;
};

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();
  return (to.getTime() - from) / (1000 * 60 * 60 * 24);
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("DEADMAN_CRON_SECRET");
  if (secret) {
    const header = req.headers.get("x-deadman-secret");
    if (header !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const mailProvider = resolveMailProvider();
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("dm_cloud_settings")
    .select("*")
    .eq("deadman_enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = (data ?? []) as CloudRow[];
  const results: unknown[] = [];

  for (const row of rows) {
    const since = daysBetween(row.last_checkin_at);
    const warnAt = Math.max(0, row.inactivity_days - row.warning_days);

    if (
      since >= warnAt &&
      since < row.inactivity_days &&
      row.status === "active" &&
      row.owner_email
    ) {
      const mail = await sendMail(
        [row.owner_email],
        "Digital Legacy — check-in reminder",
        [
          "You have not checked in to Digital Legacy recently.",
          `Days since last check-in: ${Math.floor(since)}.`,
          `Automatic heir alerts fire after ${row.inactivity_days} days.`,
          "Open the app and tap Check-in, or upload a cloud backup.",
          "",
          "If this was intentional, ignore this email after checking in.",
        ].join("\n"),
      );
      if (mail.ok) {
        await supabase
          .from("dm_cloud_settings")
          .update({
            status: "warning_sent",
            last_warning_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", row.user_id);
      }
      results.push({
        user_id: row.user_id,
        action: "warning",
        mail,
        since,
      });
      continue;
    }

    if (since >= row.inactivity_days && row.status !== "triggered") {
      const heirs = (row.alert_emails ?? []).filter(Boolean);
      const note =
        row.handoff_note?.trim() ||
        "The owner of a Digital Legacy account has not checked in. Follow any offline instructions they gave you (USB, lawyer). This email does not contain vault passwords or decrypted data.";

      const mail = await sendMail(
        heirs,
        "Digital Legacy — inactivity alert",
        [
          "This is an automated message from Digital Legacy.",
          `The account owner has not checked in for ${Math.floor(since)} days.`,
          "",
          note,
          "",
          "No encrypted vault contents are attached. Contact the person they named as trusted contact if you have a USB copy.",
        ].join("\n"),
      );

      await supabase
        .from("dm_cloud_settings")
        .update({
          status: "triggered",
          last_triggered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);

      results.push({
        user_id: row.user_id,
        action: "triggered",
        mail,
        heirs: heirs.length,
        since,
      });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      mailProvider,
      checked: rows.length,
      results,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
