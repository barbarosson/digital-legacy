"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  Cloud,
  Download,
  HeartPulse,
  LogOut,
  Mail,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProBadge, ProGate } from "@/components/pro/pro-gate";
import { useT } from "@/lib/i18n/provider";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

type CloudSettings = {
  user_id: string;
  deadman_enabled: boolean;
  inactivity_days: number;
  warning_days: number;
  last_checkin_at: string;
  owner_email: string | null;
  alert_emails: string[];
  status: string;
  handoff_note: string | null;
};

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function deadmanTimeline(settings: CloudSettings | null) {
  if (!settings?.deadman_enabled) return null;
  const since = daysSince(settings.last_checkin_at) ?? 0;
  const warnAt = Math.max(0, settings.inactivity_days - settings.warning_days);
  const daysToWarn = Math.max(0, warnAt - since);
  const daysToTrigger = Math.max(0, settings.inactivity_days - since);
  return {
    since: Math.floor(since),
    warnAt,
    daysToWarn: Math.ceil(daysToWarn),
    daysToTrigger: Math.ceil(daysToTrigger),
    status: settings.status,
  };
}

type BackupRow = {
  id: number;
  storage_path: string;
  size_bytes: number;
  content_hash: string | null;
  created_at: string;
};

export function CloudSection({
  isPro,
  onUnlockClick,
}: {
  isPro: boolean;
  onUnlockClick: () => void;
}) {
  const t = useT();
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [settings, setSettings] = useState<CloudSettings | null>(null);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [alertEmailsText, setAlertEmailsText] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [inactivityDays, setInactivityDays] = useState(30);
  const [warningDays, setWarningDays] = useState(7);
  const [deadmanEnabled, setDeadmanEnabled] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCloudData = useCallback(async (uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: existing } = await supabase
      .from("dm_cloud_settings")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    let row = existing as CloudSettings | null;
    if (!row) {
      const { data: created, error } = await supabase
        .from("dm_cloud_settings")
        .insert({
          user_id: uid,
          owner_email: (await supabase.auth.getUser()).data.user?.email ?? null,
        })
        .select("*")
        .single();
      if (error) {
        setMsg(error.message);
        return;
      }
      row = created as CloudSettings;
    }

    setSettings(row);
    setDeadmanEnabled(row.deadman_enabled);
    setInactivityDays(row.inactivity_days);
    setWarningDays(row.warning_days);
    setAlertEmailsText((row.alert_emails ?? []).join(", "));
    setHandoffNote(row.handoff_note ?? "");

    const { data: bak } = await supabase
      .from("dm_vault_backups")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);
    setBackups((bak as BackupRow[]) ?? []);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
      if (data.session?.user) {
        loadCloudData(data.session.user.id).catch(() => {});
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.user) {
        loadCloudData(next.user.id).catch(() => {});
      } else {
        setSettings(null);
        setBackups([]);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadCloudData]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setAuthError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else setAuthError("");
      setMsg(t("cloud.confirmSent"));
    }
    setAuthBusy(false);
  }

  async function signOut() {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
  }

  async function saveDeadman(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMsg("");
    const emails = alertEmailsText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("dm_cloud_settings")
      .update({
        deadman_enabled: deadmanEnabled,
        inactivity_days: inactivityDays,
        warning_days: warningDays,
        alert_emails: emails,
        handoff_note: handoffNote.trim() || null,
        owner_email: user.email,
        updated_at: new Date().toISOString(),
        // Reset trigger state when saving while enabled & checking in
        status: "active",
      })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(t("cloud.deadmanSaved"));
    await loadCloudData(user.id);
  }

  async function checkIn() {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("dm_cloud_settings")
      .update({
        last_checkin_at: now,
        status: "active",
        updated_at: now,
      })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(t("cloud.checkinOk"));
    await loadCloudData(user.id);
  }

  async function uploadBackup() {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/cloud/pack", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("cloud.packFailed"));
      }
      const hash = res.headers.get("X-Content-Hash") ?? "";
      const blob = await res.blob();
      const path = `${user.id}/latest.dlenc`;
      const { error: upErr } = await supabase.storage
        .from("dm-vaults")
        .upload(path, blob, {
          upsert: true,
          contentType: "application/octet-stream",
        });
      if (upErr) throw upErr;

      const { error: metaErr } = await supabase.from("dm_vault_backups").insert({
        user_id: user.id,
        storage_path: path,
        size_bytes: blob.size,
        content_hash: hash,
      });
      if (metaErr) throw metaErr;

      // Check-in on successful backup
      await supabase
        .from("dm_cloud_settings")
        .update({
          last_checkin_at: new Date().toISOString(),
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      setMsg(t("cloud.uploadOk"));
      await loadCloudData(user.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("cloud.uploadFailed"));
    }
    setBusy(false);
  }

  async function downloadEncryptedBlob() {
    if (!user || backups.length === 0) {
      throw new Error(t("cloud.downloadFailed"));
    }
    const supabase = getSupabase();
    if (!supabase) throw new Error(t("cloud.unconfigured"));
    const path = backups[0].storage_path;
    const { data, error } = await supabase.storage
      .from("dm-vaults")
      .download(path);
    if (error || !data) throw error ?? new Error(t("cloud.downloadFailed"));
    return data;
  }

  async function downloadLatest() {
    if (!user || backups.length === 0) return;
    setBusy(true);
    setMsg("");
    try {
      const data = await downloadEncryptedBlob();
      const unpack = await fetch("/api/cloud/unpack", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/octet-stream" },
      });
      if (!unpack.ok) {
        const j = await unpack.json().catch(() => ({}));
        throw new Error(j.error ?? t("cloud.decryptFailed"));
      }
      const kind = unpack.headers.get("X-Archive-Kind") ?? "legacy-db";
      const blob = await unpack.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        kind === "dlvault"
          ? "digital-legacy-restored.zip"
          : "digital-legacy-restored.db";
      a.click();
      URL.revokeObjectURL(url);
      setMsg(t("cloud.downloadOk"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("cloud.downloadFailed"));
    }
    setBusy(false);
  }

  async function applyRestore() {
    if (!user || backups.length === 0) return;
    const ok = window.confirm(t("cloud.restoreConfirm"));
    if (!ok) return;
    setBusy(true);
    setMsg("");
    try {
      const data = await downloadEncryptedBlob();
      const res = await fetch("/api/cloud/apply-restore", {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "application/octet-stream",
          "x-confirm": "RESTORE",
        },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error ?? t("cloud.restoreFailed"));
      }
      setMsg(t("cloud.restoreOk"));
      window.location.href = "/giris?next=/panel/ayarlar";
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("cloud.restoreFailed"));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-foreground">
            {t("cloud.title")}
          </h2>
          <ProBadge />
        </div>
        <p className="mt-2 text-sm text-slate-500">{t("cloud.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <ProGate isPro={isPro} onUnlockClick={onUnlockClick}>
          {!configured ? (
            <p className="text-sm text-slate-500">{t("cloud.unconfigured")}</p>
          ) : authLoading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : !session ? (
            <form onSubmit={handleAuth} className="space-y-3 max-w-md">
              <p className="text-sm text-slate-400">{t("cloud.authHint")}</p>
              <Input
                type="email"
                required
                placeholder={t("cloud.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                required
                minLength={6}
                placeholder={t("cloud.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {authError && (
                <p className="text-sm text-rose-400">{authError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={authBusy}>
                  {authBusy
                    ? t("common.saving")
                    : mode === "signin"
                      ? t("cloud.signIn")
                      : t("cloud.signUp")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setMode(mode === "signin" ? "signup" : "signin")
                  }
                >
                  {mode === "signin"
                    ? t("cloud.needAccount")
                    : t("cloud.haveAccount")}
                </Button>
              </div>
              {msg && <p className="text-sm text-emerald-400">{msg}</p>}
            </form>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  {t("cloud.signedInAs")}{" "}
                  <span className="text-foreground">{user?.email}</span>
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  {t("cloud.signOut")}
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Upload className="h-4 w-4 text-amber-400" />
                  {t("cloud.backupTitle")}
                </h3>
                <p className="text-sm text-slate-500">{t("cloud.backupDesc")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busy} onClick={uploadBackup}>
                    <Upload className="h-4 w-4" />
                    {t("cloud.upload")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || backups.length === 0}
                    onClick={downloadLatest}
                  >
                    <Download className="h-4 w-4" />
                    {t("cloud.download")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || backups.length === 0}
                    onClick={applyRestore}
                  >
                    {t("cloud.restoreNow")}
                  </Button>
                </div>
                {backups[0] && (
                  <p className="text-xs text-slate-500">
                    {t("cloud.lastBackup")}: {formatDate(backups[0].created_at)}{" "}
                    ·{" "}
                    {backups[0].size_bytes >= 1024 * 1024
                      ? `${(backups[0].size_bytes / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(backups[0].size_bytes / 1024)} KB`}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <HeartPulse className="h-4 w-4 text-amber-400" />
                  {t("cloud.checkinTitle")}
                </h3>
                <p className="text-sm text-slate-500">{t("cloud.checkinDesc")}</p>
                <p className="text-sm text-slate-400">
                  {t("cloud.lastCheckin")}:{" "}
                  {settings?.last_checkin_at
                    ? formatDate(settings.last_checkin_at)
                    : "—"}{" "}
                  · {t("cloud.status")}: {settings?.status ?? "active"}
                </p>
                {(() => {
                  const tl = deadmanTimeline(
                    settings
                      ? { ...settings, deadman_enabled: deadmanEnabled }
                      : null,
                  );
                  if (!tl) return null;
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-400">
                      <p>
                        {t("cloud.deadmanStatusDays")}: {tl.since} ·{" "}
                        {t("cloud.deadmanStatusWarnIn")}: {tl.daysToWarn} ·{" "}
                        {t("cloud.deadmanStatusTriggerIn")}: {tl.daysToTrigger}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {t("cloud.deadmanOpsNote")}
                      </p>
                    </div>
                  );
                })()}
                <Button type="button" disabled={busy} onClick={checkIn}>
                  {t("cloud.checkinCta")}
                </Button>
              </div>

              <form onSubmit={saveDeadman} className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Mail className="h-4 w-4 text-amber-400" />
                  {t("cloud.deadmanTitle")}
                </h3>
                <p className="text-sm text-slate-500">{t("cloud.deadmanDesc")}</p>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={deadmanEnabled}
                    onChange={(e) => setDeadmanEnabled(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  {t("cloud.deadmanEnable")}
                </label>
                <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("cloud.inactivityDays")}
                    </label>
                    <Input
                      type="number"
                      min={7}
                      max={365}
                      value={inactivityDays}
                      onChange={(e) =>
                        setInactivityDays(Number(e.target.value) || 30)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("cloud.warningDays")}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={warningDays}
                      onChange={(e) =>
                        setWarningDays(Number(e.target.value) || 7)
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">
                    {t("cloud.alertEmails")}
                  </label>
                  <Textarea
                    value={alertEmailsText}
                    onChange={(e) => setAlertEmailsText(e.target.value)}
                    placeholder="heir@example.com, lawyer@example.com"
                  />
                  <p className="mt-1 text-xs text-slate-600">
                    {t("cloud.alertEmailsHint")}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">
                    {t("cloud.handoffNote")}
                  </label>
                  <Textarea
                    value={handoffNote}
                    onChange={(e) => setHandoffNote(e.target.value)}
                    placeholder={t("cloud.handoffPlaceholder")}
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? t("common.saving") : t("common.save")}
                </Button>
              </form>

              {msg && (
                <p className="text-sm text-emerald-400">{msg}</p>
              )}
              <p className="text-xs text-slate-600">{t("cloud.privacyNote")}</p>
            </div>
          )}
        </ProGate>
      </CardContent>
    </Card>
  );
}
