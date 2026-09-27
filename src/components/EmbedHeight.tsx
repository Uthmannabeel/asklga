"use client";

import { useEffect } from "react";

/** Inside the widget iframe: tells the host page how tall the content is so the frame can grow. */
export function EmbedHeight() {
  useEffect(() => {
    if (window.parent === window) return;
    const post = () => {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ asklgaHeight: h }, "*");
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    window.addEventListener("load", post);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", post);
    };
  }, []);
  return null;
}
