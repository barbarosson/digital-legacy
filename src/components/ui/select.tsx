import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
