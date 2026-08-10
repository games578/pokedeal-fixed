import Link from "next/link";
import { Deal } from "@/lib/types";
import { formatMinor } from "@/lib/profit";
import { tierMeta, relativeTime } from "@/lib/ui";
import { ListingSummary } from "@/lib/repo/deals";

export function DealCard({ deal, listing }: { deal: Deal; listing: ListingSummary }) {
  const meta = tierMeta(deal.tier);
  const isExcellent = deal.tier === "excellent";
  const image = listing.images[0];

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong">
      {isExcellent && <div className="h-[3px] foil-edge" aria-hidden />}

      {/* Cert label strip, echoing a graded-slab label */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[10.5px] font-mono-num uppercase tracking-wider"
        style={{ background: meta.dim, color: meta.color }}
      >
        <span className="flex items-center gap-1.5">
          <span aria-hidden>{meta.glyph}</span>
          {meta.label}
        </span>
        <span>{Math.round(deal.identification.confidence * 100)}% match</span>
      </div>

      <div className="flex gap-3 p-3">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded bg-surface-raised flex items-center justify-center">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={deal.identification.cardName ?? listing.title} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-text-faint text-center px-1">No image</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link href={`/deal/${deal.id}`} className="block">
            <h3 className="font-display text-sm font-600 leading-tight truncate">
              {deal.identification.cardName ?? listing.title}
            </h3>
          </Link>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {[deal.identification.setName, deal.identification.cardNumber, deal.identification.condition]
              .filter(Boolean)
              .join(" · ") || "Details unconfirmed"}
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-num text-xs text-text-muted">
              {formatMinor(listing.priceMinor, listing.currency)}
            </span>
            <span className="text-text-faint text-xs" aria-hidden>→</span>
            <span className="font-mono-num text-xs text-text-muted">
              {deal.priceMatch?.ungradedPriceMinor != null
                ? formatMinor(deal.priceMatch.ungradedPriceMinor)
                : "—"}
            </span>
          </div>

          {deal.profit && (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono-num text-lg font-500" style={{ color: meta.color }}>
                +{formatMinor(deal.profit.estimatedProfitMinor)}
              </span>
              <span className="text-xs text-text-faint">
                ({deal.profit.profitPercent}%)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className="text-[11px] text-text-faint">{relativeTime(deal.discoveredAt)}</span>
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-surface-raised px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover border border-border-strong"
        >
          View Vinted Listing ↗
        </a>
      </div>
    </div>
  );
}
