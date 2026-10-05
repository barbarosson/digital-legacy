import { getUsbReminderSettings } from "@/lib/usb-reminder";
import { listTrustedContacts } from "@/lib/trusted-contacts";

export type HandoffSummary = {
  exportedAt: string;
  app: string;
  trustedContacts: {
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    handoffInstruction: string | null;
  }[];
  usbReminder: {
    enabled: boolean;
    intervalDays: number;
    lastExportedAt: string | null;
    message: string;
  };
  instructions: string[];
};

/** Build a printable offline handoff packet for Pro users. */
export async function buildHandoffSummary(
  dataKey: Buffer,
): Promise<HandoffSummary> {
  const [contacts, usb] = await Promise.all([
    listTrustedContacts(dataKey),
    getUsbReminderSettings(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    app: "Digital Legacy",
    trustedContacts: contacts.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      notes: c.notes,
      handoffInstruction: c.handoffInstruction,
    })),
    usbReminder: {
      enabled: usb.enabled,
      intervalDays: usb.intervalDays,
      lastExportedAt: usb.lastExportedAt,
      message: usb.message,
    },
    instructions: [
      "This handoff summary is for a trusted person who may receive a USB copy.",
      "It does not include your PIN, vault encryption keys, or decrypted asset passwords.",
      "Keep the encrypted backup (.db / cloud vault) and this summary together offline.",
      "If Pro Cloud dead-man email is enabled, heirs may also receive an inactivity alert — that mail never includes vault secrets.",
    ],
  };
}

export function handoffSummaryToText(summary: HandoffSummary): string {
  const lines: string[] = [
    "Digital Legacy — handoff summary",
    `Exported: ${summary.exportedAt}`,
    "",
    ...summary.instructions,
    "",
    "=== Trusted contacts ===",
  ];

  if (summary.trustedContacts.length === 0) {
    lines.push("(none yet)");
  } else {
    for (const c of summary.trustedContacts) {
      lines.push(`- ${c.name}`);
      if (c.email) lines.push(`  email: ${c.email}`);
      if (c.phone) lines.push(`  phone: ${c.phone}`);
      if (c.handoffInstruction) lines.push(`  handoff: ${c.handoffInstruction}`);
      if (c.notes) lines.push(`  notes: ${c.notes}`);
      lines.push("");
    }
  }

  lines.push("=== USB reminder ===");
  lines.push(`enabled: ${summary.usbReminder.enabled ? "yes" : "no"}`);
  lines.push(`intervalDays: ${summary.usbReminder.intervalDays}`);
  lines.push(`lastExportedAt: ${summary.usbReminder.lastExportedAt ?? "never"}`);
  lines.push(`message: ${summary.usbReminder.message}`);
  lines.push("");

  return lines.join("\n");
}

export function handoffSummaryToHtml(summary: HandoffSummary): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const contacts =
    summary.trustedContacts.length === 0
      ? "<p><em>(none yet)</em></p>"
      : summary.trustedContacts
          .map((c) => {
            const bits = [
              `<h3>${esc(c.name)}</h3>`,
              c.email ? `<p>Email: ${esc(c.email)}</p>` : "",
              c.phone ? `<p>Phone: ${esc(c.phone)}</p>` : "",
              c.handoffInstruction
                ? `<p>Handoff: ${esc(c.handoffInstruction)}</p>`
                : "",
              c.notes ? `<p>Notes: ${esc(c.notes)}</p>` : "",
            ];
            return `<section>${bits.filter(Boolean).join("")}</section>`;
          })
          .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Digital Legacy — handoff summary</title>
  <style>
    body { font-family: Georgia, serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; color: #111; line-height: 1.45; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.15rem; margin-top: 1.75rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
    h3 { font-size: 1rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.9rem; }
    ul { padding-left: 1.25rem; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Digital Legacy — handoff summary</h1>
  <p class="meta">Exported: ${esc(summary.exportedAt)}</p>
  <ul>${summary.instructions.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
  <h2>Trusted contacts</h2>
  ${contacts}
  <h2>USB reminder</h2>
  <p>Enabled: ${summary.usbReminder.enabled ? "yes" : "no"}</p>
  <p>Interval (days): ${summary.usbReminder.intervalDays}</p>
  <p>Last export mark: ${esc(summary.usbReminder.lastExportedAt ?? "never")}</p>
  <p>Message: ${esc(summary.usbReminder.message)}</p>
</body>
</html>`;
}
