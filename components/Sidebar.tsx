"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", glyph: "◆" },
  { href: "/deals", label: "All Deals", glyph: "▤" },
  { href: "/history", label: "History", glyph: "◷" },
  { href: "/connect", label: "Connect", glyph: "⇢" },
  { href: "/settings", label: "Settings", glyph: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full foil-edge" aria-hidden />
          <span className="font-display text-[15px] font-700 tracking-tight">
            PokéDeals
          </span>
        </div>
        <p className="mt-1 text-xs text-text-faint">Vinted card deal finder</p>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-surface-raised text-text font-medium"
                  : "text-text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              <span className="w-4 text-center text-xs opacity-70" aria-hidden>
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-border text-[11px] leading-relaxed text-text-faint">
        Estimated profit is never guaranteed. Verify every match before you buy.
      </div>
    </aside>
  );
}
