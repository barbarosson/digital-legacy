"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HardDrive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

const DISMISS_KEY = "dl-usb-banner-dismissed";

export function UsbReminderBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (dismissed === "1") {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }

    const res = await fetch("/api/usb-reminder");
    if (!res.ok) {
      setVisible(false);
      return;
    }
    const data = await res.json();
    if (data.due) {
      setMessage(typeof data.message === "string" ? data.message : "");
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function markDone() {
    await fetch("/api/usb-reminder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markExported: true }),
    });
    setVisible(false);
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-amber-50">{t("pro.usbBannerTitle")}</p>
        {message && <p className="mt-1 text-amber-100/80">{message}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/panel/backup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-medium text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400"
          >
            {t("pro.usbBannerCta")}
          </Link>
          <Button type="button" size="sm" variant="secondary" onClick={markDone}>
            {t("pro.usbBannerMark")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
            {t("pro.usbBannerDismiss")}
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="rounded p-1 text-amber-200/70 hover:bg-amber-500/20 hover:text-amber-50"
        aria-label={t("pro.usbBannerDismiss")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
