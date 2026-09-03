"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Film,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BeneficiaryPicker,
  type BeneficiaryOption,
  type GroupOption,
} from "@/components/assignments/beneficiary-picker";
import {
  CameraRecorder,
  VideoSourceTabs,
} from "@/components/calendar/camera-recorder";
import { MOODS, type MoodKey } from "@/lib/constants";
import { usePrefs } from "@/lib/i18n/provider";
import { captureVideoThumbnail } from "@/lib/video-thumbnail";
import { cn, formatDate } from "@/lib/utils";

type CalendarEntry = {
  id: number;
  entryDate: string;
  title: string | null;
  content: string | null;
  mood: string | null;
  location: string | null;
  hasVideo: boolean;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  leaveToBeneficiary: boolean;
  recipientLabel: string | null;
  createdAt: string;
};

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: Array<{ date: string | null; day: number | null }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, day: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day });
  }

  return cells;
}

export default function TakvimPage() {
  const { t, tList } = usePrefs();
  const WEEKDAYS = tList("weekdays");
  const MONTHS = tList("months");
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [daysWithEntries, setDaysWithEntries] = useState<Record<string, number>>(
    {},
  );
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [videoMode, setVideoMode] = useState<"camera" | "file">("camera");
  const [assignments, setAssignments] = useState({
    beneficiaryIds: [] as number[],
    groupIds: [] as number[],
  });
  const [dayThumbnails, setDayThumbnails] = useState<Record<string, string>>(
    {},
  );
  const [form, setForm] = useState({
    title: "",
    content: "",
    mood: "" as "" | MoodKey,
    location: "",
    leaveToBeneficiary: false,
    video: null as File | null,
  });

  const loadMonth = useCallback(async () => {
    const res = await fetch(`/api/calendar?year=${viewYear}&month=${viewMonth}`);
    if (res.ok) {
      const data = await res.json();
      setDaysWithEntries(data.daysWithEntries ?? {});
      setDayThumbnails(data.dayThumbnails ?? {});
    }
  }, [viewYear, viewMonth]);

  const loadDay = useCallback(async () => {
    const res = await fetch(`/api/calendar?date=${selectedDate}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    setLoading(true);
    loadDay();
  }, [loadDay]);

  useEffect(() => {
    Promise.all([fetch("/api/beneficiaries"), fetch("/api/groups")]).then(
      async ([beneficiariesRes, groupsRes]) => {
        const beneficiaryRows = await beneficiariesRes.json();
        setBeneficiaries(
          beneficiaryRows.map(
            (row: { id: number; name: string; relationship: string }) => ({
              id: row.id,
              name: row.name,
              relationship: row.relationship,
            }),
          ),
        );

        const groupRows = await groupsRes.json();
        setGroups(
          groupRows.map(
            (group: {
              id: number;
              name: string;
              memberCount: number;
              members: { name: string }[];
            }) => ({
              id: group.id,
              name: group.name,
              memberCount: group.memberCount,
              memberNames: group.members.map((member) => member.name),
            }),
          ),
        );
      },
    );
  }, []);

  const cells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  function changeMonth(delta: number) {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    setViewMonth(month);
    setViewYear(year);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const formData = new FormData();
    formData.append("entryDate", selectedDate);
    formData.append("title", form.title);
    formData.append("content", form.content);
    formData.append("mood", form.mood);
    formData.append("location", form.location);
    formData.append("leaveToBeneficiary", String(form.leaveToBeneficiary));
    formData.append("beneficiaryIds", JSON.stringify(assignments.beneficiaryIds));
    formData.append("groupIds", JSON.stringify(assignments.groupIds));
    if (form.video) {
      formData.append("video", form.video);
      const thumbnail = await captureVideoThumbnail(form.video);
      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }
    }

    const res = await fetch("/api/calendar", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? t("calendar.saveFailed"));
      return;
    }

    setForm({
      title: "",
      content: "",
      mood: "",
      location: "",
      leaveToBeneficiary: false,
      video: null,
    });
    setAssignments({ beneficiaryIds: [], groupIds: [] });
    setVideoMode("camera");
    setShowForm(false);
    await Promise.all([loadMonth(), loadDay()]);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    await Promise.all([loadMonth(), loadDay()]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("calendar.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("calendar.subtitle")}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-foreground">
                  {MONTHS[viewMonth - 1]} {viewYear}
                </h2>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeMonth(-1)}
                  aria-label="<"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeMonth(1)}
                  aria-label=">"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, index) => {
                if (!cell.date || !cell.day) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const isSelected = cell.date === selectedDate;
                const isToday = cell.date === toDateKey(today);
                const count = daysWithEntries[cell.date] ?? 0;
                const thumbnail = dayThumbnails[cell.date];

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date!)}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border text-sm transition",
                      isSelected
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                        : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900",
                      isToday && !isSelected && "ring-1 ring-slate-700",
                    )}
                  >
                    {thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-40"
                      />
                    )}
                    <span className="relative z-10">{cell.day}</span>
                    {count > 0 && (
                      <span className="absolute bottom-1.5 z-10 h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {formatDate(selectedDate)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("calendar.memoriesFor")}
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                  <Plus className="h-4 w-4" />
                  {t("common.add")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showForm && (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("calendar.titleField")}
                    </label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder={t("calendar.titlePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("calendar.memory")}
                    </label>
                    <Textarea
                      value={form.content}
                      onChange={(e) =>
                        setForm({ ...form, content: e.target.value })
                      }
                      placeholder={t("calendar.memoryPlaceholder")}
                      className="min-h-28"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("calendar.mood")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(MOODS).map(([key, { emoji }]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              mood: current.mood === key ? "" : (key as MoodKey),
                            }))
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                            form.mood === key
                              ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                              : "border-slate-800 text-slate-400 hover:border-slate-700",
                          )}
                          title={t(`moods.${key}`)}
                        >
                          <span>{emoji}</span>
                          <span className="text-xs">{t(`moods.${key}`)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("calendar.location")}
                    </label>
                    <Input
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      placeholder={t("calendar.locationPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      {t("calendar.dailyVideo")}
                    </label>
                    <VideoSourceTabs
                      mode={videoMode}
                      onModeChange={(mode) => {
                        setVideoMode(mode);
                        if (mode === "file") {
                          setForm((current) => ({ ...current, video: null }));
                        }
                      }}
                    />
                    <div className="mt-3">
                      {videoMode === "camera" ? (
                        <CameraRecorder
                          recordedFile={form.video}
                          onRecorded={(file) =>
                            setForm((current) => ({ ...current, video: file }))
                          }
                        />
                      ) : (
                        <div>
                          <Input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                            onChange={(e) =>
                              setForm({
                                ...form,
                                video: e.target.files?.[0] ?? null,
                              })
                            }
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            {t("calendar.fileHint")}
                          </p>
                          {form.video && (
                            <p className="mt-2 text-xs text-emerald-400">
                              {t("calendar.selected")}: {form.video.name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {form.leaveToBeneficiary && (
                    <BeneficiaryPicker
                      beneficiaries={beneficiaries}
                      groups={groups}
                      selectedBeneficiaryIds={assignments.beneficiaryIds}
                      selectedGroupIds={assignments.groupIds}
                      onChange={setAssignments}
                      required
                    />
                  )}
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.leaveToBeneficiary}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          leaveToBeneficiary: e.target.checked,
                        })
                      }
                      className="rounded border-slate-600"
                    />
                    {t("calendar.leaveToHeir")}
                  </label>
                  {error && (
                    <p className="text-sm text-rose-400">{error}</p>
                  )}
                  <Button type="submit" disabled={saving}>
                    {saving ? t("common.saving") : t("calendar.saveMemory")}
                  </Button>
                </form>
              )}

              {loading ? (
                <p className="text-sm text-slate-500">{t("common.loading")}</p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-slate-500">{t("calendar.emptyDay")}</p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-slate-800 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.mood && MOODS[entry.mood as MoodKey] && (
                            <span title={t(`moods.${entry.mood}`)}>
                              {MOODS[entry.mood as MoodKey].emoji}
                            </span>
                          )}
                          {entry.title && (
                            <p className="font-medium text-foreground">
                              {entry.title}
                            </p>
                          )}
                        </div>
                        {entry.location && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {entry.location}
                          </p>
                        )}
                        {entry.content && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
                            {entry.content}
                          </p>
                        )}
                        {entry.leaveToBeneficiary && entry.recipientLabel && (
                          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300">
                            <User className="h-3.5 w-3.5" />
                            {t("calendar.recipients")}: {entry.recipientLabel}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </div>

                    {entry.hasVideo && entry.videoUrl && (
                      <div className="mt-4 space-y-2">
                        <p className="inline-flex items-center gap-1.5 text-xs text-amber-400">
                          <Film className="h-3.5 w-3.5" />
                          {t("calendar.dailyVideoLabel")}
                        </p>
                        <video
                          src={entry.videoUrl}
                          controls
                          className="w-full rounded-xl border border-slate-800 bg-black"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
