"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Download,
  Send,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DELIVERY_TRIGGERS, DELIVERY_TYPES } from "@/lib/constants";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";

type ActivityStatus = {
  lastActivityAt: string | null;
  inactivityDays: number;
  warningWeeks: number;
  daysSinceActivity: number;
  daysUntilDelivery: number;
  isOverdue: boolean;
  inWarningPhase: boolean;
  currentWarningWeek: number;
  warningWeeksRemaining: number;
};

type PendingMessage = {
  id: number;
  title: string;
  content: string;
  recipientLabel: string | null;
  deliveryType: keyof typeof DELIVERY_TYPES;
};

type DeliveryLogItem = {
  id: number;
  messageId: number;
  recipientLabel: string;
  messageTitle: string;
  trigger: keyof typeof DELIVERY_TRIGGERS;
  deliveredAt: string;
};

type Overview = {
  activity: ActivityStatus;
  pendingManual: PendingMessage[];
  inactivityPending: { id: number; title: string }[];
  deliveryLog: DeliveryLogItem[];
  totals: {
    delivered: number;
    pendingManual: number;
    pendingInactivity: number;
  };
};

export default function TeslimPage() {
  const t = useT();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [inactivityDays, setInactivityDays] = useState(90);
  const [warningWeeks, setWarningWeeks] = useState(4);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deliveringId, setDeliveringId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewRes, settingsRes] = await Promise.all([
      fetch("/api/delivery"),
      fetch("/api/delivery/settings"),
    ]);

    if (overviewRes.ok) {
      setOverview(await overviewRes.json());
    }

    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      setInactivityDays(settings.inactivityDays);
      setWarningWeeks(settings.warningWeeks ?? 4);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setError("");

    const res = await fetch("/api/delivery/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inactivityDays, warningWeeks }),
    });

    const data = await res.json();
    setSavingSettings(false);

    if (!res.ok) {
      setError(data.error ?? t("delivery.saveFailedSettings"));
      return;
    }

    setSuccess(t("delivery.settingsSaved"));
    await load();
  }

  async function deliverMessage(messageId: number) {
    setDeliveringId(messageId);
    setError("");

    const res = await fetch(`/api/delivery/${messageId}`, { method: "POST" });
    const data = await res.json();
    setDeliveringId(null);

    if (!res.ok) {
      setError(data.error ?? t("delivery.deliverFailed"));
      return;
    }

    setSuccess(t("delivery.delivered2"));
    await load();
  }

  async function exportDelivery(deliveryId: number) {
    const res = await fetch(`/api/delivery/export/${deliveryId}`);
    if (!res.ok) return;

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="(.+)"/);
    const filename = match?.[1] ?? `delivery-${deliveryId}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="text-sm text-slate-500">{t("common.loading")}</div>;
  }

  if (!overview) {
    return (
      <div className="text-sm text-rose-400">{t("delivery.loadFailed")}</div>
    );
  }

  const { activity, pendingManual, inactivityPending, deliveryLog, totals } =
    overview;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("delivery.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("delivery.subtitle")}</p>
      </div>

      {activity.isOverdue && totals.pendingInactivity > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {t("delivery.overdueWarning", {
              count: totals.pendingInactivity,
            })}
          </p>
        </div>
      )}

      {activity.inWarningPhase && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              {t("delivery.warningPhase", {
                week: activity.currentWarningWeek,
                total: activity.warningWeeks,
              })}
            </p>
            <p className="mt-1 text-rose-200/80">
              {t("delivery.warningPhaseDesc", {
                days: activity.daysUntilDelivery,
              })}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">{t("delivery.lastActivity")}</p>
            <p className="mt-1 font-medium text-foreground">
              {activity.lastActivityAt
                ? formatDate(activity.lastActivityAt)
                : t("delivery.noActivity")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {t("delivery.daysAgo", { days: activity.daysSinceActivity })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
              {t("delivery.untilDelivery")}
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {activity.daysUntilDelivery}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("delivery.days")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">{t("delivery.delivered")}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {totals.delivered}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("delivery.records")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("delivery.inactivityTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("delivery.inactivityDesc")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSettings} className="flex flex-wrap items-end gap-4">
            <div className="min-w-40">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("delivery.inactivityDays")}
              </label>
              <Input
                type="number"
                min={7}
                max={3650}
                value={inactivityDays}
                onChange={(e) => setInactivityDays(Number(e.target.value))}
              />
            </div>
            <div className="min-w-40">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("delivery.warningWeeks")}
              </label>
              <Input
                type="number"
                min={0}
                max={12}
                value={warningWeeks}
                onChange={(e) => setWarningWeeks(Number(e.target.value))}
              />
            </div>
            <Button type="submit" disabled={savingSettings}>
              {savingSettings ? t("common.saving") : t("common.save")}
            </Button>
          </form>
          <p className="mt-3 text-xs text-slate-500">{t("delivery.warningNote")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("delivery.manualTitle")}
            </h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingManual.length === 0 ? (
            <p className="text-sm text-slate-500">{t("delivery.manualEmpty")}</p>
          ) : (
            pendingManual.map((message) => (
              <div
                key={message.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{message.title}</p>
                  <p className="mt-1 text-sm text-sky-400">
                    {message.recipientLabel ?? t("delivery.noRecipient")}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                    {message.content}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => deliverMessage(message.id)}
                  disabled={deliveringId === message.id}
                >
                  {deliveringId === message.id
                    ? t("delivery.delivering")
                    : t("delivery.deliver")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("delivery.inactivityPendingTitle")}
            </h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {inactivityPending.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("delivery.inactivityPendingEmpty")}
            </p>
          ) : (
            inactivityPending.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-slate-800 px-4 py-3 text-sm"
              >
                <span className="text-foreground">{message.title}</span>
                <span className="ml-2 text-slate-500">
                  {t("delivery.autoDeliverNote")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            {t("delivery.historyTitle")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {deliveryLog.length === 0 ? (
            <p className="text-sm text-slate-500">{t("delivery.historyEmpty")}</p>
          ) : (
            deliveryLog.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {item.messageTitle}
                  </p>
                  <p className="mt-1 text-sm text-sky-400">{item.recipientLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t(`deliveryTriggers.${item.trigger}`)} ·{" "}
                    {formatDate(item.deliveredAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportDelivery(item.id)}
                >
                  <Download className="h-4 w-4" />
                  {t("delivery.downloadJson")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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

      <p className="text-xs leading-relaxed text-slate-600">
        {t("delivery.footerNote")}
      </p>
    </div>
  );
}
