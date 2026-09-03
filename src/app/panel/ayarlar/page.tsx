"use client";

import { useEffect, useState } from "react";
import { Bell, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/lib/i18n/dictionary";
import { usePrefs, type Accent } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ACCENTS: { value: Accent; swatch: string }[] = [
  { value: "amber", swatch: "#f59e0b" },
  { value: "blue", swatch: "#3b82f6" },
  { value: "emerald", swatch: "#10b981" },
  { value: "rose", swatch: "#f43f5e" },
  { value: "violet", swatch: "#8b5cf6" },
];

export default function AyarlarPage() {
  const { t, theme, accent, lang, setTheme, setAccent, setLang } = usePrefs();
  const [settings, setSettings] = useState({
    enabled: false,
    time: "20:00",
    message: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/reminder")
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          enabled: Boolean(data.enabled),
          time: data.time ?? "20:00",
          message: data.message ?? "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/reminder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? t("delivery.saveFailedSettings"));
      return;
    }

    setSuccess(t("settings.reminderSaved"));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("settings.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("settings.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("settings.appearance")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("settings.appearanceDesc")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-slate-400">{t("settings.theme")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition",
                  theme === "dark"
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                    : "border-slate-800 text-slate-400 hover:border-slate-700",
                )}
              >
                <Moon className="h-4 w-4" />
                {t("settings.dark")}
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition",
                  theme === "light"
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                    : "border-slate-800 text-slate-400 hover:border-slate-700",
                )}
              >
                <Sun className="h-4 w-4" />
                {t("settings.light")}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-400">{t("settings.accent")}</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAccent(item.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                    accent === item.value
                      ? "border-slate-500 text-foreground"
                      : "border-slate-800 text-slate-400 hover:border-slate-700",
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: item.swatch }}
                  />
                  {t(`settings.accents.${item.value}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-400">
              {t("settings.language")}
            </p>
            <div className="flex gap-2">
              {LANGUAGES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setLang(item.value)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm transition",
                    lang === item.value
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                      : "border-slate-800 text-slate-400 hover:border-slate-700",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("settings.reminderTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("settings.reminderDesc")}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                  className="rounded border-slate-600"
                />
                {t("settings.reminderEnable")}
              </label>

              <div className="max-w-40">
                <label className="mb-1.5 block text-sm text-slate-400">
                  {t("settings.reminderTime")}
                </label>
                <Input
                  type="time"
                  value={settings.time}
                  onChange={(e) =>
                    setSettings({ ...settings, time: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-400">
                  {t("settings.reminderMessage")}
                </label>
                <Textarea
                  value={settings.message}
                  onChange={(e) =>
                    setSettings({ ...settings, message: e.target.value })
                  }
                  placeholder="How was today? Don't forget to record your daily video."
                />
              </div>

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

              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-slate-600">
        {t("settings.reminderNote")}
      </p>
    </div>
  );
}
