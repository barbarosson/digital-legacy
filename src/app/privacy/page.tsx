import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Digital Legacy",
};

export default function PrivacyPage() {
  const file = path.join(process.cwd(), "docs", "PRIVACY_POLICY.md");
  const fallback = path.join(process.cwd(), "PRIVACY_POLICY.md");
  const source = fs.existsSync(file) ? file : fallback;
  const text = fs.existsSync(source)
    ? fs.readFileSync(source, "utf8")
    : "Privacy policy file is missing.";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/"
        className="text-sm text-slate-400 transition hover:text-slate-200"
      >
        Back
      </Link>
      <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
        {text}
      </pre>
    </div>
  );
}
