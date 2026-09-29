import { ImageResponse } from "next/og";
import { getLga } from "@/lib/queries";
import { codeForState, stateGeo } from "@/lib/geo";
import { stateLabel } from "@/lib/ngTiles";

export const alt = "Local government area on AskLGA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for an LGA: its name and state beside the state map with the LGA filled in. */
export default async function Image({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  const code = row ? codeForState(row.state) : null;
  const g = code ? stateGeo(code) : null;
  let map: string | null = null;
  if (g) {
    const [w, h] = g.box;
    const paths = Object.entries(g.lgas)
      .map(([id, d]) => `<path d="${d}" fill="${id === lga ? "#5fd08f" : "#1f4a35"}" stroke="#0c2a1c" stroke-width="1.2"/>`)
      .join("");
    map = `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${w + 8} ${h + 8}">${paths}</svg>`).toString("base64")}`;
  }
  const name = row?.name ?? "Local government";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0c2a1c", color: "#fff", display: "flex", padding: 64, gap: 48 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#b8cbbf" }}>AskLGA</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 28, color: "#b8cbbf" }}>{row ? stateLabel(row.state) : "Nigeria"}</div>
            <div style={{ fontSize: name.length > 18 ? 64 : 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{name}</div>
            <div style={{ fontSize: 28, color: "#dfe9e2", maxWidth: 560 }}>Ask a question in five languages. See its money, services and projects, with sources.</div>
          </div>
        </div>
        {map ? (
          <div style={{ width: 460, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={map} width={Math.round(g!.box[0] * Math.min(440 / g!.box[0], 500 / g!.box[1]))} height={Math.round(g!.box[1] * Math.min(440 / g!.box[0], 500 / g!.box[1]))} alt="" />
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}
