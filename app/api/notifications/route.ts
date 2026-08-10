import { NextResponse } from "next/server";
import { listUnseenNotifications } from "@/lib/repo/notifications";

export async function GET() {
  return NextResponse.json({ notifications: await listUnseenNotifications() });
}
