"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { AuthGate } from "@/components/social/auth-gate";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { useSocialAuth } from "@/lib/social/auth-context";
import { getSupabase } from "@/lib/supabase/client";
import type { Connection, DirectMessage, Profile } from "@/lib/social/types";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("social.chatTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("social.chatSubtitle")}</p>
      </div>
      <AuthGate>
        <Suspense fallback={null}>
          <ChatInner />
        </Suspense>
      </AuthGate>
    </div>
  );
}

function ChatInner() {
  const t = useT();
  const params = useSearchParams();
  const { session } = useSocialAuth();
  const userId = session?.user?.id ?? null;

  const [contacts, setContacts] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get("u"));
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadContacts = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const { data } = await supabase
      .from("dm_connections")
      .select("*")
      .eq("status", "accepted")
      .or(`requester.eq.${userId},addressee.eq.${userId}`);
    const rows = (data as Connection[]) ?? [];
    const ids = rows.map((r) => (r.requester === userId ? r.addressee : r.requester));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("dm_profiles")
        .select("*")
        .in("id", ids);
      const list = (profs as Profile[]) ?? [];
      setContacts(list);
      setActiveId((current) => current ?? list[0]?.id ?? null);
    } else {
      setContacts([]);
    }
  }, [userId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const loadMessages = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId || !activeId) return;
    const { data } = await supabase
      .from("dm_messages")
      .select("*")
      .or(
        `and(sender.eq.${userId},recipient.eq.${activeId}),and(sender.eq.${activeId},recipient.eq.${userId})`,
      )
      .order("created_at", { ascending: true });
    setMessages((data as DirectMessage[]) ?? []);

    await supabase
      .from("dm_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender", activeId)
      .eq("recipient", userId)
      .is("read_at", null);
  }, [userId, activeId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const channel = supabase
      .channel(`dm_messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `recipient=eq.${userId}`,
        },
        (payload) => {
          const m = payload.new as DirectMessage;
          if (m.sender === activeId) {
            setMessages((current) => [...current, m]);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const supabase = getSupabase();
    if (!supabase || !userId || !activeId || !text.trim()) return;
    const body = text.trim();
    setText("");
    const { data } = await supabase
      .from("dm_messages")
      .insert({ sender: userId, recipient: activeId, content: body })
      .select("*")
      .single();
    if (data) setMessages((current) => [...current, data as DirectMessage]);
  }

  if (contacts.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
        {t("social.noChatConnections")}
      </p>
    );
  }

  const activeContact = contacts.find((c) => c.id === activeId) ?? null;

  return (
    <div className="grid h-[70vh] grid-cols-[260px_1fr] overflow-hidden rounded-2xl border border-slate-800">
      <div className="overflow-y-auto border-r border-slate-800 bg-slate-950/40">
        {contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveId(c.id)}
            className={cn(
              "flex w-full items-center gap-3 border-b border-slate-900 px-4 py-3 text-left transition",
              c.id === activeId ? "bg-amber-500/10" : "hover:bg-slate-900",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-300">
              {c.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {c.display_name}
              </p>
              <p className="truncate text-xs text-slate-500">@{c.username}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {activeContact ? (
          <>
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {activeContact.display_name}
              </p>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  {t("social.emptyConversation")}
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender === userId;
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "bg-amber-500 text-black"
                            : "bg-slate-800 text-slate-100",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            mine ? "text-black/60" : "text-slate-400",
                          )}
                        >
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-slate-800 p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={t("social.messagePlaceholder")}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-500/60"
              />
              <Button type="button" onClick={send} disabled={!text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <p className="m-auto text-sm text-slate-500">
            {t("social.pickConversation")}
          </p>
        )}
      </div>
    </div>
  );
}
