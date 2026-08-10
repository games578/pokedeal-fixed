import { NextResponse } from "next/server";
import { listDeals } from "@/lib/repo/deals";

export async function GET() {
  const deals = await listDeals({});
  return NextResponse.json({ deals });
}
