import React from "react";

// A drawn macOS-style cursor we tween. (x, y) is the hotspot: the arrow tip,
// or the center of the I-beam.
export const Cursor: React.FC<{
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
  variant?: "arrow" | "ibeam";
}> = ({ x, y, scale = 1, opacity = 1, variant = "arrow" }) => {
  if (variant === "ibeam") {
    return (
      <div
        style={{
          position: "absolute",
          left: x - 9,
          top: y - 13,
          width: 18,
          height: 26,
          opacity,
          transform: `scale(${scale})`,
          transformOrigin: "9px 13px",
          zIndex: 900,
          filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.4))",
          pointerEvents: "none",
        }}
      >
        <svg width="18" height="26" viewBox="0 0 18 26">
          <g stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" fill="none">
            <path d="M4 2.5h10M4 23.5h10M9 2.5v21" />
          </g>
          <g stroke="#111111" strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M4 2.5h10M4 23.5h10M9 2.5v21" />
          </g>
        </svg>
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x - 6,
        top: y - 4,
        width: 26,
        height: 30,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "6px 4px",
        zIndex: 900,
        filter: "drop-shadow(0 1.5px 2.5px rgba(0,0,0,0.35))",
        pointerEvents: "none",
      }}
    >
      <svg width="26" height="30" viewBox="0 0 26 30">
        <path
          d="M6 4 L6 22.6 L10.6 18.4 L13.5 25.1 L16.9 23.6 L14 17.1 L20.2 17.1 Z"
          fill="#141414"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
