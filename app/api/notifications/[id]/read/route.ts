import { NextRequest, NextResponse } from "next/server";
import { markNotificationSeen } from "@/lib/repo/notifications";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await markNotificationSeen(id);
  return NextResponse.json({ ok: true });
}
