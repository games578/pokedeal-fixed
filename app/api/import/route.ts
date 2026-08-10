import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/pipeline";
import { RawVintedListing } from "@/lib/types";

const ImportRowSchema = z.object({
  externalId: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  priceMinor: z.number().int().nonnegative(),
  images: z.array(z.string().url()).default([]),
  sellerUsername: z.string().optional(),
});

const ImportSchema = z.object({ listings: z.array(ImportRowSchema).min(1).max(200) });

/**
 * Bulk manual import: paste a JSON array of listings you've gathered by
 * hand (e.g. from browsing Vinted normally, or exported from a browser
 * extension you already trust). Each row still goes through the full
 * identification/pricing/confidence pipeline — importing doesn't skip
 * verification.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const results = [];
  for (const row of parsed.data.listings) {
    const raw: RawVintedListing = {
      ...row,
      currency: "GBP",
      capturedAt: new Date().toISOString(),
      source: "manual_import",
    };
    results.push(await runPipeline(raw));
  }

  return NextResponse.json({ processed: results.length, results });
}
