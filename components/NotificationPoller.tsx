"use client";

import { useEffect, useRef, useState } from "react";

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  url: string;
}

const POLL_MS = 20000;

export function NotificationPoller() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
      return Notification.permission;
    }
  );
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (permission !== "granted") return;

    const poll = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const { notifications } = (await res.json()) as {
          notifications: NotificationRecord[];
        };
        for (const n of notifications) {
          if (shown.current.has(n.id)) continue;
          shown.current.add(n.id);
          const browserNotification = new Notification(n.title, {
            body: n.body,
            tag: n.id,
          });
          browserNotification.onclick = () => {
            window.open(n.url, "_blank");
            fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
            browserNotification.close();
          };
        }
      } catch {
        // Silently skip a failed poll — it'll retry on the next tick.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [permission]);

  if (permission === "granted" || permission === "unsupported") return null;

  return (
    <button
      onClick={async () => {
        const result = await Notification.requestPermission();
        setPermission(result);
      }}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-surface-raised border border-border-strong px-4 py-2 text-xs font-medium text-text shadow-lg hover:bg-surface-hover"
    >
      🔔 Enable deal notifications
    </button>
  );
}
