import { ImageResponse } from "next/og";

export const alt = "AskLGA: ask your local government, get the official answer and the record behind it";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for the home page: the headline on the dark band, with the 3x3 mark. */
export default function Image() {
  const cells = [0, 1, 2];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0c2a1c", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", width: 64, height: 64, gap: 8, padding: 6, background: "#133a28", borderRadius: 10 }}>
            {cells.flatMap((r) => cells.map((c) => <div key={`${r}${c}`} style={{ width: 12, height: 12, borderRadius: 3, background: r === 0 && c === 2 ? "#5fd08f" : "#3f6a55" }} />))}
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>AskLGA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>Ask your local government. Get the official answer.</div>
          <div style={{ fontSize: 30, color: "#b8cbbf", maxWidth: 960 }}>All 774 local government areas. Five languages. The source on every answer.</div>
        </div>
      </div>
    ),
    size,
  );
}
