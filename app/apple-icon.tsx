import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#14131B",
          borderRadius: 40,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          padding: 24,
          gap: 12,
        }}
      >
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "#FF4F14" }} />
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "#4747F2" }} />
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "#FFCD77" }} />
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "#00BA9E" }} />
      </div>
    ),
    { ...size }
  );
}
