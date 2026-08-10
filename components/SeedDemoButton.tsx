"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SeedDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        setLoading(true);
        await fetch("/api/seed-demo", { method: "POST" });
        setLoading(false);
        router.refresh();
      }}
      disabled={loading}
      className="rounded-md bg-surface-raised border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
    >
      {loading ? "Loading demo data…" : "Load demo data"}
    </button>
  );
}
