import { CardIdentification, PriceChartingMatch } from "@/lib/types";

// PriceCharting's official, documented API (https://www.pricecharting.com/api-documentation).
// Requires a token tied to a purchased price-guide subscription — set
// PRICECHARTING_API_TOKEN in the environment. Prices in the API are USD
// cents by default; PriceCharting also supports a currency query param on
// some endpoints, but to keep the conversion explicit and auditable this
// adapter fetches in USD and converts using a configurable rate rather
// than trusting an implicit currency switch.

const BASE_URL = "https://www.pricecharting.com/api";

interface PcProduct {
  id: string;
  "product-name": string;
  "console-name": string;
  "loose-price"?: number; // cents, ungraded
  [key: string]: unknown; // grade-* fields vary by product
}

export async function findPriceChartingMatch(
  identification: CardIdentification,
  usdToGbpRate = 0.79
): Promise<PriceChartingMatch | null> {
  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) return null;
  if (!identification.cardName) return null;

  const queryParts = [
    identification.cardName,
    identification.setName,
    identification.cardNumber,
  ].filter(Boolean);
  const query = queryParts.join(" ");

  try {
    const searchUrl = `${BASE_URL}/products?t=${encodeURIComponent(
      token
    )}&q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success" || !Array.isArray(json.products)) return null;

    const products: PcProduct[] = json.products;
    if (products.length === 0) return null;

    const { best, confidence, reasoning } = rankMatches(products, identification);
    if (!best) return null;

    const ungradedPriceMinor = best["loose-price"]
      ? Math.round(best["loose-price"] * usdToGbpRate)
      : null;

    const gradedPrices: Record<string, number> = {};
    for (const [key, value] of Object.entries(best)) {
      if (key.startsWith("grade-") && typeof value === "number") {
        gradedPrices[key] = Math.round(value * usdToGbpRate);
      }
    }
    if (typeof best["graded-price"] === "number") {
      gradedPrices["graded"] = Math.round(
        (best["graded-price"] as number) * usdToGbpRate
      );
    }

    return {
      productId: best.id,
      productName: best["product-name"],
      consoleOrSet: best["console-name"],
      productUrl: `https://www.pricecharting.com/game/${best.id}`,
      ungradedPriceMinor,
      gradedPrices,
      matchConfidence: confidence,
      matchReasoning: reasoning,
    };
  } catch {
    return null;
  }
}

/** Score every candidate product against the identification and return the best one. */
function rankMatches(
  products: PcProduct[],
  identification: CardIdentification
): { best: PcProduct | null; confidence: number; reasoning: string } {
  let best: PcProduct | null = null;
  let bestScore = 0;
  let bestReasons: string[] = [];

  for (const p of products) {
    let score = 0;
    const reasons: string[] = [];
    const name = `${p["product-name"]} ${p["console-name"]}`.toLowerCase();

    if (identification.cardName && name.includes(identification.cardName.toLowerCase())) {
      score += 0.4;
      reasons.push("name matches");
    }
    if (identification.setName && name.includes(identification.setName.toLowerCase())) {
      score += 0.25;
      reasons.push("set matches");
    }
    if (
      identification.cardNumber &&
      name.includes(identification.cardNumber.split("/")[0])
    ) {
      score += 0.2;
      reasons.push("card number matches");
    }
    if (identification.isHolo && /holo/.test(name)) {
      score += 0.05;
      reasons.push("holo variant matches");
    }
    if (identification.language && identification.language !== "English") {
      if (name.includes(identification.language.toLowerCase())) {
        score += 0.1;
        reasons.push("language matches");
      } else {
        score -= 0.15; // penalize: PriceCharting mixes languages in results
        reasons.push("language could not be confirmed");
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = p;
      bestReasons = reasons;
    }
  }

  if (!best || bestScore < 0.3) {
    return { best: null, confidence: 0, reasoning: "No sufficiently confident PriceCharting match." };
  }

  return {
    best,
    confidence: Math.min(1, bestScore),
    reasoning: `Matched "${best["product-name"]}" (${best["console-name"]}) on: ${bestReasons.join(", ")}.`,
  };
}
