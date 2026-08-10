import { RawVintedListing } from "@/lib/types";

/**
 * Vinted has no approved API for searching/monitoring other users'
 * listings (only "Vinted Pro Integrations", which is allowlisted-only and
 * for sellers managing their own inventory — see README). This interface
 * exists so however listings arrive, the rest of the pipeline never cares
 * where they came from, and a real search-based source can be dropped in
 * later without touching identification, pricing, or the UI.
 */
export interface VintedListingSource {
  readonly name: string;
  /** Pull any listings this source currently has available (e.g. demo fixtures). */
  fetchAvailable(): Promise<RawVintedListing[]>;
}
