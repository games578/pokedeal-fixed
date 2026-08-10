import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { NotificationPoller } from "@/components/NotificationPoller";

export const metadata: Metadata = {
  title: "PokéDeals — Vinted Pokémon card deal finder",
  description:
    "Finds potentially undervalued Pokémon card listings and estimates resale profit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex bg-bg text-text">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
        <NotificationPoller />
      </body>
    </html>
  );
}
