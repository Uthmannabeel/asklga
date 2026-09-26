"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = { id: string; name: string; lat: number; lng: number; status?: string; href: string };

const COLOR: Record<string, string> = {
  completed: "#008751",
  ongoing: "#1e6b3c",
  planned: "#5f6a62",
  stalled: "#9a6b12",
  unknown: "#9a6b12",
  abandoned: "#9b2c2c",
};

/** Leaflet map with OpenStreetMap tiles. Loaded only on pages that need it, to keep the portal light. */
export function ProjectMap({ points, center, zoom = 12, height = 360 }: { points: MapPoint[]; center: [number, number]; zoom?: number; height?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const key = JSON.stringify({ points, center, zoom });

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(center, zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], { radius: 7, color: COLOR[p.status ?? "unknown"] ?? "#1e6b3c", weight: 2, fillOpacity: 0.7 })
          .addTo(map)
          .bindPopup(`<a href="${p.href}">${p.name}</a><br><span>${p.id}${p.status ? " · " + p.status : ""}</span>`);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={ref} style={{ height, borderRadius: 2, border: "1px solid var(--rule)" }} role="region" aria-label="Map of records" />;
}
