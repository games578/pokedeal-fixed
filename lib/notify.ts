import { Deal, DealSettings } from "@/lib/types";
import { createNotification } from "@/lib/repo/notifications";
import { formatMinor } from "@/lib/profit";
import { ListingSummary } from "@/lib/repo/deals";

/**
 * Fans a qualifying deal out to whichever channels are enabled in
 * settings. "Browser" always writes a row that the dashboard polls and
 * turns into a real Notification via the browser's own API — the other
 * channels are best-effort HTTP calls that never throw back into the
 * pipeline (a bad webhook shouldn't stop deal detection).
 */
export async function dispatchDealNotification(
  deal: Deal,
  listing: ListingSummary,
  settings: DealSettings
): Promise<void> {
  const title = `🔥 Pokémon Card Deal Found`;
  const cardLabel = deal.identification.cardName ?? listing.title;
  const purchase = formatMinor(listing.priceMinor, listing.currency);
  const value = deal.priceMatch?.ungradedPriceMinor
    ? formatMinor(deal.priceMatch.ungradedPriceMinor)
    : "unknown";
  const profit = deal.profit ? formatMinor(deal.profit.estimatedProfitMinor) : "unknown";
  const body = `${cardLabel} — ${purchase} on Vinted\nEstimated value: ${value}\nEstimated profit: ${profit}`;

  const channelsSent: string[] = [];
  if (settings.notifyBrowser) channelsSent.push("browser");

  await createNotification({
    dealId: deal.id,
    title,
    body,
    url: listing.url,
    channelsSent,
  });

  if (settings.notifyDiscordWebhookUrl) {
    await postJson(settings.notifyDiscordWebhookUrl, {
      content: `${title}\n${body}\n${listing.url}`,
    }).catch(() => undefined);
  }

  if (settings.notifyTelegramBotToken && settings.notifyTelegramChatId) {
    const url = `https://api.telegram.org/bot${settings.notifyTelegramBotToken}/sendMessage`;
    await postJson(url, {
      chat_id: settings.notifyTelegramChatId,
      text: `${title}\n${body}\n${listing.url}`,
    }).catch(() => undefined);
  }

  // Email is intentionally not wired up yet — settings.notifyEmail is kept
  // as a placeholder so the UI and data model already support it; add an
  // adapter here (e.g. via Resend/SES) when a sending account is available.
}

async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
}
