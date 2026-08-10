import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const saved = await saveSettings(body);
  return NextResponse.json({ settings: saved });
}
