import { sql, ensureMigrated } from "./db";
import { DealSettings } from "./types";

export const DEFAULT_SETTINGS: DealSettings = {
  minProfitMinor: 1500, // £15.00
  excellentProfitMinor: 2000, // £20.00
  maxPurchasePriceMinor: null,
  confidenceThreshold: 0.65,
  fees: {
    platformFeePercent: 10, // e.g. eBay-style final value fee
    paymentProcessingPercent: 2.9,
    shippingCostMinor: 250, // £2.50 tracked shipping
    packagingCostMinor: 50, // £0.50 sleeve + toploader + mailer
    otherFlatCostMinor: 0,
  },
  notifyBrowser: true,
  notifyEmail: false,
  notifyDiscordWebhookUrl: null,
  notifyTelegramBotToken: null,
  notifyTelegramChatId: null,
  searchTerms: ["pokemon card", "pokemon cards bundle", "charizard"],
  scanFrequencyMinutes: 15,
};

export async function getSettings(): Promise<DealSettings> {
  await ensureMigrated();
  const rows = (await sql`SELECT data FROM settings WHERE id = 1`) as unknown as { data: string }[];
  const row = rows[0];
  if (!row) {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  // Merge with defaults so newly-added fields don't break older saved settings.
  return { ...DEFAULT_SETTINGS, ...JSON.parse(row.data) };
}

export async function saveSettings(settings: DealSettings): Promise<DealSettings> {
  await ensureMigrated();
  await sql`
    INSERT INTO settings (id, data) VALUES (1, ${JSON.stringify(settings)})
     ON CONFLICT (id) DO UPDATE SET data = excluded.data
  `;
  return settings;
}
