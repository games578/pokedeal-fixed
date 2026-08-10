import Link from "next/link";
import { listDeals } from "@/lib/repo/deals";
import { formatMinor } from "@/lib/profit";
import { tierMeta, relativeTime } from "@/lib/ui";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const deals = await listDeals({});

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title="History" subtitle="Every listing that's been processed, whether it qualified or not." />
      <div className="px-6 py-6">
        {deals.length === 0 ? (
          <EmptyState title="Nothing processed yet" body="Captured and imported listings will show up here." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-4 py-2.5 font-medium">Card</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Price</th>
                  <th className="px-4 py-2.5 font-medium">Profit</th>
                  <th className="px-4 py-2.5 font-medium">Discovered</th>
                  <th className="px-4 py-2.5 font-medium">Viewed</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const meta = tierMeta(deal.tier);
                  return (
                    <tr key={deal.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-2.5">
                        <Link href={`/deal/${deal.id}`} className="hover:underline">
                          {deal.identification.cardName ?? deal.listing.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: meta.color }}>
                          {meta.glyph} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono-num">
                        {formatMinor(deal.listing.priceMinor, deal.listing.currency)}
                      </td>
                      <td className="px-4 py-2.5 font-mono-num">
                        {deal.profit ? formatMinor(deal.profit.estimatedProfitMinor) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{relativeTime(deal.discoveredAt)}</td>
                      <td className="px-4 py-2.5 text-text-muted">{deal.viewed ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
