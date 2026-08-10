import { NextResponse } from "next/server";
import { MockVintedAdapter } from "@/lib/adapters/vinted/mockAdapter";
import { runPipeline } from "@/lib/pipeline";

// Convenience endpoint for local development / demoing: runs the bundled
// mock listings through the real pipeline so /dashboard isn't empty on
// first run. Not something a production deployment needs to call.
export async function POST() {
  const adapter = new MockVintedAdapter();
  const listings = await adapter.fetchAvailable();
  const results = [];
  for (const listing of listings) {
    results.push(await runPipeline(listing));
  }
  return NextResponse.json({ seeded: results.length, results });
}
