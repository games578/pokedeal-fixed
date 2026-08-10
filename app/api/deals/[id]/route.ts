import { NextRequest, NextResponse } from "next/server";
import { getDeal, markDealViewed } from "@/lib/repo/deals";
import { getListing } from "@/lib/repo/listings";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const listing = await getListing(deal.listingId);
  await markDealViewed(id);
  return NextResponse.json({ deal: { ...deal, viewed: true }, listing });
}
