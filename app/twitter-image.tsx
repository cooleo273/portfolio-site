import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name}, fullstack developer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0D0A",
          padding: 72,
          color: "#EDEFE8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#8A9180" }}>
          <div style={{ display: "flex" }}>leul.dev</div>
          <div style={{ width: 16, height: 30, background: "#C6F432" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 112, fontWeight: 700, lineHeight: 0.95, letterSpacing: -4 }}>
          <div style={{ display: "flex" }}>Leul Teferi</div>
          <div style={{ display: "flex", color: "#C6F432" }}>Tadesse.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 28, color: "#B4BAAA" }}>
          <div style={{ display: "flex", maxWidth: 760 }}>
            Fullstack developer. Web apps end to end, mobile apps fast with FlutterFlow.
          </div>
          <div
            style={{
              display: "flex",
              border: "2px solid #2A3124",
              borderRadius: 999,
              padding: "12px 24px",
              color: "#C6F432",
              fontSize: 22,
            }}
          >
            01 / portfolio
          </div>
        </div>
      </div>
    ),
    size,
  );
}
