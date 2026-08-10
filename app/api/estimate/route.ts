import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { identifyCard } from "@/lib/adapters/cardIdentification/identify";
import { findPokeWalletMatch } from "@/lib/adapters/pokewallet";
import { calculateProfit } from "@/lib/profit";
import { getSettings } from "@/lib/settings";
import { RawVintedListing } from "@/lib/types";

const EstimateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priceMinor: z.number().int().nonnegative(),
  images: z.array(z.string().url()).default([]),
});

/**
 * Lightweight sibling of /api/capture for the browser extension: runs the
 * same identification + pricing logic but never writes a listing/deal row.
 * The extension calls this constantly while someone scrolls a search page
 * (potentially dozens of times a minute), so this endpoint intentionally
 * has no persistence, no dedup bookkeeping, and no notifications — it's
 * "what would this be worth", not "capture this listing".
 *
 * Guarded by EXTENSION_API_TOKEN so a leaked deployment URL can't be used
 * by someone else to burn your PokéWallet/Claude API usage. If that env
 * var isn't set, the endpoint stays open (matches the rest of the app's
 * "auth is your job if you expose this publicly" stance from the README).
 */
export async function POST(req: NextRequest) {
  const requiredToken = process.env.EXTENSION_API_TOKEN;
  if (requiredToken) {
    const provided = req.headers.get("x-api-token");
    if (provided !== requiredToken) {
      return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = EstimateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const raw: RawVintedListing = {
    externalId: "estimate-only",
    url: "",
    currency: "GBP",
    capturedAt: new Date().toISOString(),
    source: "bookmarklet",
    ...parsed.data,
  };

  const settings = await getSettings();
  const identification = await identifyCard(raw);

  if (identification.confidence < settings.confidenceThreshold) {
    return NextResponse.json({
      status: "needs_review",
      identification,
      priceMatch: null,
      profit: null,
    });
  }

  const priceMatch = await findPokeWalletMatch(identification);

  if (!priceMatch || priceMatch.ungradedPriceMinor == null || priceMatch.matchConfidence < 0.3) {
    return NextResponse.json({
      status: "needs_review",
      identification,
      priceMatch: priceMatch ?? null,
      profit: null,
    });
  }

  const expectedSalePrice =
    (identification.isGraded && priceMatch.gradedPrices["graded"]) || priceMatch.ungradedPriceMinor;

  const profit = calculateProfit(raw.priceMinor, expectedSalePrice, settings.fees);

  let tier: "excellent" | "qualifying" | "below_threshold";
  if (profit.estimatedProfitMinor >= settings.excellentProfitMinor) tier = "excellent";
  else if (profit.estimatedProfitMinor >= settings.minProfitMinor) tier = "qualifying";
  else tier = "below_threshold";

  return NextResponse.json({
    status: tier === "below_threshold" ? "rejected" : "deal",
    tier,
    identification,
    priceMatch,
    profit,
  });
}
