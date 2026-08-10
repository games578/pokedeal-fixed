import Link from "next/link";
import { listDeals } from "@/lib/repo/deals";
import { DealCard } from "@/components/DealCard";
import { formatMinor } from "@/lib/profit";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SeedDemoButton } from "@/components/SeedDemoButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allDeals = await listDeals({ status: "deal" });
  const sorted = [...allDeals].sort(
    (a, b) => (b.profit?.estimatedProfitMinor ?? 0) - (a.profit?.estimatedProfitMinor ?? 0)
  );
  const excellentCount = sorted.filter((d) => d.tier === "excellent").length;
  const totalProfit = sorted.reduce((sum, d) => sum + (d.profit?.estimatedProfitMinor ?? 0), 0);
  const needsReviewCount = (await listDeals({ status: "needs_review" })).length;

  return (
    <div className="flex-1 min-w-0">
      <PageHeader
        title="Deal Feed"
        subtitle="Every listing that cleared your minimum profit and confidence thresholds."
      />

      <div className="grid grid-cols-2 gap-3 px-6 pt-4 sm:grid-cols-4">
        <Stat label="Qualifying deals" value={String(sorted.length)} />
        <Stat label="Excellent (£20+)" value={String(excellentCount)} accent="var(--tier-excellent)" />
        <Stat label="Total est. profit" value={formatMinor(totalProfit)} />
        <Stat label="Needs review" value={String(needsReviewCount)} muted />
      </div>

      <div className="px-6 py-6">
        {sorted.length === 0 ? (
          <EmptyState
            title="No qualifying deals yet"
            body="Capture a listing from Vinted or load demo data to see how the deal feed looks."
          >
            <div className="flex gap-2">
              <SeedDemoButton />
              <Link
                href="/connect"
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
              >
                Set up capture →
              </Link>
            </div>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((deal) => (
              <DealCard key={deal.id} deal={deal} listing={deal.listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-text-faint">{label}</div>
      <div
        className="mt-1 font-mono-num text-xl font-500"
        style={{ color: accent ?? (muted ? "var(--text-muted)" : "var(--text)") }}
      >
        {value}
      </div>
    </div>
  );
}
