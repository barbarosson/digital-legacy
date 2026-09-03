"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/provider";

type AuthStatus = {
  pinConfigured: boolean;
  unlocked: boolean;
};

export function GirisClient() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/panel";

  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data: AuthStatus) => {
        setStatus(data);
        if (data.unlocked) {
          router.replace(next);
        }
      });
  }, [next, router]);

  const isSetup = status && !status.pinConfigured;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isSetup ? "/api/auth/setup" : "/api/auth/unlock";
    const body = isSetup ? { pin, confirmPin } : { pin };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t("login.wrongPin"));
      return;
    }

    router.replace(next);
  }

  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.1),_transparent_55%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Heart className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              {t("login.brand")}
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-400" />
              <h1 className="text-lg font-semibold text-foreground">
                {isSetup ? t("login.setupTitle") : t("login.unlockTitle")}
              </h1>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {isSetup ? t("login.setupSubtitle") : t("login.unlockSubtitle")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">
                  {t("login.pin")}
                </label>
                <Input
                  type="password"
                  required
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>

              {isSetup && (
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">
                    {t("login.pinConfirm")}
                  </label>
                  <Input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? t("login.processing")
                  : isSetup
                    ? t("login.create")
                    : t("login.unlock")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
