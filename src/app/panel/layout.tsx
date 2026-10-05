import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/social/notification-bell";
import { UsbReminderBanner } from "@/components/pro/usb-reminder-banner";
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
    redirect("/login?next=/panel");
  }

  const unlocked = await isSessionFullyUnlocked();
  if (!unlocked) {
    redirect("/login?next=/panel");
  }

  const shell = (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        {isCommunityEnabled() && (
          <header className="sticky top-0 z-40 flex justify-end border-b border-slate-800/60 bg-slate-950/70 px-8 py-3 backdrop-blur">
            <NotificationBell />
          </header>
        )}
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
          <UsbReminderBanner />
          {children}
        </div>
      </main>
    </div>
  );

  if (!isCommunityEnabled()) {
    return shell;
  }

  return <SocialAuthProvider>{shell}</SocialAuthProvider>;
}
