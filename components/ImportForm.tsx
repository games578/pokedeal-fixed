"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLACEHOLDER = `[
  {
    "externalId": "1234567",
    "url": "https://www.vinted.co.uk/items/1234567-charizard-holo",
    "title": "Charizard Holo Base Set 4/102",
    "priceMinor": 4500,
    "images": ["https://images.pokemontcg.io/base1/4_hires.png"]
  }
]`;

export function ImportForm() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    setLoading(true);
    setStatus(null);
    try {
      const listings = JSON.parse(value);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${JSON.stringify(data.error)}`);
      } else {
        setStatus(`Processed ${data.processed} listing(s).`);
        router.refresh();
      }
    } catch {
      setStatus("That's not valid JSON — check the format and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={8}
        className="w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 font-mono-num text-xs text-text placeholder:text-text-faint focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          className="rounded-md bg-tier-excellent px-3 py-1.5 text-xs font-medium text-bg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import listings"}
        </button>
        {status && <span className="text-xs text-text-muted">{status}</span>}
      </div>
    </div>
  );
}
