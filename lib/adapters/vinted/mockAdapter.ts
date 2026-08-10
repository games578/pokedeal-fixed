import { RawVintedListing } from "@/lib/types";
import { VintedListingSource } from "./types";

// Clearly-labelled demo data (source: "mock") so it can never be confused
// with something a real user captured, and so it's trivial to filter out
// once a live source is connected. Images point at pokemontcg.io's public
// card image CDN so the demo dashboard renders real card art.
const FIXTURES: RawVintedListing[] = [
  {
    externalId: "mock-1001",
    url: "https://www.vinted.co.uk/items/1001-charizard-base-set-holo",
    title: "Charizard Holo 4/102 Base Set Pokemon card",
    description: "Great condition, some light edge wear. Genuine, from a smoke free home.",
    priceMinor: 4500,
    currency: "GBP",
    images: ["https://images.pokemontcg.io/base1/4_hires.png"],
    sellerUsername: "cardbundle_uk",
    sellerRating: 4.8,
    sellerFeedbackCount: 212,
    brand: "Pokemon",
    capturedAt: new Date().toISOString(),
    source: "mock",
  },
  {
    externalId: "mock-1002",
    url: "https://www.vinted.co.uk/items/1002-pikachu-vmax-rainbow",
    title: "Pikachu VMAX Rainbow Rare Vivid Voltage 188/185",
    description: "NM condition, straight from pack, sleeved immediately.",
    priceMinor: 1800,
    currency: "GBP",
    images: ["https://images.pokemontcg.io/swsh4/188_hires.png"],
    sellerUsername: "tcg_flips",
    sellerRating: 4.6,
    sellerFeedbackCount: 58,
    brand: "Pokemon",
    capturedAt: new Date().toISOString(),
    source: "mock",
  },
  {
    externalId: "mock-1003",
    url: "https://www.vinted.co.uk/items/1003-random-pokemon-bundle",
    title: "Bundle of random Pokemon cards x50",
    description: "Mixed bundle, mostly commons, a few holos in the mix.",
    priceMinor: 1000,
    currency: "GBP",
    images: [],
    sellerUsername: "clearout_attic",
    sellerRating: 4.2,
    sellerFeedbackCount: 14,
    brand: "Pokemon",
    capturedAt: new Date().toISOString(),
    source: "mock",
  },
  {
    externalId: "mock-1004",
    url: "https://www.vinted.co.uk/items/1004-umbreon-vmax-alt-art",
    title: "Umbreon VMAX Alt Art 215/203 Evolving Skies LP",
    description: "Lightly played, small whitening on one corner, otherwise great.",
    priceMinor: 6000,
    currency: "GBP",
    images: ["https://images.pokemontcg.io/swsh7/215_hires.png"],
    sellerUsername: "moonlight_cards",
    sellerRating: 5.0,
    sellerFeedbackCount: 401,
    brand: "Pokemon",
    capturedAt: new Date().toISOString(),
    source: "mock",
  },
  {
    externalId: "mock-1005",
    url: "https://www.vinted.co.uk/items/1005-gengar-graded-psa9",
    title: "Gengar PSA 9 Fossil Set 5/62 Holo",
    description: "Graded PSA 9, slab in perfect condition, cert verifiable.",
    priceMinor: 3500,
    currency: "GBP",
    images: ["https://images.pokemontcg.io/fossil/5_hires.png"],
    sellerUsername: "graded_gems",
    sellerRating: 4.9,
    sellerFeedbackCount: 132,
    brand: "Pokemon",
    capturedAt: new Date().toISOString(),
    source: "mock",
  },
];

export class MockVintedAdapter implements VintedListingSource {
  readonly name = "mock";
  async fetchAvailable(): Promise<RawVintedListing[]> {
    return FIXTURES;
  }
}
