import { DealTier } from "./types";

export function tierMeta(tier: DealTier | null) {
  switch (tier) {
    case "excellent":
      return {
        label: "Excellent deal",
        glyph: "●",
        color: "var(--tier-excellent)",
        dim: "var(--tier-excellent-dim)",
        threshold: "£20+ profit",
      };
    case "qualifying":
      return {
        label: "Qualifying deal",
        glyph: "●",
        color: "var(--tier-qualifying)",
        dim: "var(--tier-qualifying-dim)",
        threshold: "£15–£19.99 profit",
      };
    case "below_threshold":
      return {
        label: "Below threshold",
        glyph: "○",
        color: "var(--tier-rejected)",
        dim: "var(--tier-review-dim)",
        threshold: "Under £15 profit",
      };
    default:
      return {
        label: "Needs review",
        glyph: "◐",
        color: "var(--tier-review)",
        dim: "var(--tier-review-dim)",
        threshold: "Identification unconfirmed",
      };
  }
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
