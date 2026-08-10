const appUrlEl = document.getElementById("appUrl");
const apiTokenEl = document.getElementById("apiToken");
const gridEnabledEl = document.getElementById("gridEnabled");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");

chrome.storage.sync.get(["appUrl", "apiToken", "gridEnabled"], (cfg) => {
  if (cfg.appUrl) appUrlEl.value = cfg.appUrl;
  if (cfg.apiToken) apiTokenEl.value = cfg.apiToken;
  gridEnabledEl.checked = cfg.gridEnabled !== false;
});

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.className = isError ? "error" : "";
}

saveBtn.addEventListener("click", async () => {
  let appUrl = appUrlEl.value.trim().replace(/\/+$/, "");
  if (!appUrl) {
    setStatus("Enter your app's URL first.", true);
    return;
  }
  if (!/^https?:\/\//.test(appUrl)) appUrl = `https://${appUrl}`;

  let origin;
  try {
    origin = new URL(appUrl).origin + "/*";
  } catch {
    setStatus("That doesn't look like a valid URL.", true);
    return;
  }

  // Request permission to talk to this specific origin from the
  // background worker. Only asked once per origin — Chrome remembers it.
  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) {
    setStatus("Permission needed to connect — try again.", true);
    return;
  }

  await chrome.storage.sync.set({
    appUrl,
    apiToken: apiTokenEl.value.trim(),
    gridEnabled: gridEnabledEl.checked,
  });

  setStatus("Saved. Reload any open Vinted tabs to apply.");
});
