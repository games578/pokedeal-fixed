import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. In Vercel this is provided automatically once " +
      "a Postgres database (e.g. the Neon integration) is connected to the " +
      "project — redeploy after connecting it. For local development, copy " +
      "the connection string into .env.local as DATABASE_URL=..."
  );
}

// The Neon serverless driver talks to the database over HTTP, which is
// what makes it safe to use from Vercel's serverless/edge functions —
// there's no long-lived TCP connection to manage or pool across
// invocations, unlike a traditional Postgres client.
export const sql = neon(DATABASE_URL);

declare global {
  // eslint-disable-next-line no-var
  var __pokedeals_migrated__: Promise<void> | undefined;
}

/**
 * Creates the schema on first use and memoizes that on the global object,
 * so a warm serverless instance only checks/creates it once. Every repo
 * function calls this before querying, since we can't rely on a startup
 * hook running in a serverless environment.
 */
export function ensureMigrated(): Promise<void> {
  if (!global.__pokedeals_migrated__) {
    global.__pokedeals_migrated__ = migrate().catch((err) => {
      // Don't cache a failed migration attempt — let the next call retry.
      global.__pokedeals_migrated__ = undefined;
      throw err;
    });
  }
  return global.__pokedeals_migrated__;
}

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      external_id TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price_minor INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GBP',
      images TEXT NOT NULL, -- JSON array
      seller_username TEXT,
      seller_rating REAL,
      seller_feedback_count INTEGER,
      brand TEXT,
      captured_at TEXT NOT NULL,
      source TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      status TEXT NOT NULL, -- needs_review | deal | rejected
      tier TEXT, -- excellent | qualifying | below_threshold
      identification TEXT NOT NULL, -- JSON CardIdentification
      price_match TEXT, -- JSON PriceChartingMatch | null
      profit TEXT, -- JSON ProfitCalculation | null
      discovered_at TEXT NOT NULL,
      viewed INTEGER NOT NULL DEFAULT 0,
      content_hash TEXT NOT NULL -- hash of inputs that produced this deal, for reprocessing detection
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      seen INTEGER NOT NULL DEFAULT 0,
      channels_sent TEXT NOT NULL DEFAULT '[]' -- JSON array e.g. ["browser"]
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_deals_listing ON deals(listing_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_seen ON notifications(seen)`;
}
