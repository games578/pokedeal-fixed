/**
 * Content scripts run in the page's own origin, so their fetches are
 * bound by Vinted's CORS policy. The service worker has its own
 * principal, so — once the user has granted host permission for their
 * deployed app's origin via the options page — it can call /api/estimate
 * cross-origin without needing Vinted or the app to add CORS headers for
 * this extension specifically.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "POKEDEALS_ESTIMATE") return false;

  (async () => {
    try {
      const { appUrl, apiToken } = await chrome.storage.sync.get(["appUrl", "apiToken"]);
      if (!appUrl) {
        sendResponse({ error: "not_configured" });
        return;
      }

      const headers = { "Content-Type": "application/json" };
      if (apiToken) headers["X-API-Token"] = apiToken;

      const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/estimate`, {
        method: "POST",
        headers,
        body: JSON.stringify(message.payload),
      });

      if (!res.ok) {
        sendResponse({ error: `http_${res.status}` });
        return;
      }

      const data = await res.json();
      sendResponse({ data });
    } catch (err) {
      sendResponse({ error: String(err && err.message ? err.message : err) });
    }
  })();

  return true; // keep the message channel open for the async response
});
