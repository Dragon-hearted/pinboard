import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT } from "../theme";

const ImagePlaceholder = ({
  delay,
  label,
  color,
}: {
  delay: number;
  label: string;
  color: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, delay, config: { damping: 15 } });
  const scale = interpolate(s, [0, 1], [0.5, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width: 160,
        height: 160,
        borderRadius: 12,
        backgroundColor: color,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${scale})`,
        opacity,
        border: `1px solid rgba(255,255,255,0.1)`,
      }}
    >
      <div style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

export const UploadScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headingY = interpolate(frame, [0, 25], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Drop zone animation
  const dropZoneScale = spring({ frame, fps, delay: 10, config: { damping: 200 } });
  const borderDash = interpolate(frame, [0, 180], [0, 200]);

  // Pulsing dashed border
  const borderOpacity = interpolate(
    frame,
    [30, 60, 90, 120],
    [0.3, 0.6, 0.3, 0.6],
    { extrapolateRight: "clamp" }
  );

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
        Reference Images
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          opacity: fadeIn,
          transform: `translateY(${headingY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.textPrimary,
          }}
        >
          Upload Reference Images
        </div>

        {/* Drop zone */}
        <div
          style={{
            width: 700,
            height: 300,
            borderRadius: 16,
            border: `2px dashed rgba(224,122,95,${borderOpacity})`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 30,
            transform: `scale(${interpolate(dropZoneScale, [0, 1], [0.95, 1])})`,
            backgroundColor: "rgba(224,122,95,0.04)",
          }}
        >
          {/* Upload icon */}
          <div
            style={{
              opacity: interpolate(frame, [20, 40], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div style={{ fontSize: 20, color: COLORS.textSubtle }}>
            Drag & drop your images here
          </div>

          {/* Images appearing */}
          <div style={{ display: "flex", gap: 16 }}>
            <ImagePlaceholder delay={40} label="ref_1.jpg" color="rgba(125,155,130,0.3)" />
            <ImagePlaceholder delay={55} label="ref_2.jpg" color="rgba(224,122,95,0.2)" />
            <ImagePlaceholder delay={70} label="ref_3.jpg" color="rgba(125,155,130,0.2)" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
