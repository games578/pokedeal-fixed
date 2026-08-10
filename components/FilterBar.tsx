"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

const RARITIES = [
  "Secret Rare", "Ultra Rare", "Hyper Rare", "Full Art", "Alternate Art",
  "Rainbow Rare", "Gold Rare", "VMAX", "VSTAR", "EX", "GX",
  "Illustration Rare", "Special Illustration Rare",
];
const CONDITIONS = ["Mint", "Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"];
const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "deal", label: "Deal" },
  { value: "needs_review", label: "Needs review" },
  { value: "rejected", label: "Rejected" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [local, setLocal] = useState({
    minProfit: searchParams.get("minProfit") ?? "",
    maxPurchase: searchParams.get("maxPurchase") ?? "",
    pokemon: searchParams.get("pokemon") ?? "",
    set: searchParams.get("set") ?? "",
    rarity: searchParams.get("rarity") ?? "",
    condition: searchParams.get("condition") ?? "",
    minProfitPercent: searchParams.get("minProfitPercent") ?? "",
    status: searchParams.get("status") ?? "",
  });

  function apply(next: typeof local) {
    setLocal(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function field<K extends keyof typeof local>(key: K, value: string) {
    apply({ ...local, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface px-6 py-4">
      <TextField
        label="Pokémon"
        value={local.pokemon}
        onChange={(v) => field("pokemon", v)}
        placeholder="Charizard"
      />
      <TextField
        label="Set"
        value={local.set}
        onChange={(v) => field("set", v)}
        placeholder="Evolving Skies"
      />
      <SelectField
        label="Rarity"
        value={local.rarity}
        onChange={(v) => field("rarity", v)}
        options={[{ value: "", label: "Any rarity" }, ...RARITIES.map((r) => ({ value: r, label: r }))]}
      />
      <SelectField
        label="Condition"
        value={local.condition}
        onChange={(v) => field("condition", v)}
        options={[{ value: "", label: "Any condition" }, ...CONDITIONS.map((c) => ({ value: c, label: c }))]}
      />
      <TextField
        label="Min profit (£)"
        value={local.minProfit}
        onChange={(v) => field("minProfit", v ? String(Math.round(Number(v) * 100)) : "")}
        placeholder="15"
        type="number"
        display={local.minProfit ? String(Number(local.minProfit) / 100) : ""}
      />
      <TextField
        label="Max purchase (£)"
        value={local.maxPurchase}
        onChange={(v) => field("maxPurchase", v ? String(Math.round(Number(v) * 100)) : "")}
        placeholder="50"
        type="number"
        display={local.maxPurchase ? String(Number(local.maxPurchase) / 100) : ""}
      />
      <TextField
        label="Min profit %"
        value={local.minProfitPercent}
        onChange={(v) => field("minProfitPercent", v)}
        placeholder="20"
        type="number"
      />
      <SelectField
        label="Status"
        value={local.status}
        onChange={(v) => field("status", v)}
        options={STATUSES}
      />
      <button
        onClick={() =>
          apply({
            minProfit: "",
            maxPurchase: "",
            pokemon: "",
            set: "",
            rarity: "",
            condition: "",
            minProfitPercent: "",
            status: "",
          })
        }
        className="rounded-md px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover"
      >
        Clear
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  display,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  display?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-text-faint">{label}</span>
      <input
        type={type}
        defaultValue={display !== undefined ? display : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-32 rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-sm text-text placeholder:text-text-faint focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-40 rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-sm text-text focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
