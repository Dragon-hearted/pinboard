import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT } from "../theme";

const ModelCard = ({
  name,
  description,
  delay,
  accent,
}: {
  name: string;
  description: string;
  delay: number;
  accent: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, delay, config: { damping: 15, stiffness: 120 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  // Hover-like glow effect at staggered times
  const glowFrame = frame - delay - 30;
  const glow =
    glowFrame > 0
      ? interpolate(glowFrame, [0, 20, 40], [0, 0.4, 0.15], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <div
      style={{
        width: 260,
        padding: 32,
        borderRadius: 16,
        backgroundColor: COLORS.bgLight,
        border: `1px solid ${accent}33`,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        transform: `translateY(${y}px)`,
        opacity,
        boxShadow: `0 0 40px ${accent}${Math.round(glow * 255)
          .toString(16)
          .padStart(2, "0")}`,
      }}
    >
      {/* Model icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: `${accent}20`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: accent,
          }}
        />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary }}>
        {name}
      </div>
      <div style={{ fontSize: 16, color: COLORS.textSubtle, lineHeight: 1.5 }}>
        {description}
      </div>
      {/* Status badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: COLORS.sage,
          }}
        />
        <span style={{ fontSize: 14, color: COLORS.sage }}>Available</span>
      </div>
    </div>
  );
};

export const MultiModelScene = () => {
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
        Multi-Model Support
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 50,
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
          Choose Your Model
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <ModelCard
            name="NanoBanana Pro"
            description="High-quality with reference image support"
            delay={15}
            accent={COLORS.accent}
          />
          <ModelCard
            name="SDXL"
            description="Fast, versatile open-source generation"
            delay={25}
            accent={COLORS.sage}
          />
          <ModelCard
            name="FLUX Pro"
            description="Cutting-edge photorealistic output"
            delay={35}
            accent="#8B7EC8"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
