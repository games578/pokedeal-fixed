import { notFound } from "next/navigation";
import { getDeal, markDealViewed } from "@/lib/repo/deals";
import { getListing } from "@/lib/repo/listings";
import { formatMinor } from "@/lib/profit";
import { tierMeta, relativeTime } from "@/lib/ui";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();
  const listing = await getListing(deal.listingId);
  if (!listing) notFound();
  await markDealViewed(id);

  const meta = tierMeta(deal.tier);
  const idn = deal.identification;

  return (
    <div className="flex-1 min-w-0">
      <PageHeader
        title={idn.cardName ?? listing.title}
        subtitle={`Discovered ${relativeTime(deal.discoveredAt)}`}
        actions={
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-surface-raised border border-border-strong px-4 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            View Vinted Listing ↗
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[280px_1fr]">
        {/* Listing / images */}
        <div className="space-y-4">
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-t-lg text-[10.5px] font-mono-num uppercase tracking-wider"
            style={{ background: meta.dim, color: meta.color }}
          >
            <span>{meta.label}</span>
            <span>{Math.round(idn.confidence * 100)}% confidence</span>
          </div>
          <div className="rounded-b-lg -mt-4 border border-t-0 border-border bg-surface p-3">
            <div className="aspect-[3/4] w-full overflow-hidden rounded bg-surface-raised flex items-center justify-center">
              {listing.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.images[0]} alt={idn.cardName ?? listing.title} className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-text-faint">No image</span>
              )}
            </div>
          </div>

          <Section title="Listing">
            <Row label="Title" value={listing.title} />
            <Row label="Asking price" value={formatMinor(listing.priceMinor, listing.currency)} />
            {listing.sellerUsername && <Row label="Seller" value={listing.sellerUsername} />}
            {listing.sellerRating != null && (
              <Row label="Seller rating" value={`${listing.sellerRating.toFixed(1)} / 5`} />
            )}
            <Row label="Source" value={sourceLabel(listing.source)} />
          </Section>
        </div>

        {/* Details */}
        <div className="space-y-5">
          <Section title="Card identification">
            <Row label="Card" value={idn.cardName ?? "Unidentified"} />
            <Row label="Set" value={idn.setName ?? "—"} />
            <Row label="Card number" value={idn.cardNumber ?? "—"} />
            <Row label="Rarity" value={idn.rarity ?? "—"} />
            <Row label="Language" value={idn.language ?? "—"} />
            <Row label="Holo / Reverse holo" value={fmtBool(idn.isHolo) + (idn.isReverseHolo ? " (reverse)" : "")} />
            <Row label="Edition" value={idn.edition ?? "—"} />
            <Row label="Condition" value={idn.condition ?? "—"} />
            <Row
              label="Grading"
              value={idn.isGraded ? `${idn.gradingCompany ?? "Graded"} ${idn.grade ?? ""}`.trim() : "Ungraded"}
            />
            <Row label="Identification method" value={idn.method === "text+image" ? "Text + photo analysis" : "Listing text only"} />
            <div className="mt-2 rounded-md bg-surface-raised px-3 py-2 text-xs leading-relaxed text-text-muted">
              {idn.reasoning}
            </div>
          </Section>

          <Section title="PriceCharting match">
            {deal.priceMatch ? (
              <>
                <Row label="Matched product" value={deal.priceMatch.productName} />
                <Row label="Console / set" value={deal.priceMatch.consoleOrSet} />
                <Row
                  label="Match confidence"
                  value={`${Math.round(deal.priceMatch.matchConfidence * 100)}%`}
                />
                <Row
                  label="Ungraded market price"
                  value={
                    deal.priceMatch.ungradedPriceMinor != null
                      ? formatMinor(deal.priceMatch.ungradedPriceMinor)
                      : "—"
                  }
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <a
                    href={deal.priceMatch.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted underline decoration-border-strong hover:text-text"
                  >
                    View matched PriceCharting product ↗
                  </a>
                </div>
                <div className="mt-2 rounded-md bg-surface-raised px-3 py-2 text-xs leading-relaxed text-text-muted">
                  {deal.priceMatch.matchReasoning}
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                No confident PriceCharting match was found (or no PRICECHARTING_API_TOKEN is configured).
              </p>
            )}
          </Section>

          <Section title="Estimated profit">
            {deal.profit ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono-num text-3xl font-500" style={{ color: meta.color }}>
                    +{formatMinor(deal.profit.estimatedProfitMinor)}
                  </span>
                  <span className="text-sm text-text-muted">({deal.profit.profitPercent}% of purchase price)</span>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-text-faint">
                  Estimated, not guaranteed
                </p>

                <div className="mt-4 divide-y divide-border rounded-md border border-border">
                  <CalcRow label="Expected sale price" value={formatMinor(deal.profit.expectedSalePriceMinor)} />
                  <CalcRow label="Purchase price" value={`− ${formatMinor(deal.profit.purchasePriceMinor)}`} />
                  <CalcRow label="Marketplace fee" value={`− ${formatMinor(deal.profit.feeBreakdown.platformFeeMinor)}`} />
                  <CalcRow label="Payment processing" value={`− ${formatMinor(deal.profit.feeBreakdown.paymentProcessingMinor)}`} />
                  <CalcRow label="Shipping" value={`− ${formatMinor(deal.profit.feeBreakdown.shippingCostMinor)}`} />
                  <CalcRow label="Packaging" value={`− ${formatMinor(deal.profit.feeBreakdown.packagingCostMinor)}`} />
                  {deal.profit.feeBreakdown.otherFlatCostMinor > 0 && (
                    <CalcRow label="Other costs" value={`− ${formatMinor(deal.profit.feeBreakdown.otherFlatCostMinor)}`} />
                  )}
                  <CalcRow
                    label="Estimated profit"
                    value={formatMinor(deal.profit.estimatedProfitMinor)}
                    emphasize
                  />
                </div>

                <div className="mt-3 space-y-1">
                  {deal.profit.assumptions.map((a, i) => (
                    <p key={i} className="text-xs text-text-faint">
                      · {a}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                Profit wasn&apos;t calculated because identification or price matching didn&apos;t clear the
                confidence bar for this listing.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="font-display text-sm font-600 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text text-right">{value}</span>
    </div>
  );
}

function CalcRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 text-sm ${emphasize ? "bg-surface-raised" : ""}`}>
      <span className={emphasize ? "font-medium" : "text-text-muted"}>{label}</span>
      <span className={`font-mono-num ${emphasize ? "font-600" : ""}`}>{value}</span>
    </div>
  );
}

function fmtBool(v: boolean | null): string {
  if (v === null) return "—";
  return v ? "Yes" : "No";
}

function sourceLabel(source: string): string {
  switch (source) {
    case "bookmarklet":
      return "Captured via bookmarklet";
    case "manual_import":
      return "Manually imported";
    case "mock":
      return "Demo data";
    default:
      return source;
  }
}
