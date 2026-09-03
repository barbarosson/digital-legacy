"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/provider";
import { useSocialAuth } from "@/lib/social/auth-context";
import { getSupabase } from "@/lib/supabase/client";
import type { Connection, Profile } from "@/lib/social/types";

type Row = Connection & { other: Profile | null };

export function Connections() {
  const t = useT();
  const router = useRouter();
  const { profile, session } = useSocialAuth();
  const userId = session?.user?.id ?? null;

  const [incoming, setIncoming] = useState<Row[]>([]);
  const [outgoing, setOutgoing] = useState<Row[]>([]);
  const [accepted, setAccepted] = useState<Row[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;

    const { data } = await supabase
      .from("dm_connections")
      .select("*")
      .or(`requester.eq.${userId},addressee.eq.${userId}`);
    const rows = (data as Connection[]) ?? [];

    const otherIds = Array.from(
      new Set(
        rows.map((r) => (r.requester === userId ? r.addressee : r.requester)),
      ),
    );
    const profMap = new Map<string, Profile>();
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("dm_profiles")
        .select("*")
        .in("id", otherIds);
      for (const p of (profs as Profile[]) ?? []) profMap.set(p.id, p);
    }

    const withProfile = (r: Connection): Row => ({
      ...r,
      other: profMap.get(r.requester === userId ? r.addressee : r.requester) ?? null,
    });

    setIncoming(
      rows
        .filter((r) => r.addressee === userId && r.status === "pending")
        .map(withProfile),
    );
    setOutgoing(
      rows
        .filter((r) => r.requester === userId && r.status === "pending")
        .map(withProfile),
    );
    setAccepted(rows.filter((r) => r.status === "accepted").map(withProfile));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !userId || !code.trim()) return;
    setBusy(true);
    setMsg(null);

    const target = code.trim().toUpperCase();
    const { data: found } = await supabase
      .from("dm_profiles")
      .select("id")
      .eq("friend_code", target)
      .maybeSingle();

    if (!found) {
      setBusy(false);
      setMsg({ kind: "err", text: t("social.requestError") });
      return;
    }
    if ((found as { id: string }).id === userId) {
      setBusy(false);
      setMsg({ kind: "err", text: t("social.selfError") });
      return;
    }

    const { error } = await supabase.from("dm_connections").insert({
      requester: userId,
      addressee: (found as { id: string }).id,
      status: "pending",
    });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: t("social.alreadyError") });
      return;
    }
    setCode("");
    setMsg({ kind: "ok", text: t("social.requestSent") });
    load();
  }

  async function accept(row: Row) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from("dm_connections")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    load();
  }

  async function remove(row: Row) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("dm_connections").delete().eq("id", row.id);
    load();
  }

  function copyCode() {
    if (!profile) return;
    navigator.clipboard.writeText(profile.friend_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-400">{t("social.yourCode")}</p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-lg font-semibold tracking-widest text-amber-300">
              {profile?.friend_code ?? "—"}
            </code>
            <Button type="button" variant="secondary" size="sm" onClick={copyCode}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? t("social.copied") : t("social.copyCode")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 text-sm font-semibold text-foreground">
            {t("social.addByCode")}
          </p>
          <form onSubmit={sendRequest} className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("social.codePlaceholder")}
              className="uppercase"
            />
            <Button type="submit" disabled={busy || !code.trim()}>
              <UserPlus className="h-4 w-4" />
              {t("social.sendRequest")}
            </Button>
          </form>
          {msg && (
            <p
              className={
                "mt-2 text-sm " +
                (msg.kind === "ok" ? "text-emerald-400" : "text-rose-400")
              }
            >
              {msg.text}
            </p>
          )}
        </CardContent>
      </Card>

      <Section title={t("social.incoming")} empty={t("social.noIncoming")} rows={incoming}>
        {(row) => (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={() => accept(row)}>
              <Check className="h-4 w-4" />
              {t("social.accept")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => remove(row)}
            >
              <X className="h-4 w-4" />
              {t("social.reject")}
            </Button>
          </div>
        )}
      </Section>

      <Section
        title={t("social.myConnections")}
        empty={t("social.noConnections")}
        rows={accepted}
      >
        {(row) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                router.push(`/panel/sohbet?u=${row.other?.id ?? ""}`)
              }
            >
              <MessageCircle className="h-4 w-4" />
              {t("social.message")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => remove(row)}
            >
              {t("social.remove")}
            </Button>
          </div>
        )}
      </Section>

      <Section
        title={t("social.pendingOutgoing")}
        empty={t("social.noOutgoing")}
        rows={outgoing}
      >
        {(row) => (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{t("social.pending")}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => remove(row)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  rows,
  children,
}: {
  title: string;
  empty: string;
  rows: Row[];
  children: (row: Row) => React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-300">
                  {(row.other?.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {row.other?.display_name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    @{row.other?.username ?? "—"}
                  </p>
                </div>
              </div>
              {children(row)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
