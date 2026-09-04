import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/social/notification-bell";
import { isCommunityEnabled } from "@/lib/features";
import { SocialAuthProvider } from "@/lib/social/auth-context";
import { isPinConfigured, isSessionFullyUnlocked } from "@/lib/auth/session";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pinConfigured = await isPinConfigured();

  if (!pinConfigured) {
    redirect("/giris?next=/panel");
  }

  const unlocked = await isSessionFullyUnlocked();
  if (!unlocked) {
    redirect("/giris?next=/panel");
  }

  const shell = (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {isCommunityEnabled() && (
          <header className="sticky top-0 z-40 flex justify-end border-b border-slate-800/60 bg-slate-950/70 px-8 py-3 backdrop-blur">
            <NotificationBell />
          </header>
        )}
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </div>
  );

  if (!isCommunityEnabled()) {
    return shell;
  }

  return <SocialAuthProvider>{shell}</SocialAuthProvider>;
}
