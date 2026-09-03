"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/provider";
import { useSocialAuth } from "@/lib/social/auth-context";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { configured, loading, session, signIn, signUp } = useSocialAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
        {t("social.unconfigured")}
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">{t("social.loading")}</p>;
  }

  if (session) {
    return <>{children}</>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");

    if (mode === "signup") {
      const { error: err, needsConfirm } = await signUp(
        email,
        password,
        displayName || email.split("@")[0],
      );
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      if (needsConfirm) {
        setInfo(t("social.confirmSent"));
        setMode("signin");
      }
      return;
    }

    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("social.authTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("social.authSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">
                  {t("social.displayName")}
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("social.displayName")}
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("social.email")}
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("social.password")}
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {info}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? mode === "signup"
                  ? t("social.signingUp")
                  : t("social.signingIn")
                : mode === "signup"
                  ? t("social.signUp")
                  : t("social.signIn")}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
                setInfo("");
              }}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-200"
            >
              {mode === "signup" ? t("social.haveAccount") : t("social.noAccount")}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
