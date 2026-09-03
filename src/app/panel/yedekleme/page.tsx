"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileArchive, HardDriveUpload, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";

type BackupInfo = {
  sizeLabel: string;
  updatedAt: string | null;
  autoBackups: {
    name: string;
    sizeLabel: string;
    updatedAt: string;
  }[];
};

const CONFIRM_TEXT = "RESTORE";

export default function YedeklemePage() {
  const t = useT();
  const router = useRouter();
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadInfo() {
    const res = await fetch("/api/backup");
    if (res.ok) {
      setInfo(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInfo();
  }, []);

  async function handleDownload() {
    setDownloading(true);
    setError("");

    const res = await fetch("/api/backup", { method: "POST" });
    if (!res.ok) {
      setError(t("backup.restoreFailed"));
      setDownloading(false);
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="(.+)"/);
    const filename = match?.[1] ?? "digital-legacy-backup.db";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    setDownloading(false);
    setSuccess(t("backup.downloaded"));
  }

  async function handleExport() {
    setExporting(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/export", { method: "POST" });
    if (!res.ok) {
      setError(t("backup.exportFailed"));
      setExporting(false);
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="(.+)"/);
    const filename = match?.[1] ?? "digital-legacy-export.zip";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setSuccess(t("backup.exportDone"));
  }

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError(t("backup.pickFile"));
      return;
    }

    setRestoring(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("confirm", confirm);

    const res = await fetch("/api/backup/restore", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setRestoring(false);

    if (!res.ok) {
      setError(data.error ?? t("backup.restoreFailed"));
      return;
    }

    router.replace("/giris?next=/panel/yedekleme");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("backup.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("backup.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("backup.currentDb")}
            </h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : info ? (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <p className="text-slate-500">{t("backup.size")}</p>
                <p className="mt-1 font-medium text-foreground">
                  {info.sizeLabel}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <p className="text-slate-500">{t("backup.lastUpdate")}</p>
                <p className="mt-1 font-medium text-foreground">
                  {info.updatedAt ? formatDate(info.updatedAt) : "—"}
                </p>
              </div>
            </div>
          ) : null}

          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? t("backup.preparing") : t("backup.downloadDb")}
          </Button>

          <p className="text-xs leading-relaxed text-slate-500">
            {t("backup.downloadNote")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("backup.exportTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("backup.exportDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={exporting}
          >
            <FileArchive className="h-4 w-4" />
            {exporting ? t("backup.exporting") : t("backup.exportButton")}
          </Button>
          <p className="text-xs leading-relaxed text-rose-300/80">
            {t("backup.exportNote")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDriveUpload className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("backup.restoreTitle")}
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRestore} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("backup.backupFile")}
              </label>
              <Input
                type="file"
                accept=".db,application/octet-stream"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("backup.confirmLabel", { text: CONFIRM_TEXT })}
              </label>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={CONFIRM_TEXT}
              />
            </div>

            <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300/90">
              {t("backup.restoreWarning")}
            </p>

            {error && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {success}
              </p>
            )}

            <Button
              type="submit"
              variant="danger"
              disabled={restoring || confirm !== CONFIRM_TEXT || !file}
            >
              {restoring ? t("backup.restoring") : t("backup.restoreButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {info && info.autoBackups.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              {t("backup.autoBackups")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("backup.autoBackupsDesc")}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.autoBackups.map((backup) => (
              <div
                key={backup.name}
                className="flex items-center justify-between rounded-xl border border-slate-800 px-4 py-3 text-sm"
              >
                <span className="text-slate-300">{backup.name}</span>
                <span className="text-slate-500">
                  {backup.sizeLabel} · {formatDate(backup.updatedAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
