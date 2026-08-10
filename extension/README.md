# PokéDeals Profit Overlay (browser extension)

Shows an estimated profit badge right on Vinted listings and search
results, using your already-deployed PokéDeals app to do the identification
and pricing. It never talks to Vinted's servers itself — it only reads the
page you're already looking at in your own browser, same as the bookmarklet
in `/connect`.

## Install (Chrome / Edge / Brave)

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Click the puzzle-piece icon in your toolbar, pin **PokéDeals Profit
   Overlay**, then click it to open settings.
5. Enter your deployed app's URL (e.g. `https://your-app.vercel.app`) and
   click **Save & connect**. Chrome will ask you to confirm permission for
   that one site — approve it.
6. If you set `EXTENSION_API_TOKEN` as an env var on your Vercel deployment
   (recommended, see below), paste the same value into the API token field.
7. Reload any open Vinted tabs.

## What you'll see

- **On a listing page**: a small panel in the top-right with the estimated
  profit, the identified card, and confidence.
- **On search/browse pages**: a small badge in the corner of each card as
  it scrolls into view — green for a good deal, blue for a qualifying
  deal, grey for "not enough signal to price confidently", red for an
  error. Badges are cached per item and requests are throttled (roughly
  3/second) so scrolling fast doesn't hammer your API usage.

Grid badges only see the title, price, and thumbnail Vinted shows on the
card itself (no full description), so they're noisier than the full
listing page — treat a green badge on a grid as "worth opening", not as
final. The full listing panel has more text to work with and is more
reliable.

## Optional: lock down your API

Anyone with your deployed app's URL can currently hit `/api/estimate` and
`/api/capture`, which will spend your PriceCharting/PokéWallet and
Anthropic usage. If that matters to you, set an environment variable on
your Vercel project:

```
EXTENSION_API_TOKEN=some-long-random-string
```

...and put the same string in the extension's "API token" field. Requests
without a matching `X-API-Token` header will be rejected with 401. This
only currently protects `/api/estimate` — `/api/capture` and the rest of
the app are unauthenticated, per the main README.

## Uninstalling / disabling

Turn it off any time from `chrome://extensions`, or just leave the app URL
field empty in settings — the content script does nothing until it's
configured.
