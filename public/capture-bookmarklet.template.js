/**
 * PokéDeals capture bookmarklet.
 *
 * Runs entirely in the browser, on a page you're already viewing after
 * logging in and navigating there yourself — it reads the rendered DOM of
 * the current tab and sends one HTTP request. It does not poll, does not
 * run unattended, and does not touch Vinted's authentication or rate
 * limits, which is the point: it's a manual "save this listing" action,
 * not automation.
 *
 * Vinted's markup can change at any time, so the selectors below are
 * best-effort. When something can't be found, the bookmarklet asks you to
 * confirm or fill it in rather than guessing.
 */
(function () {
  const APP_URL = "__APP_URL__"; // replaced with your deployed app's URL when generating the link

  function meta(name) {
    const el =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute("content") : null;
  }

  function extractItemId() {
    const match = window.location.pathname.match(/\/items\/(\d+)/);
    return match ? match[1] : null;
  }

  function extractPriceMinor() {
    // Try structured price meta tags first (product:price:amount is a
    // common Open Graph extension), then fall back to scanning visible
    // text for a currency amount.
    const metaPrice = meta("product:price:amount") || meta("og:price:amount");
    if (metaPrice) return Math.round(parseFloat(metaPrice) * 100);

    const bodyText = document.body.innerText;
    const match = bodyText.match(/£\s?(\d+(?:[.,]\d{2})?)/);
    if (match) return Math.round(parseFloat(match[1].replace(",", ".")) * 100);
    return null;
  }

  function extractImages() {
    const og = meta("og:image");
    const images = new Set();
    if (og) images.add(og);
    document.querySelectorAll('img[src*="vinted"]').forEach((img) => {
      if (img.src && img.naturalWidth > 200) images.add(img.src);
    });
    return Array.from(images).slice(0, 5);
  }

  const itemId = extractItemId();
  if (!itemId) {
    alert("PokéDeals: this doesn't look like a Vinted item page.");
    return;
  }

  const title = meta("og:title") || document.title;
  const description = meta("og:description") || "";
  let priceMinor = extractPriceMinor();

  if (priceMinor == null) {
    const entered = prompt("Couldn't detect the price automatically. Enter it in £ (e.g. 12.50):");
    if (!entered) return;
    priceMinor = Math.round(parseFloat(entered) * 100);
  }

  const confirmedTitle = prompt("Confirm/edit the listing title:", title);
  if (confirmedTitle === null) return;

  const payload = {
    externalId: itemId,
    url: window.location.href.split("?")[0],
    title: confirmedTitle,
    description,
    priceMinor,
    images: extractImages(),
  };

  fetch(`${APP_URL}/api/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((result) => {
      if (result.error) {
        alert("PokéDeals: capture failed — " + JSON.stringify(result.error));
        return;
      }
      const go = confirm(
        `Captured! Status: ${result.status}${result.tier ? " (" + result.tier + ")" : ""}.\n\nOpen your dashboard?`
      );
      if (go) window.open(`${APP_URL}/deal/${result.dealId}`, "_blank");
    })
    .catch((err) => alert("PokéDeals: network error — " + err.message));
})();
