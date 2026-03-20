import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT } from "../theme";

const HistoryItem = ({
  delay,
  model,
  time,
  color,
  id,
}: {
  delay: number;
  model: string;
  time: string;
  color: string;
  id: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, delay, config: { damping: 200 } });
  const x = interpolate(s, [0, 1], [-40, 0]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.bgLight,
        border: `1px solid ${COLORS.border}`,
        transform: `translateX(${x}px)`,
        opacity,
        width: 500,
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          backgroundColor: `${color}30`,
          border: `1px solid ${color}50`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 16, color: COLORS.textPrimary, fontWeight: 600 }}>
          Generation #{id}
        </div>
        <div style={{ fontSize: 13, color: COLORS.textSubtle }}>
          {model} · {time}
        </div>
      </div>
      {/* Status */}
      <div
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          backgroundColor: "rgba(125,155,130,0.15)",
          color: COLORS.sage,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Complete
      </div>
    </div>
  );
};

export const HistoryScene = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgDeepest} 0%, ${COLORS.bgMid} 100%)`,
        fontFamily: FONT,
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
      }}
    >
      {/* Scene label */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          fontSize: 16,
          color: COLORS.accent,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: fadeIn,
        }}
      >
        History
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.textPrimary,
            transform: `translateY(${interpolate(frame, [0, 25], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          Generation History
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <HistoryItem delay={15} model="NanoBanana Pro" time="2s ago" color={COLORS.accent} id={847} />
          <HistoryItem delay={25} model="FLUX Pro" time="15s ago" color="#8B7EC8" id={831} />
          <HistoryItem delay={35} model="SDXL" time="32s ago" color={COLORS.sage} id={819} />
          <HistoryItem delay={45} model="NanoBanana Pro" time="1m ago" color={COLORS.accent} id={804} />
          <HistoryItem delay={55} model="FLUX Pro" time="2m ago" color="#8B7EC8" id={792} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
