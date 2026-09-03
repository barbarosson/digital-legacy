import { getDashboardStats } from "@/lib/stats";
import { OverviewClient } from "./overview-client";

export default async function PanelPage() {
  const stats = await getDashboardStats();
  return <OverviewClient stats={stats} />;
}
