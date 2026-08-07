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
          background: "#14131B",
          borderRadius: 9,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          padding: 4,
          gap: 2,
        }}
      >
        <div style={{ width: 11, height: 11, borderRadius: 3, background: "#FF4F14" }} />
        <div style={{ width: 11, height: 11, borderRadius: 3, background: "#4747F2" }} />
        <div style={{ width: 11, height: 11, borderRadius: 3, background: "#FFCD77" }} />
        <div style={{ width: 11, height: 11, borderRadius: 3, background: "#00BA9E" }} />
      </div>
    ),
    { ...size }
  );
}
