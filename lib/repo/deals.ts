import { randomUUID } from "crypto";
import { sql, ensureMigrated } from "@/lib/db";
import { Deal, DealStatus, DealTier, CardIdentification, PriceChartingMatch, ProfitCalculation } from "@/lib/types";

interface DealRow {
  id: string;
  listing_id: string;
  status: string;
  tier: string | null;
  identification: string;
  price_match: string | null;
  profit: string | null;
  discovered_at: string;
  viewed: number;
  content_hash: string;
}

export async function getDealForListingByHash(listingId: string, contentHash: string): Promise<Deal | null> {
  await ensureMigrated();
  const rows = (await sql`
    SELECT * FROM deals WHERE listing_id = ${listingId} AND content_hash = ${contentHash}
  `) as unknown as DealRow[];
  const row = rows[0];
  return row ? rowToDeal(row) : null;
}

export async function createDeal(input: {
  listingId: string;
  status: DealStatus;
  tier: DealTier | null;
  identification: CardIdentification;
  priceMatch: PriceChartingMatch | null;
  profit: ProfitCalculation | null;
  contentHash: string;
}): Promise<Deal> {
  await ensureMigrated();
  const id = randomUUID();
  const discoveredAt = new Date().toISOString();
  await sql`
    INSERT INTO deals (id, listing_id, status, tier, identification, price_match, profit, discovered_at, viewed, content_hash)
     VALUES (${id}, ${input.listingId}, ${input.status}, ${input.tier},
       ${JSON.stringify(input.identification)},
       ${input.priceMatch ? JSON.stringify(input.priceMatch) : null},
       ${input.profit ? JSON.stringify(input.profit) : null},
       ${discoveredAt}, 0, ${input.contentHash})
  `;
  return {
    id,
    listingId: input.listingId,
    status: input.status,
    tier: input.tier,
    identification: input.identification,
    priceMatch: input.priceMatch,
    profit: input.profit,
    discoveredAt,
    viewed: false,
  };
}

export async function getDeal(id: string): Promise<Deal | null> {
  await ensureMigrated();
  const rows = (await sql`SELECT * FROM deals WHERE id = ${id}`) as unknown as DealRow[];
  const row = rows[0];
  return row ? rowToDeal(row) : null;
}

export async function markDealViewed(id: string): Promise<void> {
  await ensureMigrated();
  await sql`UPDATE deals SET viewed = 1 WHERE id = ${id}`;
}

export interface DealFilters {
  minProfitMinor?: number;
  maxPurchasePriceMinor?: number;
  pokemon?: string;
  setName?: string;
  rarity?: string;
  condition?: string;
  minProfitPercent?: number;
  discoveredAfter?: string;
  status?: DealStatus;
}

export async function listDeals(filters: DealFilters = {}): Promise<(Deal & { listing: ListingSummary })[]> {
  await ensureMigrated();
  const rows = (await sql`
    SELECT d.*, l.title as l_title, l.url as l_url, l.images as l_images,
           l.price_minor as l_price_minor, l.seller_username as l_seller_username,
           l.currency as l_currency
     FROM deals d JOIN listings l ON d.listing_id = l.id
     ORDER BY d.discovered_at DESC
  `) as unknown as (DealRow & {
    l_title: string;
    l_url: string;
    l_images: string;
    l_price_minor: number;
    l_seller_username: string | null;
    l_currency: string;
  })[];

  let deals = rows.map((row) => ({
    ...rowToDeal(row),
    listing: {
      title: row.l_title,
      url: row.l_url,
      images: JSON.parse(row.l_images) as string[],
      priceMinor: row.l_price_minor,
      sellerUsername: row.l_seller_username ?? undefined,
      currency: row.l_currency,
    },
  }));

  if (filters.status) deals = deals.filter((d) => d.status === filters.status);
  if (filters.minProfitMinor != null)
    deals = deals.filter((d) => (d.profit?.estimatedProfitMinor ?? -Infinity) >= filters.minProfitMinor!);
  if (filters.maxPurchasePriceMinor != null)
    deals = deals.filter((d) => d.listing.priceMinor <= filters.maxPurchasePriceMinor!);
  if (filters.pokemon)
    deals = deals.filter((d) =>
      d.identification.cardName?.toLowerCase().includes(filters.pokemon!.toLowerCase())
    );
  if (filters.setName)
    deals = deals.filter((d) =>
      d.identification.setName?.toLowerCase().includes(filters.setName!.toLowerCase())
    );
  if (filters.rarity)
    deals = deals.filter((d) => d.identification.rarity?.toLowerCase() === filters.rarity!.toLowerCase());
  if (filters.condition)
    deals = deals.filter(
      (d) => d.identification.condition?.toLowerCase() === filters.condition!.toLowerCase()
    );
  if (filters.minProfitPercent != null)
    deals = deals.filter((d) => (d.profit?.profitPercent ?? -Infinity) >= filters.minProfitPercent!);
  if (filters.discoveredAfter)
    deals = deals.filter((d) => d.discoveredAt >= filters.discoveredAfter!);

  return deals;
}

export interface ListingSummary {
  title: string;
  url: string;
  images: string[];
  priceMinor: number;
  sellerUsername?: string;
  currency: string;
}

function rowToDeal(row: DealRow): Deal {
  return {
    id: row.id,
    listingId: row.listing_id,
    status: row.status as DealStatus,
    tier: row.tier as DealTier | null,
    identification: JSON.parse(row.identification),
    priceMatch: row.price_match ? JSON.parse(row.price_match) : null,
    profit: row.profit ? JSON.parse(row.profit) : null,
    discoveredAt: row.discovered_at,
    viewed: !!row.viewed,
  };
}
