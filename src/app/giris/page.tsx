import { Suspense } from "react";
import { GirisClient } from "./giris-client";

export default function GirisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Loading...
        </div>
      }
    >
      <GirisClient />
    </Suspense>
  );
}
