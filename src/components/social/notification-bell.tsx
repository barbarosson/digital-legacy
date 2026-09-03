"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { useSocialAuth } from "@/lib/social/auth-context";
import { getSupabase } from "@/lib/supabase/client";
import type { AppNotification, NotificationType } from "@/lib/social/types";
import { cn } from "@/lib/utils";

const TYPE_KEY: Record<NotificationType, string> = {
  friend_request: "social.notifFriendRequest",
  friend_accept: "social.notifFriendAccept",
  reaction: "social.notifReaction",
  comment: "social.notifComment",
  message: "social.notifMessage",
};

export function NotificationBell() {
  const t = useT();
  const { session, configured } = useSocialAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const seenRef = useRef(false);

  const userId = session?.user?.id ?? null;

  const resolveNames = useCallback(async (actorIds: string[]) => {
    const supabase = getSupabase();
    if (!supabase || actorIds.length === 0) return;
    const { data } = await supabase
      .from("dm_profiles")
      .select("id, display_name")
      .in("id", actorIds);
    if (data) {
      setNames((current) => {
        const next = { ...current };
        for (const row of data as { id: string; display_name: string }[]) {
          next[row.id] = row.display_name;
        }
        return next;
      });
    }
  }, []);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const { data } = await supabase
      .from("dm_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = (data as AppNotification[]) ?? [];
    setItems(rows);
    await resolveNames(
      Array.from(
        new Set(rows.map((r) => r.actor).filter((x): x is string => Boolean(x))),
      ),
    );
  }, [userId, resolveNames]);

  useEffect(() => {
    if (!userId) return;
    load();

    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`dm_notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const notif = payload.new as AppNotification;
          setItems((current) => [notif, ...current].slice(0, 30));
          if (notif.actor) await resolveNames([notif.actor]);
          showDesktopNotification(notif);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load, resolveNames]);

  const showDesktopNotification = useCallback(
    (notif: AppNotification) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      const actorName = notif.actor ? names[notif.actor] : null;
      const body = `${actorName ?? t("social.someone")} ${t(TYPE_KEY[notif.type])}`;
      if (Notification.permission === "granted") {
        new Notification(t("nav.community"), { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification(t("nav.community"), { body });
          }
        });
      }
    },
    [names, t],
  );

  useEffect(() => {
    if (
      !seenRef.current &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      seenRef.current = true;
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  async function markAllRead() {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const now = new Date().toISOString();
    await supabase
      .from("dm_notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    setItems((current) => current.map((n) => ({ ...n, read_at: n.read_at ?? now })));
  }

  if (!configured || !userId) return null;

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
        aria-label={t("social.notifications")}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {t("social.notifications")}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                {t("social.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {t("social.noNotifications")}
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "border-b border-slate-900 px-4 py-3 text-sm",
                    !n.read_at && "bg-amber-500/5",
                  )}
                >
                  <p className="text-slate-200">
                    <span className="font-medium text-foreground">
                      {n.actor ? names[n.actor] ?? t("social.someone") : t("social.someone")}
                    </span>{" "}
                    {t(TYPE_KEY[n.type])}
                  </p>
                  {n.content && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {n.content}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
