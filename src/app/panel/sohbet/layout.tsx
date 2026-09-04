import { redirect } from "next/navigation";
import { isCommunityEnabled } from "@/lib/features";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isCommunityEnabled()) {
    redirect("/panel");
  }
  return children;
}
