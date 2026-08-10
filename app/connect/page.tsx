import { PageHeader } from "@/components/PageHeader";
import { BookmarkletLink } from "@/components/BookmarkletLink";
import { ImportForm } from "@/components/ImportForm";

export default function ConnectPage() {
  return (
    <div className="flex-1 min-w-0">
      <PageHeader
        title="Connect a listing source"
        subtitle="There&apos;s no approved API for searching other people&apos;s Vinted listings, so listings get in one of two ways."
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-sm font-600">1. Capture bookmarklet</h2>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">
            Drag this button to your bookmarks bar. While browsing Vinted normally and viewing a card
            listing, click it — it reads the title, price, and photo straight off the page you&apos;re already
            looking at and sends it here. It&apos;s a single manual action, not automated scraping, so it
            doesn&apos;t touch Vinted&apos;s login, rate limits, or anti-bot protections.
          </p>
          <div className="mt-4">
            <BookmarkletLink />
          </div>
          <p className="mt-3 text-xs text-text-faint">
            Vinted&apos;s page structure can change and break the auto-detection — if the price or title look
            wrong, the bookmarklet will ask you to confirm before sending anything.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-sm font-600">2. Manual / bulk import</h2>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">
            Paste a JSON array of listings — useful if you&apos;ve gathered a batch by hand, or exported them
            from a tool you already trust. Every row still runs through identification, price matching,
            and the confidence check; importing doesn&apos;t skip verification.
          </p>
          <ImportForm />
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-display text-sm font-600">Want live, automatic scanning instead?</h2>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">
            Vinted&apos;s only official API — <span className="text-text">Vinted Pro Integrations</span> — is
            allowlisted to Pro business accounts and built for sellers syncing their own inventory, not
            for searching other people&apos;s listings. If you get access to it, or to another approved
            data feed, the Vinted side of this app is isolated behind{" "}
            <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">lib/adapters/vinted/types.ts</code>{" "}
            — implement <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">VintedListingSource</code>{" "}
            and swap it in without touching identification, pricing, or the UI.
          </p>
        </section>
      </div>
    </div>
  );
}
