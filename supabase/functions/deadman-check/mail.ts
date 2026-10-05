/**
 * Pluggable mail for deadman-check.
 *
 * MAIL_PROVIDER: "off" | "resend" | "ses" | "auto" (default auto)
 *
 * auto:
 *   SES if AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + SES_FROM
 *   else Resend if RESEND_API_KEY
 *   else off
 */

export type MailResult = {
  ok: boolean;
  provider: string;
  detail: string;
};

export function resolveMailProvider(): "off" | "resend" | "ses" {
  const raw = (Deno.env.get("MAIL_PROVIDER") ?? "auto").trim().toLowerCase();
  if (raw === "off" || raw === "none" || raw === "disabled") return "off";
  if (raw === "resend") return "resend";
  if (raw === "ses") return "ses";

  // auto
  if (
    Deno.env.get("AWS_ACCESS_KEY_ID") &&
    Deno.env.get("AWS_SECRET_ACCESS_KEY") &&
    (Deno.env.get("SES_FROM") || Deno.env.get("MAIL_FROM"))
  ) {
    return "ses";
  }
  if (Deno.env.get("RESEND_API_KEY")) return "resend";
  return "off";
}

export async function sendMail(
  to: string[],
  subject: string,
  text: string,
): Promise<MailResult> {
  const provider = resolveMailProvider();
  if (to.length === 0) {
    return { ok: false, provider, detail: "no recipients" };
  }

  if (provider === "off") {
    console.log(
      JSON.stringify({
        event: "mail_skipped",
        provider: "off",
        to,
        subject,
      }),
    );
    // Treat as success so dead-man status can advance in dry-run / zero-cost mode.
    return {
      ok: true,
      provider: "off",
      detail: "skipped: MAIL_PROVIDER=off (status still advances; no email sent)",
    };
  }

  if (provider === "resend") return sendResend(to, subject, text);
  return sendSes(to, subject, text);
}

async function sendResend(
  to: string[],
  subject: string,
  text: string,
): Promise<MailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("RESEND_FROM") ??
    Deno.env.get("MAIL_FROM") ??
    "Digital Legacy <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, provider: "resend", detail: "RESEND_API_KEY not set" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  const body = await res.text();
  return { ok: res.ok, provider: "resend", detail: body };
}

/** Minimal SES SendEmail (SigV4) — no AWS SDK. */
async function sendSes(
  to: string[],
  subject: string,
  text: string,
): Promise<MailResult> {
  const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const sessionToken = Deno.env.get("AWS_SESSION_TOKEN");
  const region = Deno.env.get("AWS_REGION") ?? "eu-central-1";
  const from = Deno.env.get("SES_FROM") ?? Deno.env.get("MAIL_FROM");

  if (!accessKey || !secretKey || !from) {
    return {
      ok: false,
      provider: "ses",
      detail: "Need AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM",
    };
  }

  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;

  const params = new URLSearchParams();
  params.set("Action", "SendEmail");
  params.set("Version", "2010-12-01");
  params.set("Source", from);
  params.set("Message.Subject.Data", subject);
  params.set("Message.Subject.Charset", "UTF-8");
  params.set("Message.Body.Text.Data", text);
  params.set("Message.Body.Text.Charset", "UTF-8");
  to.forEach((addr, i) => {
    params.set(`Destination.ToAddresses.member.${i + 1}`, addr);
  });

  const body = params.toString();
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const service = "ses";
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = await sha256Hex(body);
  const canonicalHeaders =
    `content-type:application/x-www-form-urlencoded; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    (sessionToken ? `x-amz-security-token:${sessionToken}\n` : "");
  const signedHeaders =
    "content-type;host;x-amz-date" +
    (sessionToken ? ";x-amz-security-token" : "");

  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(
    secretKey,
    dateStamp,
    region,
    service,
  );
  const signature = await hmacHex(signingKey, stringToSign);

  const authorization =
    `${algorithm} Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    Host: host,
    "X-Amz-Date": amzDate,
    Authorization: authorization,
  };
  if (sessionToken) headers["X-Amz-Security-Token"] = sessionToken;

  const res = await fetch(endpoint, { method: "POST", headers, body });
  const detail = await res.text();
  return { ok: res.ok, provider: "ses", detail };
}

function toAmzDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bufToHex(hash);
}

async function hmac(
  key: ArrayBuffer | Uint8Array,
  message: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(
  key: ArrayBuffer | Uint8Array,
  message: string,
): Promise<string> {
  return bufToHex(await hmac(key, message));
}

async function getSignatureKey(
  secret: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
