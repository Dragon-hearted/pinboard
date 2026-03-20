import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT } from "../theme";

export const TitleScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(frame, [25, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [25, 50], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineWidth = interpolate(frame, [40, 70], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle gradient animation
  const gradientPos = interpolate(frame, [0, 150], [0, 100], {
    extrapolateRight: "clamp",
  });

  // Grain overlay opacity
  const grainOpacity = 0.03;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${50 + gradientPos * 0.2}% ${50 + gradientPos * 0.1}%, ${COLORS.bgLight} 0%, ${COLORS.bgDeepest} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      {/* Grain overlay */}
      <AbsoluteFill
        style={{
          opacity: grainOpacity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />

      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `1px solid ${COLORS.border}`,
          opacity: interpolate(frame, [10, 40], [0, 0.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${interpolate(frame, [10, 80], [0.8, 1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          border: `1px solid ${COLORS.border}`,
          opacity: interpolate(frame, [20, 50], [0, 0.3], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${interpolate(frame, [20, 90], [0.8, 1.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}
      />

      {/* Title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          transform: `scale(${interpolate(titleScale, [0, 1], [0.9, 1])})`,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: COLORS.textPrimary,
            letterSpacing: -2,
          }}
        >
          Pinboard
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            backgroundColor: COLORS.accent,
            borderRadius: 2,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: COLORS.textSecondary,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            marginTop: 10,
          }}
        >
          AI-Powered Image Generation
        </div>
      </div>

      {/* Small accent dot */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: COLORS.accent,
          opacity: interpolate(frame, [60, 80], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};
