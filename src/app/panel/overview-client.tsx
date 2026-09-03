"use client";

import Link from "next/link";
import { ArrowRight, Mail, Shield, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";

type Stats = {
  assets: number;
  beneficiaries: number;
  messages: number;
};

const statCards = [
  {
    key: "assets" as const,
    labelKey: "overview.assets",
    href: "/panel/varliklar",
    icon: Shield,
    color: "text-amber-400",
  },
  {
    key: "beneficiaries" as const,
    labelKey: "overview.beneficiaries",
    href: "/panel/mirasclar",
    icon: Users,
    color: "text-sky-400",
  },
  {
    key: "messages" as const,
    labelKey: "overview.messages",
    href: "/panel/mesajlar",
    icon: Mail,
    color: "text-rose-400",
  },
];

export function OverviewClient({ stats }: { stats: Stats }) {
  const t = useT();

  const steps = [
    {
      step: "1",
      title: t("overview.addBeneficiary"),
      description: t("beneficiaries.subtitle"),
      href: "/panel/mirasclar",
    },
    {
      step: "2",
      title: t("overview.addAsset"),
      description: t("assets.subtitle"),
      href: "/panel/varliklar",
    },
    {
      step: "3",
      title: t("overview.addMessage"),
      description: t("messages.subtitle"),
      href: "/panel/mesajlar",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("overview.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("overview.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ key, labelKey, href, icon: Icon, color }) => (
          <Link key={key} href={href}>
            <Card className="transition hover:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{t(labelKey)}</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {stats[key]}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${color}`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            {t("overview.quickActions")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map(({ step, title, description, href }) => (
            <Link
              key={step}
              href={href}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-4 transition hover:border-slate-700"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-sm font-semibold text-amber-400">
                  {step}
                </span>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
