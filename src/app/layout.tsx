import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/lib/i18n/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Legacy",
  description:
    "Plan digital assets, instructions, and messages for the people you leave behind.",
};

const themeScript = `(() => {
  try {
    var p = JSON.parse(localStorage.getItem('dm-prefs') || '{}');
    var el = document.documentElement;
    el.setAttribute('data-theme', p.theme || 'dark');
    el.setAttribute('data-accent', p.accent || 'amber');
    el.setAttribute('lang', p.lang || 'en');
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-accent="amber"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
