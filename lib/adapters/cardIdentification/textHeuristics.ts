// Lightweight, dependency-free parsing of a Vinted listing's title/description
// into card attributes. This is intentionally conservative: it only reports
// a field when it found real evidence in the text, and it never guesses a
// Pokémon name from an unrelated word.

export interface TextHeuristicResult {
  cardName: string | null;
  cardNumber: string | null;
  rarity: string | null;
  language: string | null;
  isHolo: boolean | null;
  isReverseHolo: boolean | null;
  isGraded: boolean | null;
  gradingCompany: string | null;
  grade: string | null;
  condition: string | null;
  edition: string | null;
  setNameGuess: string | null;
  evidence: string[]; // human-readable notes on what was matched, for the reasoning field
}

// A deliberately small seed list — this is meant to be swapped for (or
// merged with) the full pokemontcg.io species/set list at runtime. Kept
// here so text parsing works even if the network call to pokemontcg.io
// fails or is rate-limited.
const COMMON_POKEMON = [
  "charizard", "pikachu", "blastoise", "venusaur", "mewtwo", "mew",
  "gengar", "eevee", "umbreon", "sylveon", "lucario", "rayquaza",
  "gyarados", "dragonite", "lugia", "ho-oh", "celebi", "greninja",
  "snorlax", "gardevoir", "garchomp", "zoroark", "lapras", "vaporeon",
  "jolteon", "flareon", "espeon", "leafeon", "glaceon", "arceus",
  "giratina", "dialga", "palkia", "darkrai", "zekrom", "reshiram",
  "kyurem", "xerneas", "yveltal", "zygarde", "solgaleo", "lunala",
  "necrozma", "zacian", "zamazenta", "eternatus", "koraidon", "miraidon",
];

const KNOWN_SETS = [
  "base set", "jungle", "fossil", "team rocket", "gym heroes", "gym challenge",
  "neo genesis", "neo discovery", "neo revelation", "neo destiny",
  "ex ruby & sapphire", "diamond & pearl", "platinum", "heartgold soulsilver",
  "black & white", "xy", "sun & moon", "sword & shield", "scarlet & violet",
  "evolving skies", "brilliant stars", "astral radiance", "lost origin",
  "silver tempest", "crown zenith", "paldea evolved", "obsidian flames",
  "paradox rift", "temporal forces", "twilight masquerade", "surging sparks",
  "151", "celebrations", "hidden fates", "shining fates", "champion's path",
];

const RARITY_PATTERNS: Array<[RegExp, string]> = [
  [/\bsecret rare\b/i, "Secret Rare"],
  [/\bultra rare\b/i, "Ultra Rare"],
  [/\bhyper rare\b/i, "Hyper Rare"],
  [/\bfull art\b/i, "Full Art"],
  [/\balt(ernate)? art\b/i, "Alternate Art"],
  [/\brainbow rare\b/i, "Rainbow Rare"],
  [/\bgold(en)? rare\b/i, "Gold Rare"],
  [/\bvmax\b/i, "VMAX"],
  [/\bvstar\b/i, "VSTAR"],
  [/\bex\b/i, "EX"],
  [/\bgx\b/i, "GX"],
  [/\billustration rare\b/i, "Illustration Rare"],
  [/\bspecial illustration rare\b/i, "Special Illustration Rare"],
];

export function runTextHeuristics(
  title: string,
  description?: string
): TextHeuristicResult {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  const evidence: string[] = [];

  // Card name
  let cardName: string | null = null;
  for (const name of COMMON_POKEMON) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
      cardName = capitalize(name);
      evidence.push(`Matched Pokémon name "${cardName}" in listing text.`);
      break;
    }
  }

  // Set name
  let setNameGuess: string | null = null;
  for (const set of KNOWN_SETS) {
    if (text.includes(set)) {
      setNameGuess = capitalize(set);
      evidence.push(`Matched set name "${setNameGuess}" in listing text.`);
      break;
    }
  }

  // Card number, e.g. "4/102" or "SV049"
  let cardNumber: string | null = null;
  const numMatch = text.match(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/);
  if (numMatch) {
    cardNumber = numMatch[1].replace(/\s+/g, "");
    evidence.push(`Found card number pattern "${cardNumber}".`);
  }

  // Rarity
  let rarity: string | null = null;
  for (const [pattern, label] of RARITY_PATTERNS) {
    if (pattern.test(text)) {
      rarity = label;
      evidence.push(`Matched rarity indicator "${label}".`);
      break;
    }
  }

  // Holo / reverse holo
  const isReverseHolo = /reverse\s*holo/i.test(text) ? true : null;
  const isHolo =
    isReverseHolo || /\bholo(graphic)?\b/i.test(text) ? true : null;

  // Language
  let language: string | null = null;
  if (/\bjapanese\b|\bjpn\b|\bjp\b(?!\w)/i.test(text)) language = "Japanese";
  else if (/\bkorean\b/i.test(text)) language = "Korean";
  else if (/\bgerman\b/i.test(text)) language = "German";
  else if (/\bfrench\b/i.test(text)) language = "French";
  else if (/\benglish\b/i.test(text)) language = "English";
  if (language) evidence.push(`Detected language "${language}".`);

  // Grading
  const gradeMatch = text.match(
    /\b(psa|cgc|bgs|sgc|ace|tag)\s*-?\s*(10|9\.5|9|8\.5|8|7|6|5)\b/i
  );
  const isGraded = gradeMatch ? true : /\bgraded\b/i.test(text) ? true : null;
  const gradingCompany = gradeMatch ? gradeMatch[1].toUpperCase() : null;
  const grade = gradeMatch ? gradeMatch[2] : null;
  if (gradeMatch) {
    evidence.push(`Found grading info "${gradingCompany} ${grade}".`);
  }

  // Condition (ungraded)
  let condition: string | null = null;
  if (/\bnear mint\b|\bnm\b/i.test(text)) condition = "Near Mint";
  else if (/\blightly played\b|\blp\b/i.test(text)) condition = "Lightly Played";
  else if (/\bmoderately played\b|\bmp\b/i.test(text))
    condition = "Moderately Played";
  else if (/\bheavily played\b|\bhp\b/i.test(text)) condition = "Heavily Played";
  else if (/\bdamaged\b|\bdmg\b/i.test(text)) condition = "Damaged";
  else if (/\bmint\b/i.test(text)) condition = "Mint";

  // Edition
  let edition: string | null = null;
  if (/\b1st edition\b|\bfirst edition\b/i.test(text)) edition = "1st Edition";
  else if (/\bunlimited\b/i.test(text)) edition = "Unlimited";
  else if (/\bshadowless\b/i.test(text)) edition = "Shadowless";

  return {
    cardName,
    cardNumber,
    rarity,
    language,
    isHolo,
    isReverseHolo,
    isGraded,
    gradingCompany,
    grade,
    condition,
    edition,
    setNameGuess,
    evidence,
  };
}

function capitalize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
