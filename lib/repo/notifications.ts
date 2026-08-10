import { randomUUID } from "crypto";
import { sql, ensureMigrated } from "@/lib/db";

export interface NotificationRecord {
  id: string;
  dealId: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  seen: boolean;
  channelsSent: string[];
}

export async function createNotification(input: {
  dealId: string;
  title: string;
  body: string;
  url: string;
  channelsSent: string[];
}): Promise<NotificationRecord> {
  await ensureMigrated();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await sql`
    INSERT INTO notifications (id, deal_id, title, body, url, created_at, seen, channels_sent)
     VALUES (${id}, ${input.dealId}, ${input.title}, ${input.body}, ${input.url}, ${createdAt}, 0, ${JSON.stringify(input.channelsSent)})
  `;
  return { id, ...input, createdAt, seen: false };
}

export async function listUnseenNotifications(): Promise<NotificationRecord[]> {
  await ensureMigrated();
  const rows = (await sql`
    SELECT * FROM notifications WHERE seen = 0 ORDER BY created_at ASC
  `) as unknown as RawRow[];
  return rows.map(rowToRecord);
}

export async function markNotificationSeen(id: string): Promise<void> {
  await ensureMigrated();
  await sql`UPDATE notifications SET seen = 1 WHERE id = ${id}`;
}

interface RawRow {
  id: string;
  deal_id: string;
  title: string;
  body: string;
  url: string;
  created_at: string;
  seen: number;
  channels_sent: string;
}

function rowToRecord(row: RawRow): NotificationRecord {
  return {
    id: row.id,
    dealId: row.deal_id,
    title: row.title,
    body: row.body,
    url: row.url,
    createdAt: row.created_at,
    seen: !!row.seen,
    channelsSent: JSON.parse(row.channels_sent),
  };
}
