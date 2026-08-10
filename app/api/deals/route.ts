import { NextRequest, NextResponse } from "next/server";
import { listDeals, DealFilters } from "@/lib/repo/deals";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters: DealFilters = {
    minProfitMinor: numOrUndef(sp.get("minProfit")),
    maxPurchasePriceMinor: numOrUndef(sp.get("maxPurchase")),
    pokemon: sp.get("pokemon") || undefined,
    setName: sp.get("set") || undefined,
    rarity: sp.get("rarity") || undefined,
    condition: sp.get("condition") || undefined,
    minProfitPercent: numOrUndef(sp.get("minProfitPercent")),
    discoveredAfter: sp.get("discoveredAfter") || undefined,
    status: (sp.get("status") as DealFilters["status"]) || undefined,
  };
  const deals = await listDeals(filters);
  return NextResponse.json({ deals });
}

function numOrUndef(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
