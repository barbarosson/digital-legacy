"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { AuthGate } from "@/components/social/auth-gate";
import { Connections } from "@/components/social/connections";
import { Feed } from "@/components/social/feed";
import { useT } from "@/lib/i18n/provider";
import { useSocialAuth } from "@/lib/social/auth-context";
import { cn } from "@/lib/utils";

export default function CommunityPage() {
  const t = useT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("social.feedTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("social.feedSubtitle")}</p>
      </div>

      <AuthGate>
        <CommunityInner />
      </AuthGate>
    </div>
  );
}

function CommunityInner() {
  const t = useT();
  const { profile, signOut } = useSocialAuth();
  const [tab, setTab] = useState<"feed" | "connections">("feed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-300">
            {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {profile?.display_name ?? "—"}
            </p>
            <p className="text-xs text-slate-500">@{profile?.username ?? "—"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          {t("social.signOut")}
        </button>
      </div>

      <div className="flex gap-2">
        {(["feed", "connections"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              tab === key
                ? "bg-amber-500/15 text-amber-300"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
            )}
          >
            {key === "feed"
              ? t("social.feedTitle")
              : t("social.connectionsTitle")}
          </button>
        ))}
      </div>

      {tab === "feed" ? <Feed /> : <Connections />}
    </div>
  );
}
