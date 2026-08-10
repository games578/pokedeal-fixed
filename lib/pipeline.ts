import { RawVintedListing, DealTier, DealStatus } from "@/lib/types";
import { upsertListing, contentHashFor } from "@/lib/repo/listings";
import { createDeal, getDealForListingByHash } from "@/lib/repo/deals";
import { identifyCard } from "@/lib/adapters/cardIdentification/identify";
import { findPriceChartingMatch } from "@/lib/adapters/pricecharting";
import { calculateProfit } from "@/lib/profit";
import { getSettings } from "@/lib/settings";
import { dispatchDealNotification } from "@/lib/notify";

export interface PipelineResult {
  listingId: string;
  dealId: string | null;
  status: DealStatus;
  tier: DealTier | null;
  skippedReprocessing: boolean;
}

/**
 * Runs one listing through the full pipeline described in the product
 * spec: identify -> match price -> calculate profit -> confidence check ->
 * threshold check -> create deal -> notify. Never reprocesses a listing
 * whose content (title/price/description) hasn't changed since it was
 * last scored, and never lets an unconfident identification produce a
 * profit alert.
 */
export async function runPipeline(raw: RawVintedListing): Promise<PipelineResult> {
  const { record: listing, changed } = await upsertListing(raw);
  const contentHash = contentHashFor(raw);

  if (!changed) {
    const existingDeal = await getDealForListingByHash(listing.id, contentHash);
    if (existingDeal) {
      return {
        listingId: listing.id,
        dealId: existingDeal.id,
        status: existingDeal.status,
        tier: existingDeal.tier,
        skippedReprocessing: true,
      };
    }
  }

  const settings = await getSettings();

  const identification = await identifyCard(listing);

  if (identification.confidence < settings.confidenceThreshold) {
    const deal = await createDeal({
      listingId: listing.id,
      status: "needs_review",
      tier: null,
      identification,
      priceMatch: null,
      profit: null,
      contentHash,
    });
    return {
      listingId: listing.id,
      dealId: deal.id,
      status: "needs_review",
      tier: null,
      skippedReprocessing: false,
    };
  }

  const priceMatch = await findPriceChartingMatch(identification);

  if (!priceMatch || priceMatch.ungradedPriceMinor == null || priceMatch.matchConfidence < 0.3) {
    const deal = await createDeal({
      listingId: listing.id,
      status: "needs_review",
      tier: null,
      identification,
      priceMatch: priceMatch ?? null,
      profit: null,
      contentHash,
    });
    return {
      listingId: listing.id,
      dealId: deal.id,
      status: "needs_review",
      tier: null,
      skippedReprocessing: false,
    };
  }

  const expectedSalePrice =
    (identification.isGraded && priceMatch.gradedPrices["graded"]) ||
    priceMatch.ungradedPriceMinor;

  const profit = calculateProfit(listing.priceMinor, expectedSalePrice, settings.fees);

  if (settings.maxPurchasePriceMinor != null && listing.priceMinor > settings.maxPurchasePriceMinor) {
    const deal = await createDeal({
      listingId: listing.id,
      status: "rejected",
      tier: null,
      identification,
      priceMatch,
      profit,
      contentHash,
    });
    return { listingId: listing.id, dealId: deal.id, status: "rejected", tier: null, skippedReprocessing: false };
  }

  let tier: DealTier;
  let status: DealStatus;
  if (profit.estimatedProfitMinor >= settings.excellentProfitMinor) {
    tier = "excellent";
    status = "deal";
  } else if (profit.estimatedProfitMinor >= settings.minProfitMinor) {
    tier = "qualifying";
    status = "deal";
  } else {
    tier = "below_threshold";
    status = "rejected";
  }

  const deal = await createDeal({
    listingId: listing.id,
    status,
    tier,
    identification,
    priceMatch,
    profit,
    contentHash,
  });

  if (status === "deal") {
    await dispatchDealNotification(
      deal,
      {
        title: listing.title,
        url: listing.url,
        images: listing.images,
        priceMinor: listing.priceMinor,
        sellerUsername: listing.sellerUsername,
        currency: listing.currency,
      },
      settings
    );
  }

  return { listingId: listing.id, dealId: deal.id, status, tier, skippedReprocessing: false };
}
