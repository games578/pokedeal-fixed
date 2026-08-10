import { CardIdentification, PriceChartingMatch } from "@/lib/types";

const BASE_URL = "https://api.pokewallet.io";
const DEFAULT_EUR_TO_GBP = 0.86;

interface PokeWalletPrice {
  avg?: number | null;
  low?: number | null;
  trend?: number | null;
  avg7?: number | null;
  avg30?: number | null;
  variant_type?: string;
}

interface PokeWalletResult {
  id: string;
  card_info?: {
    name?: string;
    clean_name?: string;
    set_name?: string;
    set_code?: string;
    card_number?: string;
    rarity?: string;
  };
  cardmarket?: {
    product_name?: string;
    product_url?: string;
    prices?: PokeWalletPrice[];
  } | null;
  tcgplayer?: {
    prices?: Array<{
      sub_type_name?: string;
      market_price?: number | null;
    }>;
    url?: string;
  } | null;
}

interface SearchResponse {
  results?: PokeWalletResult[];
}

/**
 * Looks up a card in PokéWallet and prefers CardMarket pricing because the
 * app is intended for UK/EU resale. CardMarket prices are EUR, so the adapter
 * converts them to GBP using POKEWALLET_EUR_TO_GBP_RATE (default 0.86).
 *
 * The old PriceChartingMatch shape is retained so the database/UI do not need
 * a destructive schema migration.
 */
export async function findPokeWalletMatch(
  identification: CardIdentification
): Promise<PriceChartingMatch | null> {
  const apiKey = process.env.POKEWALLET_API_KEY;
  if (!apiKey || !identification.cardName) return null;

  const queryParts = [
    identification.cardName,
    identification.setName,
    identification.cardNumber,
  ].filter(Boolean);
  const query = queryParts.join(" ");
  const eurToGbp = Number(process.env.POKEWALLET_EUR_TO_GBP_RATE || DEFAULT_EUR_TO_GBP);
  const safeRate = Number.isFinite(eurToGbp) && eurToGbp > 0 ? eurToGbp : DEFAULT_EUR_TO_GBP;

  try {
    const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}&limit=20`;
    const res = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = (await res.json()) as SearchResponse;
    if (!Array.isArray(json.results) || json.results.length === 0) return null;

    const ranked = rankMatches(json.results, identification);
    if (!ranked.best || ranked.confidence < 0.3) return null;

    const price = chooseCardMarketPrice(ranked.best, identification);
    if (price == null) return null;

    const ungradedPriceMinor = Math.round(price * safeRate * 100);
    const info = ranked.best.card_info ?? {};
    const productName = info.name || info.clean_name || identification.cardName;
    const setName = info.set_name || info.set_code || identification.setName || "Pokémon TCG";
    const productUrl = ranked.best.cardmarket?.product_url || ranked.best.tcgplayer?.url || "https://www.pokewallet.io";

    return {
      productId: ranked.best.id,
      productName,
      consoleOrSet: setName,
      productUrl,
      ungradedPriceMinor,
      gradedPrices: {},
      matchConfidence: ranked.confidence,
      matchReasoning: `${ranked.reasoning} CardMarket ${price.toFixed(2)} EUR converted at £${safeRate.toFixed(4)}/EUR.`,
      provider: "pokewallet",
    };
  } catch {
    return null;
  }
}

function chooseCardMarketPrice(
  result: PokeWalletResult,
  identification: CardIdentification
): number | null {
  const prices = result.cardmarket?.prices ?? [];
  if (prices.length) {
    const wantedVariant = identification.isHolo || identification.isReverseHolo ? "holo" : "normal";
    const variant = prices.find((p) => p.variant_type === wantedVariant) || prices[0];
    const value = variant.avg ?? variant.avg7 ?? variant.avg30 ?? variant.trend ?? variant.low ?? null;
    if (typeof value === "number" && value > 0) return value;
  }

  // Fallback for cards where PokéWallet only has TCGPlayer data.
  const market = result.tcgplayer?.prices?.find((p) => typeof p.market_price === "number")?.market_price;
  if (typeof market === "number" && market > 0) {
    const usdToGbp = Number(process.env.POKEWALLET_USD_TO_GBP_RATE || 0.79);
    return market * (Number.isFinite(usdToGbp) && usdToGbp > 0 ? usdToGbp : 0.79) / (Number(process.env.POKEWALLET_EUR_TO_GBP_RATE || DEFAULT_EUR_TO_GBP));
  }

  return null;
}

function rankMatches(
  results: PokeWalletResult[],
  identification: CardIdentification
): { best: PokeWalletResult | null; confidence: number; reasoning: string } {
  let best: PokeWalletResult | null = null;
  let bestScore = 0;
  let bestReasons: string[] = [];

  for (const result of results) {
    const info = result.card_info ?? {};
    const name = `${info.name ?? ""} ${info.clean_name ?? ""}`.toLowerCase();
    const set = `${info.set_name ?? ""} ${info.set_code ?? ""}`.toLowerCase();
    const number = (info.card_number ?? "").toLowerCase();
    const targetName = identification.cardName?.toLowerCase() ?? "";
    const targetSet = identification.setName?.toLowerCase() ?? "";
    const targetNumber = identification.cardNumber?.split("/")[0].toLowerCase() ?? "";

    let score = 0;
    const reasons: string[] = [];
    if (targetName && (name.includes(targetName) || targetName.includes(name))) {
      score += 0.45;
      reasons.push("name matches");
    }
    if (targetSet && (set.includes(targetSet) || targetSet.includes(set))) {
      score += 0.25;
      reasons.push("set matches");
    }
    if (targetNumber && number.split("/")[0] === targetNumber) {
      score += 0.25;
      reasons.push("card number matches");
    }
    if (identification.rarity && info.rarity && info.rarity.toLowerCase().includes(identification.rarity.toLowerCase())) {
      score += 0.05;
      reasons.push("rarity matches");
    }

    if (score > bestScore) {
      bestScore = score;
      best = result;
      bestReasons = reasons;
    }
  }

  return {
    best,
    confidence: Math.min(1, bestScore),
    reasoning: best
      ? `Matched "${best.card_info?.name ?? identification.cardName}" on ${bestReasons.join(", ") || "search similarity"}.`
      : "No sufficiently confident PokéWallet match.",
  };
}
