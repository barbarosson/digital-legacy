"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Heart,
  Send,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

export default function HomePage() {
  const t = useT();

  const features = [
    {
      icon: Shield,
      title: t("landing.features.secureTitle"),
      description: t("landing.features.secureDesc"),
    },
    {
      icon: Send,
      title: t("landing.features.legacyTitle"),
      description: t("landing.features.legacyDesc"),
    },
    {
      icon: CalendarDays,
      title: t("landing.features.calendarTitle"),
      description: t("landing.features.calendarDesc"),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute -right-32 top-32 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-foreground">
            {t("nav.brand")}
          </span>
        </div>
        <Link href="/giris">
          <Button variant="secondary" size="sm">
            {t("landing.cta")}
          </Button>
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-10">
        <section className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            {t("landing.tagline")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t("landing.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            {t("landing.subtitle")}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/giris">
              <Button size="lg">
                {t("landing.cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
