"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, HardDrive, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProBadge, ProGate } from "@/components/pro/pro-gate";
import { CloudSection } from "@/components/pro/cloud-section";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";

type Entitlement = {
  plan: "free" | "pro";
  isPro: boolean;
  unlockedAt: string | null;
};

type TrustedContact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  handoffInstruction: string | null;
};

type UsbSettings = {
  enabled: boolean;
  intervalDays: number;
  message: string;
  lastExportedAt: string | null;
};

export function ProSection() {
  const t = useT();
  const unlockRef = useRef<HTMLDivElement>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [code, setCode] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockSuccess, setUnlockSuccess] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    handoffInstruction: "",
  });
  const [contactError, setContactError] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const [usb, setUsb] = useState<UsbSettings>({
    enabled: false,
    intervalDays: 30,
    message: "",
    lastExportedAt: null,
  });
  const [usbSaving, setUsbSaving] = useState(false);
  const [usbMsg, setUsbMsg] = useState("");

  async function loadEntitlement() {
    const res = await fetch("/api/entitlements");
    if (!res.ok) return;
    const data = (await res.json()) as Entitlement;
    setEntitlement(data);
    if (data.isPro) {
      await Promise.all([loadContacts(), loadUsb()]);
    }
  }

  async function loadContacts() {
    const res = await fetch("/api/trusted-contacts");
    if (!res.ok) return;
    const data = await res.json();
    setContacts(data.contacts ?? []);
  }

  async function loadUsb() {
    const res = await fetch("/api/usb-reminder");
    if (!res.ok) return;
    const data = await res.json();
    setUsb({
      enabled: Boolean(data.enabled),
      intervalDays: Number(data.intervalDays) || 30,
      message: data.message ?? "",
      lastExportedAt: data.lastExportedAt ?? null,
    });
  }

  useEffect(() => {
    loadEntitlement().catch(() => {});
  }, []);

  function scrollToUnlock() {
    unlockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError("");
    setUnlockSuccess("");
    const res = await fetch("/api/entitlements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setUnlocking(false);
    if (!res.ok) {
      setUnlockError(data.error ?? t("pro.unlockFailed"));
      return;
    }
    setUnlockSuccess(t("pro.unlockSuccess"));
    setCode("");
    setEntitlement({
      plan: data.plan,
      isPro: data.isPro,
      unlockedAt: data.unlockedAt,
    });
    await Promise.all([loadContacts(), loadUsb()]);
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    setContactError("");
    const res = await fetch("/api/trusted-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    const data = await res.json();
    setSavingContact(false);
    if (!res.ok) {
      setContactError(data.error ?? t("pro.contactSaveFailed"));
      return;
    }
    setContactForm({
      name: "",
      email: "",
      phone: "",
      handoffInstruction: "",
    });
    setContacts((prev) => [data.contact, ...prev]);
  }

  async function removeContact(id: number) {
    const res = await fetch(`/api/trusted-contacts/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function saveUsb(e: React.FormEvent) {
    e.preventDefault();
    setUsbSaving(true);
    setUsbMsg("");
    const res = await fetch("/api/usb-reminder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: usb.enabled,
        intervalDays: usb.intervalDays,
        message: usb.message,
      }),
    });
    const data = await res.json();
    setUsbSaving(false);
    if (!res.ok) {
      setUsbMsg(data.error ?? t("pro.usbSaveFailed"));
      return;
    }
    setUsb((prev) => ({ ...prev, ...data }));
    setUsbMsg(t("pro.usbSaved"));
  }

  async function markExported() {
    const res = await fetch("/api/usb-reminder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markExported: true }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setUsb((prev) => ({ ...prev, lastExportedAt: data.lastExportedAt }));
    setUsbMsg(t("pro.usbMarked"));
  }

  const isPro = Boolean(entitlement?.isPro);

  return (
    <div className="space-y-8">
      <div ref={unlockRef}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("pro.title")}
            </h2>
            {isPro && <ProBadge />}
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("pro.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
            <p className="font-medium text-foreground">
              {isPro ? t("pro.statusPro") : t("pro.statusFree")}
            </p>
            <p className="mt-1 text-slate-500">{t("pro.freeIncludes")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
              <li>{t("pro.freeItem1")}</li>
              <li>{t("pro.freeItem2")}</li>
              <li>{t("pro.freeItem3")}</li>
            </ul>
            <p className="mt-3 text-slate-500">{t("pro.proIncludes")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
              <li>{t("pro.featureTrustedDesc")}</li>
              <li>{t("pro.featureUsbDesc")}</li>
              <li>{t("pro.featureCloudDesc")}</li>
              <li>{t("pro.featureDeadmanDesc")}</li>
            </ul>
          </div>

          {!isPro && (
            <form onSubmit={handleUnlock} className="space-y-3">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("pro.unlockCode")}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="DIGITAL-LEGACY-PRO"
                  className="sm:max-w-xs"
                />
                <Button type="submit" disabled={unlocking || !code.trim()}>
                  {unlocking ? t("common.saving") : t("pro.unlockCta")}
                </Button>
              </div>
              <p className="text-xs text-slate-600">{t("pro.unlockHint")}</p>
              {unlockError && (
                <p className="text-sm text-rose-400">{unlockError}</p>
              )}
              {unlockSuccess && (
                <p className="text-sm text-emerald-400">{unlockSuccess}</p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("pro.trustedTitle")}
            </h2>
            <ProBadge />
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("pro.trustedDesc")}</p>
        </CardHeader>
        <CardContent>
          <ProGate isPro={isPro} onUnlockClick={scrollToUnlock}>
            <div className="space-y-6">
              <form onSubmit={addContact} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("pro.contactName")}
                    </label>
                    <Input
                      required
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("pro.contactEmail")}
                    </label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("pro.contactPhone")}
                    </label>
                    <Input
                      value={contactForm.phone}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">
                    {t("pro.contactHandoff")}
                  </label>
                  <Textarea
                    value={contactForm.handoffInstruction}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        handoffInstruction: e.target.value,
                      })
                    }
                    placeholder={t("pro.contactHandoffPlaceholder")}
                  />
                </div>
                {contactError && (
                  <p className="text-sm text-rose-400">{contactError}</p>
                )}
                <Button type="submit" disabled={savingContact}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  {savingContact ? t("common.saving") : t("pro.addContact")}
                </Button>
              </form>

              {contacts.length === 0 ? (
                <p className="text-sm text-slate-500">{t("pro.noContacts")}</p>
              ) : (
                <ul className="space-y-3">
                  {contacts.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                    >
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {[c.email, c.phone].filter(Boolean).join(" · ") ||
                            t("pro.noContactDetails")}
                        </p>
                        {c.handoffInstruction && (
                          <p className="mt-2 text-sm text-slate-400">
                            {c.handoffInstruction}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(c.id)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ProGate>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("pro.usbTitle")}
            </h2>
            <ProBadge />
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("pro.usbDesc")}</p>
        </CardHeader>
        <CardContent>
          <ProGate isPro={isPro} onUnlockClick={scrollToUnlock}>
            <form onSubmit={saveUsb} className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={usb.enabled}
                  onChange={(e) =>
                    setUsb({ ...usb, enabled: e.target.checked })
                  }
                  className="rounded border-slate-600"
                />
                {t("pro.usbEnable")}
              </label>
              <div className="max-w-40">
                <label className="mb-1.5 block text-sm text-slate-400">
                  {t("pro.usbInterval")}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={usb.intervalDays}
                  onChange={(e) =>
                    setUsb({
                      ...usb,
                      intervalDays: Number(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">
                  {t("pro.usbMessage")}
                </label>
                <Textarea
                  value={usb.message}
                  onChange={(e) =>
                    setUsb({ ...usb, message: e.target.value })
                  }
                />
              </div>
              <p className="text-sm text-slate-500">
                {t("pro.usbLastExport")}:{" "}
                {usb.lastExportedAt
                  ? formatDate(usb.lastExportedAt)
                  : t("pro.usbNever")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={usbSaving}>
                  {usbSaving ? t("common.saving") : t("common.save")}
                </Button>
                <Button type="button" variant="secondary" onClick={markExported}>
                  {t("pro.usbMarkDone")}
                </Button>
              </div>
              {usbMsg && (
                <p className="text-sm text-emerald-400">{usbMsg}</p>
              )}
              <p className="text-xs text-slate-600">{t("pro.usbNote")}</p>
            </form>
          </ProGate>
        </CardContent>
      </Card>

      <CloudSection isPro={isPro} onUnlockClick={scrollToUnlock} />
    </div>
  );
}
