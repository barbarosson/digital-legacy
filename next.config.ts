import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Legacy Turkish path segments → English Store-facing routes. */
const legacyRedirects = [
  { source: "/giris", destination: "/login", permanent: true },
  { source: "/giris/:path*", destination: "/login/:path*", permanent: true },
  { source: "/panel/varliklar", destination: "/panel/assets", permanent: true },
  { source: "/panel/varliklar/:path*", destination: "/panel/assets/:path*", permanent: true },
  { source: "/panel/mirasclar", destination: "/panel/beneficiaries", permanent: true },
  { source: "/panel/mirasclar/:path*", destination: "/panel/beneficiaries/:path*", permanent: true },
  { source: "/panel/takvim", destination: "/panel/calendar", permanent: true },
  { source: "/panel/takvim/:path*", destination: "/panel/calendar/:path*", permanent: true },
  { source: "/panel/akis", destination: "/panel/feed", permanent: true },
  { source: "/panel/akis/:path*", destination: "/panel/feed/:path*", permanent: true },
  { source: "/panel/arama", destination: "/panel/search", permanent: true },
  { source: "/panel/arama/:path*", destination: "/panel/search/:path*", permanent: true },
  { source: "/panel/mesajlar", destination: "/panel/messages", permanent: true },
  { source: "/panel/mesajlar/:path*", destination: "/panel/messages/:path*", permanent: true },
  { source: "/panel/teslim", destination: "/panel/delivery", permanent: true },
  { source: "/panel/teslim/:path*", destination: "/panel/delivery/:path*", permanent: true },
  { source: "/panel/topluluk", destination: "/panel/community", permanent: true },
  { source: "/panel/topluluk/:path*", destination: "/panel/community/:path*", permanent: true },
  { source: "/panel/sohbet", destination: "/panel/chat", permanent: true },
  { source: "/panel/sohbet/:path*", destination: "/panel/chat/:path*", permanent: true },
  { source: "/panel/ayarlar", destination: "/panel/settings", permanent: true },
  { source: "/panel/ayarlar/:path*", destination: "/panel/settings/:path*", permanent: true },
  { source: "/panel/yedekleme", destination: "/panel/backup", permanent: true },
  { source: "/panel/yedekleme/:path*", destination: "/panel/backup/:path*", permanent: true },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return legacyRedirects;
  },
};

export default nextConfig;
