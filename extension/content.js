/**
 * PokéDeals profit overlay.
 *
 * Same idea as the /connect bookmarklet in the main app: this only reads
 * the DOM of pages you're already viewing in your own logged-in session
 * and never talks to Vinted directly. It doesn't call any Vinted API, so
 * it isn't bypassing rate limits or anti-bot protections — the only
 * network call it makes is to your own deployed PokéDeals app.
 *
 * Vinted's markup changes over time and differs slightly by locale, so
 * every extractor below is best-effort with fallbacks. If badges stop
 * appearing, the selectors in `extractFromCard` / extractItemPage below
 * are the first place to check and adjust.
 */

(function () {
  const state = {
    appUrl: null,
    apiToken: null,
    gridEnabled: true,
    cache: new Map(), // itemId -> result
    inFlight: new Set(),
    queue: [],
    processing: false,
  };

  chrome.storage.sync.get(["appUrl", "apiToken", "gridEnabled"], (cfg) => {
    state.appUrl = cfg.appUrl || null;
    state.apiToken = cfg.apiToken || null;
    state.gridEnabled = cfg.gridEnabled !== false;
    if (!state.appUrl) return; // not configured yet — do nothing
    boot();
  });

  function boot() {
    if (isItemPage()) {
      runItemPage();
    } else {
      runGridPage();
    }
  }

  // ---------------------------------------------------------------------
  // Shared: talk to the extension's background worker, which does the
  // actual cross-origin fetch to your deployed app.
  // ---------------------------------------------------------------------
  function requestEstimate(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "POKEDEALS_ESTIMATE", payload }, (response) => {
        resolve(response || { error: "no_response" });
      });
    });
  }

  function meta(name) {
    const el =
      document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute("content") : null;
  }

  function parsePriceMinor(text) {
    if (!text) return null;
    const match = text.match(/£\s?(\d+(?:[.,]\d{2})?)/);
    if (!match) return null;
    return Math.round(parseFloat(match[1].replace(",", ".")) * 100);
  }

  // ---------------------------------------------------------------------
  // Single listing page: /items/12345-whatever
  // ---------------------------------------------------------------------
  function isItemPage() {
    return /\/items\/\d+/.test(window.location.pathname);
  }

  async function runItemPage() {
    const title = meta("og:title") || document.title;
    const description = meta("og:description") || "";
    const priceMinor = parsePriceMinor(meta("product:price:amount") ? `£${meta("product:price:amount")}` : null) ??
      parsePriceMinor(document.body.innerText);
    if (priceMinor == null || !title) return;

    const images = [];
    const og = meta("og:image");
    if (og) images.push(og);
    document.querySelectorAll('img[src*="vinted"]').forEach((img) => {
      if (img.src && img.naturalWidth > 200 && images.length < 5) images.push(img.src);
    });

    const panel = renderPanel();
    const response = await requestEstimate({ title, description, priceMinor, images });
    updatePanel(panel, response);
  }

  function renderPanel() {
    const el = document.createElement("div");
    el.className = "pd-panel";
    el.innerHTML = `
      <div class="pd-panel__title">
        <span>PokéDeals estimate</span>
        <span class="pd-panel__close" title="Dismiss">✕</span>
      </div>
      <div class="pd-panel__body">Estimating…</div>
    `;
    el.querySelector(".pd-panel__close").addEventListener("click", () => el.remove());
    document.body.appendChild(el);
    return el;
  }

  function updatePanel(panel, response) {
    const body = panel.querySelector(".pd-panel__body");
    if (!panel.isConnected) return;

    if (response.error === "not_configured") {
      body.innerHTML = `Set your app URL in the extension popup to enable estimates.`;
      return;
    }
    if (response.error) {
      body.innerHTML = `Couldn't reach PokéDeals (${escapeHtml(response.error)}).`;
      return;
    }

    const data = response.data;
    if (!data || data.status === "needs_review" || !data.profit) {
      body.innerHTML = `
        <div class="pd-panel__row">Not enough signal to price this one confidently.</div>
        <div class="pd-panel__row">${
          data && data.identification && data.identification.cardName
            ? `Best guess: ${escapeHtml(data.identification.cardName)}`
            : "Couldn't identify the card from title/photo."
        }</div>
      `;
      return;
    }

    const profitMinor = data.profit.estimatedProfitMinor;
    const sign = profitMinor >= 0 ? "+" : "-";
    body.innerHTML = `
      <div class="pd-panel__profit pd-panel__profit--${data.tier || data.status}">
        ${sign}£${Math.abs(profitMinor / 100).toFixed(2)}
      </div>
      <div class="pd-panel__row">${escapeHtml(data.identification.cardName || "Unidentified card")}${
      data.identification.setName ? " · " + escapeHtml(data.identification.setName) : ""
    }</div>
      <div class="pd-panel__row">Confidence: ${Math.round(data.identification.confidence * 100)}%</div>
      <div class="pd-panel__row">Assumes sale at ${escapeHtml(
        data.priceMatch ? data.priceMatch.productName : "matched"
      )} market price, fees already deducted.</div>
    `;
  }

  // ---------------------------------------------------------------------
  // Search / grid pages: badge each visible card as it scrolls into view.
  // ---------------------------------------------------------------------
  function runGridPage() {
    if (!state.gridEnabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            enqueueCard(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "200px" }
    );

    function scan() {
      findCardLinks().forEach((card) => {
        if (card.dataset.pdSeen) return;
        card.dataset.pdSeen = "1";
        observer.observe(card);
      });
    }

    scan();
    // Vinted grids load more cards via infinite scroll — watch for new ones.
    const mutationObserver = new MutationObserver(() => scan());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function findCardLinks() {
    // Every item card is (or wraps) an <a href="/items/...">. This is the
    // most stable hook across Vinted's locales/redesigns since the URL
    // pattern is functional, not styling-dependent.
    return Array.from(document.querySelectorAll('a[href*="/items/"]')).filter((a) => {
      // Skip the single big link on an actual item page, and skip links
      // that are clearly not grid tiles (e.g. plain text "view item" links
      // with no image inside).
      return a.querySelector("img") != null;
    });
  }

  function extractItemId(href) {
    const match = href.match(/\/items\/(\d+)/);
    return match ? match[1] : null;
  }

  function extractFromCard(card) {
    const href = card.getAttribute("href") || "";
    const itemId = extractItemId(href);
    if (!itemId) return null;

    const img = card.querySelector("img");
    const imageUrl = img ? img.src || img.getAttribute("data-src") : null;

    // Title: prefer alt text or aria-label (Vinted commonly sets these to
    // the item title for accessibility), fall back to any text node in
    // the card that isn't just the price.
    let title = (img && img.alt) || card.getAttribute("aria-label") || card.getAttribute("title");
    if (!title) {
      const text = card.textContent.replace(/\s+/g, " ").trim();
      title = text.replace(/£\s?\d+(?:[.,]\d{2})?/, "").trim();
    }
    if (!title) return null;

    const priceMinor = parsePriceMinor(card.textContent);
    if (priceMinor == null) return null;

    return { itemId, title, priceMinor, images: imageUrl ? [imageUrl] : [] };
  }

  function enqueueCard(card) {
    const extracted = extractFromCard(card);
    if (!extracted) return;

    const cached = state.cache.get(extracted.itemId);
    if (cached) {
      renderBadge(card, cached);
      return;
    }
    if (state.inFlight.has(extracted.itemId)) return;

    state.inFlight.add(extracted.itemId);
    renderBadge(card, { loading: true });
    state.queue.push({ card, extracted });
    pump();
  }

  // Simple throttle so a fast scroll through 50 cards doesn't fire 50
  // requests at once — one request every ~350ms, single-flight.
  function pump() {
    if (state.processing) return;
    state.processing = true;
    void drain();
  }

  async function drain() {
    while (state.queue.length) {
      const { card, extracted } = state.queue.shift();
      const response = await requestEstimate({
        title: extracted.title,
        priceMinor: extracted.priceMinor,
        images: extracted.images,
      });
      state.inFlight.delete(extracted.itemId);
      state.cache.set(extracted.itemId, response);
      if (card.isConnected) renderBadge(card, response);
      await sleep(350);
    }
    state.processing = false;
  }

  function renderBadge(card, response) {
    if (getComputedStyle(card).position === "static") {
      card.style.position = "relative";
    }
    let badge = card.querySelector(":scope > .pd-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "pd-badge";
      card.appendChild(badge);
    }

    if (response.loading) {
      badge.className = "pd-badge pd-badge--loading";
      badge.textContent = "…";
      return;
    }
    if (response.error) {
      badge.className = "pd-badge pd-badge--error";
      badge.textContent = response.error === "not_configured" ? "setup" : "err";
      return;
    }

    const data = response.data;
    if (!data || !data.profit) {
      badge.className = "pd-badge pd-badge--needs_review";
      badge.textContent = "?";
      return;
    }

    const profitMinor = data.profit.estimatedProfitMinor;
    badge.className = `pd-badge pd-badge--${data.tier || data.status}`;
    const sign = profitMinor >= 0 ? "+" : "-";
    badge.textContent = `${sign}£${Math.abs(profitMinor / 100).toFixed(0)}`;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
