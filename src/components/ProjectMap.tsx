"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { statusLabel } from "./StatusMark";

export type MapPoint = { id: string; name: string; lat: number; lng: number; status?: string; href: string };

const COLOR: Record<string, string> = {
  completed: "#008751",
  ongoing: "#1e6b3c",
  planned: "#5f6a62",
  stalled: "#9a6b12",
  unknown: "#9a6b12",
  abandoned: "#9b2c2c",
};

const LEGEND: [string, string][] = [
  ["completed", "Completed"],
  ["ongoing", "In progress"],
  ["planned", "Planned"],
  ["stalled", "Stalled or unknown"],
  ["abandoned", "Abandoned"],
];

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/**
 * Leaflet map with OpenStreetMap tiles. Loaded only on pages that need it, to keep the portal
 * light. On touch screens one-finger drag scrolls the page, not the map, so a phone user is not
 * trapped inside it; two fingers pan and zoom.
 */
export function ProjectMap({ points, center, zoom = 12, height = 360, legend = true }: { points: MapPoint[]; center: [number, number]; zoom?: number; height?: number; legend?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const key = JSON.stringify({ points, center, zoom });

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      map = L.map(ref.current, { scrollWheelZoom: false, dragging: !coarse }).setView(center, zoom);
      if (coarse) {
        // Let two-finger gestures pan/zoom; one finger scrolls the page.
        map.on("touchstart" as never, (e: unknown) => {
          const ev = e as { originalEvent?: TouchEvent };
          if (ev.originalEvent && ev.originalEvent.touches.length > 1) map?.dragging.enable();
        });
        map.on("touchend" as never, () => map?.dragging.disable());
      }
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      for (const p of points) {
        const label = p.status ? statusLabel(p.status) : "";
        L.circleMarker([p.lat, p.lng], { radius: 7, color: COLOR[p.status ?? "unknown"] ?? "#1e6b3c", weight: 2, fillOpacity: 0.7 })
          .addTo(map)
          .bindPopup(`<a href="${escapeHtml(p.href)}">${escapeHtml(p.name)}</a><br><span>${escapeHtml(p.id)}${label ? " · " + escapeHtml(label) : ""}</span>`);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="grid gap-1">
      <div ref={ref} style={{ height, borderRadius: 2, border: "1px solid var(--rule)" }} role="region" aria-label="Map of records" />
      {legend ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 small muted" aria-label="Map key">
          {LEGEND.map(([k, l]) => (
            <li key={k} className="flex items-center gap-1">
              <span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: COLOR[k], opacity: 0.85 }} />
              {l}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
