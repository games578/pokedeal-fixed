import { FeeConfig, ProfitCalculation } from "./types";

/**
 * Estimated Profit = Expected Sale Price - Purchase Price - Selling Fees - Other Costs
 *
 * All money is handled in minor units (pence) as integers to avoid float
 * rounding issues. Every assumption baked into the number is returned
 * alongside it so the UI can show its working rather than presenting a
 * bare "profit" figure as if it were guaranteed.
 */
export function calculateProfit(
  purchasePriceMinor: number,
  expectedSalePriceMinor: number,
  fees: FeeConfig
): ProfitCalculation {
  const platformFeeMinor = Math.round(
    (expectedSalePriceMinor * fees.platformFeePercent) / 100
  );
  const paymentProcessingMinor = Math.round(
    (expectedSalePriceMinor * fees.paymentProcessingPercent) / 100
  );
  const { shippingCostMinor, packagingCostMinor, otherFlatCostMinor } = fees;

  const feesMinor =
    platformFeeMinor +
    paymentProcessingMinor +
    shippingCostMinor +
    packagingCostMinor +
    otherFlatCostMinor;

  const estimatedProfitMinor =
    expectedSalePriceMinor - purchasePriceMinor - feesMinor;

  const profitPercent =
    purchasePriceMinor > 0
      ? Math.round((estimatedProfitMinor / purchasePriceMinor) * 1000) / 10
      : 0;

  return {
    purchasePriceMinor,
    expectedSalePriceMinor,
    feesMinor,
    feeBreakdown: {
      platformFeeMinor,
      paymentProcessingMinor,
      shippingCostMinor,
      packagingCostMinor,
      otherFlatCostMinor,
    },
    estimatedProfitMinor,
    profitPercent,
    assumptions: [
      `Expected sale price is based on the selected PokéWallet/CardMarket market reference for the identified card; actual resale price may differ.`,
      `Marketplace fee: ${fees.platformFeePercent}% of sale price.`,
      `Payment processing: ${fees.paymentProcessingPercent}% of sale price.`,
      `Shipping cost when reselling: ${formatMinor(shippingCostMinor)}.`,
      `Packaging (sleeve/toploader/mailer): ${formatMinor(packagingCostMinor)}.`,
      otherFlatCostMinor
        ? `Other costs: ${formatMinor(otherFlatCostMinor)}.`
        : undefined,
      `Does not account for listing sitting unsold, price drift, or condition disputes after purchase.`,
    ].filter(Boolean) as string[],
  };
}

export function formatMinor(minor: number, currency = "GBP"): string {
  const symbol = currency === "GBP" ? "£" : "";
  return `${symbol}${(minor / 100).toFixed(2)}`;
}
