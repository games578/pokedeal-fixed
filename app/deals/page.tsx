import { listDeals, DealFilters } from "@/lib/repo/deals";
import { DealCard } from "@/components/DealCard";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: DealFilters = {
    minProfitMinor: numOrUndef(sp.minProfit),
    maxPurchasePriceMinor: numOrUndef(sp.maxPurchase),
    pokemon: sp.pokemon || undefined,
    setName: sp.set || undefined,
    rarity: sp.rarity || undefined,
    condition: sp.condition || undefined,
    minProfitPercent: numOrUndef(sp.minProfitPercent),
    status: (sp.status as DealFilters["status"]) || undefined,
  };

  const deals = (await listDeals(filters)).sort(
    (a, b) => (b.profit?.estimatedProfitMinor ?? -Infinity) - (a.profit?.estimatedProfitMinor ?? -Infinity)
  );

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title="All Deals" subtitle={`${deals.length} listing${deals.length === 1 ? "" : "s"} processed`} />
      <FilterBar />
      <div className="px-6 py-6">
        {deals.length === 0 ? (
          <EmptyState title="No deals match these filters" body="Try widening your filters, or clear them to see everything." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} listing={deal.listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function numOrUndef(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
