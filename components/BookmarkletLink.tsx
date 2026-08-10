"use client";

import { useEffect, useState } from "react";

export function BookmarkletLink() {
  const [href, setHref] = useState<string>("");

  useEffect(() => {
    fetch("/capture-bookmarklet.template.js")
      .then((r) => r.text())
      .then((source) => {
        const withOrigin = source.replace("__APP_URL__", window.location.origin);
        setHref(`javascript:${encodeURIComponent(withOrigin)}`);
      });
  }, []);

  return (
    <a
      href={href}
      onClick={(e) => {
        // Bookmarklets must be dragged to the bookmarks bar, not clicked
        // here (clicking would try to navigate this page's own tab).
        e.preventDefault();
        alert("Drag this button to your bookmarks bar rather than clicking it.");
      }}
      draggable
      className="inline-flex items-center gap-2 rounded-md foil-edge px-4 py-2 text-sm font-medium text-bg cursor-grab active:cursor-grabbing"
    >
      ⬇ Capture to PokéDeals
    </a>
  );
}
