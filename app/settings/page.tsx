"use client";

import { useEffect, useState } from "react";
import { DealSettings } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  const [settings, setSettings] = useState<DealSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  if (!settings) {
    return (
      <div className="flex-1 min-w-0">
        <PageHeader title="Settings" />
        <div className="px-6 py-6 text-sm text-text-muted">Loading…</div>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSettings(data.settings);
    setSaving(false);
    setSavedAt(Date.now());
  }

  return (
    <div className="flex-1 min-w-0">
      <PageHeader
        title="Settings"
        subtitle="Everything the deal pipeline uses is configurable here — nothing is hard-coded."
        actions={
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-tier-excellent px-4 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save changes"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-2">
        <Section title="Deal thresholds">
          <Money
            label="Minimum profit to count as a deal"
            valueMinor={settings.minProfitMinor}
            onChange={(v) => setSettings({ ...settings, minProfitMinor: v })}
          />
          <Money
            label="Profit for 'Excellent' tier"
            valueMinor={settings.excellentProfitMinor}
            onChange={(v) => setSettings({ ...settings, excellentProfitMinor: v })}
          />
          <Money
            label="Maximum purchase price (blank = no limit)"
            valueMinor={settings.maxPurchasePriceMinor ?? 0}
            onChange={(v) => setSettings({ ...settings, maxPurchasePriceMinor: v || null })}
          />
          <Percent
            label="Minimum identification confidence"
            value={settings.confidenceThreshold * 100}
            onChange={(v) => setSettings({ ...settings, confidenceThreshold: v / 100 })}
            hint="Listings below this are marked 'Needs Review' instead of alerted as deals."
          />
        </Section>

        <Section title="Fees & costs">
          <Percent
            label="Marketplace / selling fee"
            value={settings.fees.platformFeePercent}
            onChange={(v) => setSettings({ ...settings, fees: { ...settings.fees, platformFeePercent: v } })}
          />
          <Percent
            label="Payment processing fee"
            value={settings.fees.paymentProcessingPercent}
            onChange={(v) => setSettings({ ...settings, fees: { ...settings.fees, paymentProcessingPercent: v } })}
          />
          <Money
            label="Shipping cost when reselling"
            valueMinor={settings.fees.shippingCostMinor}
            onChange={(v) => setSettings({ ...settings, fees: { ...settings.fees, shippingCostMinor: v } })}
          />
          <Money
            label="Packaging cost"
            valueMinor={settings.fees.packagingCostMinor}
            onChange={(v) => setSettings({ ...settings, fees: { ...settings.fees, packagingCostMinor: v } })}
          />
          <Money
            label="Other flat costs"
            valueMinor={settings.fees.otherFlatCostMinor}
            onChange={(v) => setSettings({ ...settings, fees: { ...settings.fees, otherFlatCostMinor: v } })}
          />
        </Section>

        <Section title="Notifications">
          <Toggle
            label="Browser notifications"
            checked={settings.notifyBrowser}
            onChange={(v) => setSettings({ ...settings, notifyBrowser: v })}
          />
          <Toggle
            label="Email notifications"
            checked={settings.notifyEmail}
            onChange={(v) => setSettings({ ...settings, notifyEmail: v })}
            hint="Not wired up yet — the toggle is here so the setting exists when an email adapter is added."
          />
          <Text
            label="Discord webhook URL"
            value={settings.notifyDiscordWebhookUrl ?? ""}
            onChange={(v) => setSettings({ ...settings, notifyDiscordWebhookUrl: v || null })}
            placeholder="https://discord.com/api/webhooks/…"
          />
          <Text
            label="Telegram bot token"
            value={settings.notifyTelegramBotToken ?? ""}
            onChange={(v) => setSettings({ ...settings, notifyTelegramBotToken: v || null })}
          />
          <Text
            label="Telegram chat ID"
            value={settings.notifyTelegramChatId ?? ""}
            onChange={(v) => setSettings({ ...settings, notifyTelegramChatId: v || null })}
          />
        </Section>

        <Section title="Search & scanning">
          <Text
            label="Search terms (comma-separated)"
            value={settings.searchTerms.join(", ")}
            onChange={(v) =>
              setSettings({ ...settings, searchTerms: v.split(",").map((s) => s.trim()).filter(Boolean) })
            }
            hint="Used to pre-fill searches when you're browsing Vinted manually to capture listings."
          />
          <NumField
            label="Reminder interval (minutes)"
            value={settings.scanFrequencyMinutes}
            onChange={(v) => setSettings({ ...settings, scanFrequencyMinutes: v })}
            hint="There's no automated Vinted scanning (see Connect page) — this just controls how often the app can remind you to go capture listings, if you wire that up."
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <h2 className="font-display text-sm font-600">{title}</h2>
      {children}
    </section>
  );
}

function FieldWrap({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-text">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-text-faint">{hint}</p>}
    </label>
  );
}

function Money({
  label,
  valueMinor,
  onChange,
  hint,
}: {
  label: string;
  valueMinor: number;
  onChange: (minor: number) => void;
  hint?: string;
}) {
  return (
    <FieldWrap label={label} hint={hint}>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">£</span>
        <input
          type="number"
          step="0.01"
          defaultValue={(valueMinor / 100).toFixed(2)}
          onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
          className="w-32 rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-sm focus:outline-none"
        />
      </div>
    </FieldWrap>
  );
}

function Percent({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <FieldWrap label={label} hint={hint}>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          defaultValue={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-sm focus:outline-none"
        />
        <span className="text-text-muted">%</span>
      </div>
    </FieldWrap>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <FieldWrap label={label} hint={hint}>
      <input
        type="number"
        defaultValue={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-sm focus:outline-none"
      />
    </FieldWrap>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <FieldWrap label={label} hint={hint}>
      <input
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-sm focus:outline-none"
      />
    </FieldWrap>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <span className="text-sm text-text">{label}</span>
        {hint && <p className="mt-0.5 text-xs text-text-faint">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-tier-excellent" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-bg transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
