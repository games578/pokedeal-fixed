// Thin client for https://pokemontcg.io — a community-maintained but
// well-structured Pokémon TCG database (card name, set, number, rarity,
// images). It does not identify cards from a photo, but it lets us verify
// that a text-parsed guess ("Charizard", set "Base Set", number "4/102")
// actually corresponds to a real printed card, which is what turns a guess
// into a verified identification.
//
// Free tier works without a key at low volume; set POKEMONTCG_API_KEY to
// raise the rate limit. See https://docs.pokemontcg.io/

export interface PokemonTcgCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
  };
  images: {
    small: string;
    large: string;
  };
}

const BASE_URL = "https://api.pokemontcg.io/v2/cards";

export async function searchPokemonTcgCards(params: {
  name?: string | null;
  number?: string | null;
  setName?: string | null;
}): Promise<PokemonTcgCard[]> {
  const clauses: string[] = [];
  if (params.name) clauses.push(`name:"${escapeQuery(params.name)}"`);
  if (params.number) {
    const num = params.number.split("/")[0];
    clauses.push(`number:${escapeQuery(num)}`);
  }
  if (params.setName) clauses.push(`set.name:"${escapeQuery(params.setName)}"`);

  if (clauses.length === 0) return [];

  const url = `${BASE_URL}?q=${encodeURIComponent(clauses.join(" "))}&pageSize=10`;

  try {
    const res = await fetch(url, {
      headers: process.env.POKEMONTCG_API_KEY
        ? { "X-Api-Key": process.env.POKEMONTCG_API_KEY }
        : {},
      // Keep this bounded so a slow/unreachable third party never hangs the pipeline.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as PokemonTcgCard[];
  } catch {
    // Network/API issues degrade gracefully: identification falls back to
    // text-only confidence rather than throwing and losing the listing.
    return [];
  }
}

function escapeQuery(s: string): string {
  return s.replace(/"/g, '\\"');
}
