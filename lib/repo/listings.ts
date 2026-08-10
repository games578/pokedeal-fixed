import { randomUUID, createHash } from "crypto";
import { sql, ensureMigrated } from "@/lib/db";
import { ListingRecord, RawVintedListing } from "@/lib/types";

export function contentHashFor(listing: RawVintedListing): string {
  return createHash("sha256")
    .update(`${listing.title}|${listing.priceMinor}|${listing.description ?? ""}`)
    .digest("hex");
}

/**
 * Insert a new listing, or update an existing one (matched by Vinted's own
 * item id) if its price/title/description changed. Returns the stored
 * record plus whether its content actually changed, so the pipeline knows
 * whether to reprocess it.
 */
export async function upsertListing(raw: RawVintedListing): Promise<{
  record: ListingRecord;
  changed: boolean;
}> {
  await ensureMigrated();
  const now = new Date().toISOString();
  const contentHash = contentHashFor(raw);

  const existingRows = (await sql`
    SELECT * FROM listings WHERE external_id = ${raw.externalId}
  `) as unknown as RawListingRow[];
  const existing = existingRows[0];

  if (!existing) {
    const id = randomUUID();
    await sql`
      INSERT INTO listings
        (id, external_id, url, title, description, price_minor, currency, images,
         seller_username, seller_rating, seller_feedback_count, brand,
         captured_at, source, content_hash, created_at, updated_at)
       VALUES (${id}, ${raw.externalId}, ${raw.url}, ${raw.title}, ${raw.description ?? null},
         ${raw.priceMinor}, ${raw.currency}, ${JSON.stringify(raw.images)},
         ${raw.sellerUsername ?? null}, ${raw.sellerRating ?? null}, ${raw.sellerFeedbackCount ?? null},
         ${raw.brand ?? null}, ${raw.capturedAt}, ${raw.source}, ${contentHash}, ${now}, ${now})
    `;
    return {
      record: { ...raw, id, contentHash, createdAt: now, updatedAt: now },
      changed: true,
    };
  }

  const changed = existing.content_hash !== contentHash;
  if (changed) {
    await sql`
      UPDATE listings SET title=${raw.title}, description=${raw.description ?? null},
         price_minor=${raw.priceMinor}, images=${JSON.stringify(raw.images)},
         content_hash=${contentHash}, updated_at=${now}
       WHERE external_id=${raw.externalId}
    `;
  }

  return {
    record: rowToRecord({ ...existing, content_hash: contentHash, updated_at: now }),
    changed,
  };
}

export async function getListingByExternalId(externalId: string): Promise<ListingRecord | null> {
  await ensureMigrated();
  const rows = (await sql`
    SELECT * FROM listings WHERE external_id = ${externalId}
  `) as unknown as RawListingRow[];
  const row = rows[0];
  return row ? rowToRecord(row) : null;
}

export async function getListing(id: string): Promise<ListingRecord | null> {
  await ensureMigrated();
  const rows = (await sql`
    SELECT * FROM listings WHERE id = ${id}
  `) as unknown as RawListingRow[];
  const row = rows[0];
  return row ? rowToRecord(row) : null;
}

export async function listListings(): Promise<ListingRecord[]> {
  await ensureMigrated();
  const rows = (await sql`
    SELECT * FROM listings ORDER BY created_at DESC
  `) as unknown as RawListingRow[];
  return rows.map(rowToRecord);
}

interface RawListingRow {
  id: string;
  external_id: string;
  url: string;
  title: string;
  description: string | null;
  price_minor: number;
  currency: string;
  images: string;
  seller_username: string | null;
  seller_rating: number | null;
  seller_feedback_count: number | null;
  brand: string | null;
  captured_at: string;
  source: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: RawListingRow): ListingRecord {
  return {
    id: row.id,
    externalId: row.external_id,
    url: row.url,
    title: row.title,
    description: row.description ?? undefined,
    priceMinor: row.price_minor,
    currency: (row.currency as "GBP") ?? "GBP",
    images: JSON.parse(row.images) as string[],
    sellerUsername: row.seller_username ?? undefined,
    sellerRating: row.seller_rating ?? undefined,
    sellerFeedbackCount: row.seller_feedback_count ?? undefined,
    brand: row.brand ?? undefined,
    capturedAt: row.captured_at,
    source: (row.source as RawVintedListing["source"]) ?? "manual_import",
    contentHash: row.content_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
