import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/pipeline";
import { RawVintedListing } from "@/lib/types";

const CaptureSchema = z.object({
  externalId: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  priceMinor: z.number().int().nonnegative(),
  images: z.array(z.string().url()).default([]),
  sellerUsername: z.string().optional(),
  sellerRating: z.number().optional(),
  sellerFeedbackCount: z.number().optional(),
  brand: z.string().optional(),
});

/**
 * Called by the browser bookmarklet (see /connect) with data read directly
 * out of the DOM of a Vinted listing page the user is already viewing.
 * This is a single, user-initiated action — not polling, not automated
 * search — so it stays on the right side of "don't bypass rate limits /
 * anti-bot protections."
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const raw: RawVintedListing = {
    ...parsed.data,
    currency: "GBP",
    capturedAt: new Date().toISOString(),
    source: "bookmarklet",
  };

  const result = await runPipeline(raw);
  return NextResponse.json(result);
}
