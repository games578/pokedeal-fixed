// Core domain types shared across adapters, pipeline, API routes, and UI.

export type Currency = "GBP";

/** Raw data as captured from a Vinted listing, before any interpretation. */
export interface RawVintedListing {
  /** Vinted's own item id, used for de-duplication. */
  externalId: string;
  url: string;
  title: string;
  description?: string;
  priceMinor: number; // price in pence
  currency: Currency;
  images: string[];
  sellerUsername?: string;
  sellerRating?: number;
  sellerFeedbackCount?: number;
  brand?: string; // Vinted lists Pokémon cards under a "brand" facet sometimes
  capturedAt: string; // ISO timestamp
  /** How this listing entered the system. */
  source: "bookmarklet" | "manual_import" | "mock";
}

export interface CardIdentification {
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null; // e.g. "4/102"
  rarity: string | null;
  language: string | null;
  isHolo: boolean | null;
  isReverseHolo: boolean | null;
  isGraded: boolean | null;
  gradingCompany: string | null; // PSA / CGC / BGS / ACE
  grade: string | null;
  condition: string | null; // for ungraded: NM / LP / MP / HP / DMG
  edition: string | null; // 1st edition / unlimited
  confidence: number; // 0-1
  reasoning: string; // short human-readable explanation of the evidence used
  method: "text" | "text+image";
}

export interface PriceChartingMatch {
  productId: string;
  productName: string;
  consoleOrSet: string;
  productUrl: string;
  ungradedPriceMinor: number | null;
  gradedPrices: Record<string, number>; // e.g. { "grade-9": 4500, "psa-10": 8000 } in minor units
  matchConfidence: number; // 0-1, how sure we are this is the right product
  matchReasoning: string;
}

export interface FeeConfig {
  platformFeePercent: number; // e.g. resale platform / marketplace fee
  paymentProcessingPercent: number;
  shippingCostMinor: number; // cost to ship the card out when reselling
  packagingCostMinor: number; // sleeves, toploaders, bubble mailer, etc.
  otherFlatCostMinor: number; // misc buffer
}

export interface ProfitCalculation {
  purchasePriceMinor: number;
  expectedSalePriceMinor: number;
  feesMinor: number;
  feeBreakdown: {
    platformFeeMinor: number;
    paymentProcessingMinor: number;
    shippingCostMinor: number;
    packagingCostMinor: number;
    otherFlatCostMinor: number;
  };
  estimatedProfitMinor: number;
  profitPercent: number; // profit / purchase price
  assumptions: string[];
}

export type DealTier = "excellent" | "qualifying" | "below_threshold";

export interface DealSettings {
  minProfitMinor: number; // default 1500 = £15.00
  excellentProfitMinor: number; // default 2000 = £20.00
  maxPurchasePriceMinor: number | null;
  confidenceThreshold: number; // 0-1, below this -> Needs Review
  fees: FeeConfig;
  notifyBrowser: boolean;
  notifyEmail: boolean;
  notifyDiscordWebhookUrl: string | null;
  notifyTelegramBotToken: string | null;
  notifyTelegramChatId: string | null;
  searchTerms: string[];
  scanFrequencyMinutes: number; // informational only in the current manual-capture model
}

export type DealStatus = "needs_review" | "deal" | "rejected";

export interface Deal {
  id: string;
  listingId: string;
  status: DealStatus;
  tier: DealTier | null;
  identification: CardIdentification;
  priceMatch: PriceChartingMatch | null;
  profit: ProfitCalculation | null;
  discoveredAt: string;
  viewed: boolean;
}

export interface ListingRecord extends RawVintedListing {
  id: string;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}
