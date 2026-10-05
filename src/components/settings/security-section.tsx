"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, KeyRound, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/provider";

export function SecuritySection() {
  const t = useT();
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  const [resetConfirm, setResetConfirm] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [resetting, setResetting] = useState(false);

  const [about, setAbout] = useState<{
    version: string;
    productName: string;
    dataDir: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/app-info")
      .then((r) => r.json())
      .then((d) => {
        if (d.version) setAbout(d);
      })
      .catch(() => {});
  }, []);

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    setPinErr("");
    setPinMsg("");
    setPinSaving(true);
    const res = await fetch("/api/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin, newPin, confirmPin }),
    });
    const data = await res.json();
    setPinSaving(false);
    if (!res.ok) {
      setPinErr(data.error ?? t("settings.pinChangeFailed"));
      return;
    }
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setPinMsg(t("settings.pinChangeOk"));
  }

  async function factoryReset(e: React.FormEvent) {
    e.preventDefault();
    setResetErr("");
    setResetting(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: resetConfirm.trim() }),
    });
    const data = await res.json();
    setResetting(false);
    if (!res.ok) {
      setResetErr(data.error ?? t("settings.resetFailed"));
      return;
    }
    router.replace("/login");
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("settings.pinTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("settings.pinDesc")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePin} className="max-w-md space-y-3">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("settings.currentPin")}
              </label>
              <Input
                type="password"
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("settings.newPin")}
              </label>
              <Input
                type="password"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("settings.confirmNewPin")}
              </label>
              <Input
                type="password"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
            </div>
            {pinErr && <p className="text-sm text-rose-400">{pinErr}</p>}
            {pinMsg && <p className="text-sm text-emerald-400">{pinMsg}</p>}
            <Button type="submit" disabled={pinSaving}>
              {pinSaving ? t("common.saving") : t("settings.changePin")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("settings.resetTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("settings.resetDesc")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={factoryReset} className="max-w-md space-y-3">
            <label className="mb-1.5 block text-sm text-slate-400">
              {t("settings.resetConfirmLabel")}
            </label>
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET LEGACY"
              autoComplete="off"
            />
            {resetErr && <p className="text-sm text-rose-400">{resetErr}</p>}
            <Button type="submit" variant="danger" disabled={resetting}>
              {resetting ? t("settings.resetting") : t("settings.resetSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("settings.aboutTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("settings.aboutDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-400">
          <p>
            <span className="text-slate-500">{t("settings.aboutVersion")}: </span>
            <span className="text-foreground">
              {about?.productName ?? "Digital Legacy"}{" "}
              {about?.version ?? "…"}
            </span>
          </p>
          <p className="break-all">
            <span className="text-slate-500">{t("settings.aboutDataDir")}: </span>
            <span className="text-foreground">{about?.dataDir ?? "…"}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
