import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fff",
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 22, color: "#14131B" }}>D</span>
      </div>
    ),
    { ...size }
  );
}
