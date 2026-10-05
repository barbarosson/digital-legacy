"use client";

import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

type ProGateProps = {
  isPro: boolean;
  children: React.ReactNode;
  onUnlockClick?: () => void;
};

export function ProGate({ isPro, children, onUnlockClick }: ProGateProps) {
  const t = useT();

  if (isPro) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none blur-[2px] opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-[1px]">
        <div className="max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900/95 p-5 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Crown className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {t("pro.lockedTitle")}
          </p>
          <p className="mt-2 text-sm text-slate-400">{t("pro.lockedDesc")}</p>
          {onUnlockClick && (
            <Button
              type="button"
              size="sm"
              className="mt-4"
              onClick={onUnlockClick}
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              {t("pro.unlockCta")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProBadge() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
      <Crown className="h-3 w-3" />
      {t("pro.badge")}
    </span>
  );
}
