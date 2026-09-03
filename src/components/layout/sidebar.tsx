"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Film,
  Globe,
  HardDriveDownload,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Search,
  Send,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/panel", key: "overview", icon: LayoutDashboard },
  { href: "/panel/varliklar", key: "assets", icon: Shield },
  { href: "/panel/mirasclar", key: "beneficiaries", icon: Users },
  { href: "/panel/takvim", key: "calendar", icon: CalendarDays },
  { href: "/panel/akis", key: "feed", icon: Film },
  { href: "/panel/arama", key: "search", icon: Search },
  { href: "/panel/mesajlar", key: "messages", icon: Mail },
  { href: "/panel/teslim", key: "delivery", icon: Send },
  { href: "/panel/topluluk", key: "community", icon: Globe },
  { href: "/panel/sohbet", key: "chat", icon: MessageCircle },
  { href: "/panel/ayarlar", key: "settings", icon: Settings },
  { href: "/panel/yedekleme", key: "backup", icon: HardDriveDownload },
];

export function Sidebar() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/giris");
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950/80">
      <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("nav.brand")}
          </p>
          <p className="text-xs text-slate-500">{t("nav.panel")}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map(({ href, key, icon: Icon }) => {
          const active =
            href === "/panel"
              ? pathname === href
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-amber-500/10 text-amber-300"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(`nav.${key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4 space-y-2">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </button>
        <p className="rounded-xl bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-500">
          {t("nav.securityNote")}
        </p>
      </div>
    </aside>
  );
}
