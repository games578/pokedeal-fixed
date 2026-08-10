import { CardIdentification, RawVintedListing } from "@/lib/types";
import { runTextHeuristics } from "./textHeuristics";
import { identifyFromImage } from "./visionIdentifier";
import { searchPokemonTcgCards, normalizeNumber } from "./pokemonTcgApi";

/**
 * Combines listing title/description text parsing with (optional) image
 * analysis, then cross-checks the result against the pokemontcg.io card
 * database so a confident-sounding guess doesn't get treated as verified
 * unless a real matching card actually exists.
 *
 * Confidence is built up from independent pieces of evidence rather than
 * asserted — no single signal can push it to "confirmed" on its own.
 */
export async function identifyCard(
  listing: RawVintedListing
): Promise<CardIdentification> {
  const text = runTextHeuristics(listing.title, listing.description);
  const vision = await identifyFromImage(
    listing.images,
    listing.title,
    listing.description
  );

  let cardName = vision?.cardName || text.cardName;
  const setName = vision?.setName || text.setNameGuess;
  const cardNumber = vision?.cardNumber || text.cardNumber;
  const rarity = vision?.rarity || text.rarity;
  const language = vision?.language || text.language;
  const isHolo = vision?.isHolo ?? text.isHolo;
  const isReverseHolo = vision?.isReverseHolo ?? text.isReverseHolo;
  const edition = vision?.edition || text.edition;
  const condition = vision?.conditionAssessment || text.condition;

  // Verify against the card database whenever we have enough to search on.
  let dbMatches = cardName
    ? await searchPokemonTcgCards({ name: cardName, number: cardNumber, setName })
    : [];

  // Text heuristics only recognize a small seed list of popular species —
  // there are 1000+ Pokémon and listings routinely feature ones not on
  // that list (e.g. "Dragonair"). Rather than maintain a giant static
  // name list, fall back to asking pokemontcg.io directly: a card number
  // (plus set, when we have one) is usually enough to uniquely resolve
  // the card, and the database is the real source of truth for species
  // names. Only trust this when every match it returns agrees on the
  // name — if the number is ambiguous across different species, don't guess.
  let nameFromDbLookup = false;
  if (!cardName && cardNumber) {
    const fallbackMatches = await searchPokemonTcgCards({ number: cardNumber, setName });
    const uniqueNames = new Set(fallbackMatches.map((m) => m.name.toLowerCase()));
    if (fallbackMatches.length > 0 && uniqueNames.size === 1) {
      cardName = fallbackMatches[0].name;
      nameFromDbLookup = true;
      dbMatches = fallbackMatches;
    }
  }

  const verified = dbMatches.length > 0;
  const exactNumberMatch =
    !!cardNumber && dbMatches.some((c) => c.number === normalizeNumber(cardNumber.split("/")[0]));

  // --- Confidence scoring ---------------------------------------------
  let confidence = 0;
  const reasons: string[] = [];

  if (cardName) {
    confidence += 0.2;
    reasons.push(
      nameFromDbLookup
        ? `Card name not found in listing text, but card number ${cardNumber} uniquely matched "${cardName}" in the pokemontcg.io database.`
        : `Card name identified: ${cardName}.`
    );
  }
  if (vision) {
    confidence += vision.modelConfidence * 0.3;
    reasons.push(
      `Image analysis contributed (model confidence ${(vision.modelConfidence * 100).toFixed(0)}%): ${vision.reasoning}`
    );
  } else {
    reasons.push(
      `No image analysis available (ANTHROPIC_API_KEY not set, or no images) — identification relies on listing text only.`
    );
  }
  if (setName) {
    confidence += 0.1;
    reasons.push(`Set identified: ${setName}.`);
  }
  if (cardNumber) {
    confidence += 0.1;
    reasons.push(`Card number found: ${cardNumber}.`);
  }
  if (verified) {
    confidence += 0.15;
    reasons.push(
      `Verified against pokemontcg.io: ${dbMatches.length} matching card record(s) found.`
    );
  } else if (cardName) {
    reasons.push(
      `Could not verify this card against pokemontcg.io — treat with extra caution.`
    );
  }
  if (exactNumberMatch) {
    confidence += 0.15;
    reasons.push(`Card number matches an exact record in the database.`);
  }

  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

  const isGraded = text.isGraded;

  return {
    cardName: cardName || null,
    setName: setName || null,
    cardNumber: cardNumber || null,
    rarity: rarity || null,
    language: language || null,
    isHolo: isHolo ?? null,
    isReverseHolo: isReverseHolo ?? null,
    isGraded: isGraded ?? null,
    gradingCompany: text.gradingCompany,
    grade: text.grade,
    condition: condition || null,
    edition: edition || null,
    confidence,
    reasoning: reasons.join(" "),
    method: vision ? "text+image" : "text",
  };
}
