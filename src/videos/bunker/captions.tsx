// One or two words at a time, hard-cut to the voice. Groups live in words.json.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import groups from "./words.json";

type G = { t: string; a: number; b: number };

export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const time = f / 30;
  const g = (groups as G[]).find((x) => time >= x.a && time < x.b);
  if (!g) return null;
  const size = Math.round(height * 0.052);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: "6%", right: "6%", top: "68%",
        textAlign: "center", color: "#ffffff",
        fontFamily: '"Noto Sans", "DejaVu Sans", sans-serif',
        fontWeight: 800, fontSize: size, lineHeight: 1.05,
        letterSpacing: 0.4, textTransform: "uppercase",
        WebkitTextStroke: `${Math.max(2, height * 0.004)}px #0b0a0c`,
        paintOrder: "stroke fill",
        textShadow: "0 3px 0 #0b0a0c",
      }}>{g.t}</div>
    </AbsoluteFill>
  );
};
