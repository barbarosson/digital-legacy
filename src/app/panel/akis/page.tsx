"use client";

import { useEffect, useRef, useState } from "react";
import { Film, MapPin, User } from "lucide-react";
import { MOODS, type MoodKey } from "@/lib/constants";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";

type FeedEntry = {
  id: number;
  entryDate: string;
  title: string | null;
  content: string | null;
  mood: string | null;
  location: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  leaveToBeneficiary: boolean;
  recipientLabel: string | null;
};

export default function AkisPage() {
  const t = useT();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    fetch("/api/calendar/feed")
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (intersections) => {
        for (const entry of intersections) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.6 },
    );

    for (const video of videoRefs.current.values()) {
      observer.observe(video);
    }

    return () => observer.disconnect();
  }, [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("feed.title")}</h1>
        <p className="mt-2 text-slate-400">{t("feed.subtitle")}</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t("common.loading")}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 py-16 text-center">
          <Film className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm text-slate-500">{t("feed.empty")}</p>
        </div>
      ) : (
        <div className="mx-auto flex max-w-md snap-y snap-mandatory flex-col gap-6 overflow-y-auto pb-8">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="relative snap-center overflow-hidden rounded-3xl border border-slate-800 bg-black"
            >
              <video
                ref={(el) => {
                  if (el) videoRefs.current.set(entry.id, el);
                  else videoRefs.current.delete(entry.id);
                }}
                src={entry.videoUrl}
                poster={entry.thumbnailUrl ?? undefined}
                controls
                loop
                muted
                playsInline
                className="aspect-[9/16] w-full bg-black object-contain"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4">
                <div className="flex items-center gap-2">
                  {entry.mood && MOODS[entry.mood as MoodKey] && (
                    <span className="text-lg">
                      {MOODS[entry.mood as MoodKey].emoji}
                    </span>
                  )}
                  <p className="font-semibold text-white">
                    {entry.title || t("feed.defaultTitle")}
                  </p>
                </div>
                <p className="mt-1 text-xs text-neutral-300">
                  {formatDate(entry.entryDate)}
                </p>
                {entry.location && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-300">
                    <MapPin className="h-3.5 w-3.5" />
                    {entry.location}
                  </p>
                )}
                {entry.content && (
                  <p className="mt-2 line-clamp-3 text-sm text-neutral-200">
                    {entry.content}
                  </p>
                )}
                {entry.leaveToBeneficiary && entry.recipientLabel && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-2.5 py-1 text-xs text-sky-200">
                    <User className="h-3.5 w-3.5" />
                    {entry.recipientLabel}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
