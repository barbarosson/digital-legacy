"use client";

import { useState } from "react";
import { Film, MapPin, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MOODS, type MoodKey } from "@/lib/constants";
import { useT } from "@/lib/i18n/provider";
import { cn, formatDate } from "@/lib/utils";

type SearchResult = {
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
};

export default function AramaPage() {
  const t = useT();
  const [filters, setFilters] = useState({
    text: "",
    mood: "",
    from: "",
    to: "",
    onlyVideo: false,
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const params = new URLSearchParams();
    if (filters.text) params.set("text", filters.text);
    if (filters.mood) params.set("mood", filters.mood);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.onlyVideo) params.set("onlyVideo", "true");

    const res = await fetch(`/api/calendar/search?${params.toString()}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("search.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("search.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={runSearch} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("search.text")}
              </label>
              <Input
                value={filters.text}
                onChange={(e) =>
                  setFilters({ ...filters, text: e.target.value })
                }
                placeholder={t("search.textPlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("search.mood")}
              </label>
              <Select
                value={filters.mood}
                onChange={(e) =>
                  setFilters({ ...filters, mood: e.target.value })
                }
              >
                <option value="">{t("common.all")}</option>
                {Object.entries(MOODS).map(([key, { emoji }]) => (
                  <option key={key} value={key}>
                    {emoji} {t(`moods.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={filters.onlyVideo}
                  onChange={(e) =>
                    setFilters({ ...filters, onlyVideo: e.target.checked })
                  }
                  className="rounded border-slate-600"
                />
                {t("search.onlyVideo")}
              </label>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("search.from")}
              </label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters({ ...filters, from: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("search.to")}
              </label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4" />
                {loading ? t("search.searching") : t("common.search")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {searched && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t("search.results")} ({results.length})
          </h2>
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                {t("search.noResults")}
              </CardContent>
            </Card>
          ) : (
            results.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div
                    className={cn(
                      "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950",
                    )}
                  >
                    {entry.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.mood && MOODS[entry.mood as MoodKey] && (
                        <span>{MOODS[entry.mood as MoodKey].emoji}</span>
                      )}
                      <p className="font-medium text-foreground">
                        {entry.title || t("feed.defaultTitle")}
                      </p>
                      <span className="text-xs text-slate-500">
                        {formatDate(entry.entryDate)}
                      </span>
                    </div>
                    {entry.location && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {entry.location}
                      </p>
                    )}
                    {entry.content && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {entry.content}
                      </p>
                    )}
                    {entry.leaveToBeneficiary && entry.recipientLabel && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-sky-300">
                        <User className="h-3.5 w-3.5" />
                        {entry.recipientLabel}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
