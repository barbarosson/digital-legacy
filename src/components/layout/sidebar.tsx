"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Film,
  Globe,
  HardDriveDownload,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Search,
  Send,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { isCommunityEnabled } from "@/lib/features";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/panel", key: "overview", icon: LayoutDashboard },
  { href: "/panel/assets", key: "assets", icon: Shield },
  { href: "/panel/beneficiaries", key: "beneficiaries", icon: Users },
  { href: "/panel/calendar", key: "calendar", icon: CalendarDays },
  { href: "/panel/feed", key: "feed", icon: Film },
  { href: "/panel/search", key: "search", icon: Search },
  { href: "/panel/messages", key: "messages", icon: Mail },
  { href: "/panel/delivery", key: "delivery", icon: Send },
  { href: "/panel/community", key: "community", icon: Globe, community: true },
  { href: "/panel/chat", key: "chat", icon: MessageCircle, community: true },
  { href: "/panel/settings", key: "settings", icon: Settings },
  { href: "/panel/backup", key: "backup", icon: HardDriveDownload },
];

export function Sidebar() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const items = navItems.filter(
    (item) => !item.community || isCommunityEnabled(),
  );

  function NavBody({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4 lg:px-6 lg:py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Heart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {t("nav.brand")}
            </p>
            <p className="truncate text-xs text-slate-500">{t("nav.panel")}</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-900 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 lg:p-4">
          {items.map(({ href, key, icon: Icon }) => {
            const active =
              href === "/panel"
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                title={t(`nav.${key}`)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-amber-500/10 text-amber-300"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(`nav.${key}`)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3 space-y-2 lg:p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("nav.logout")}</span>
          </button>
          <p className="hidden rounded-xl bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-500 xl:block">
            {t("nav.securityNote")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-900"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-foreground">{t("nav.brand")}</p>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "z-50 flex flex-col border-slate-800 bg-slate-950 transition-transform",
          "fixed inset-y-0 left-0 w-64 max-w-[85vw] border-r",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-auto lg:w-56 lg:max-w-none lg:translate-x-0 lg:shrink-0 xl:w-64",
        )}
      >
        <NavBody onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
