import { NextRequest, NextResponse } from "next/server";
import { searchPokemonTcgCards } from "@/lib/adapters/cardIdentification/pokemonTcgApi";
import { findPriceChartingMatch } from "@/lib/adapters/pricecharting";

/**
 * Manual "look up a specific card" search. There is no live Vinted search
 * to run this against (see README) — this looks the card up in the
 * pokemontcg.io database and, if a PriceCharting token is configured,
 * fetches its current market value, so you can sanity-check a listing
 * you've found by hand even before capturing it.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const cards = await searchPokemonTcgCards({ name: q });
  const top = cards[0];
  const priceMatch = top
    ? await findPriceChartingMatch({
        cardName: top.name,
        setName: top.set?.name ?? null,
        cardNumber: top.number,
        rarity: top.rarity ?? null,
        language: null,
        isHolo: null,
        isReverseHolo: null,
        isGraded: null,
        gradingCompany: null,
        grade: null,
        condition: null,
        edition: null,
        confidence: 1,
        reasoning: "manual search",
        method: "text",
      })
    : null;

  return NextResponse.json({ cards, priceMatch });
}
