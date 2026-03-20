import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT } from "../theme";

export const GenerationScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Three panel layout animation
  const panel1 = spring({ frame, fps, delay: 15, config: { damping: 200 } });
  const panel2 = spring({ frame, fps, delay: 25, config: { damping: 200 } });
  const panel3 = spring({ frame, fps, delay: 35, config: { damping: 200 } });

  // Generation progress
  const isGenerating = frame > 50 && frame < 120;
  const progressWidth = interpolate(frame, [50, 120], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Result reveal
  const resultReveal = spring({ frame, fps, delay: 120, config: { damping: 200 } });
  const resultScale = interpolate(resultReveal, [0, 1], [0.95, 1]);
  const resultOpacity = interpolate(resultReveal, [0, 1], [0, 1]);

  // Shimmer effect during generation
  const shimmerX = interpolate(frame, [50, 120], [-100, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgDeepest} 0%, ${COLORS.bgMid} 100%)`,
        fontFamily: FONT,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
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
        Generation
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          opacity: fadeIn,
          width: "100%",
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
          Generate in Real-Time
        </div>

        {/* 3-panel layout */}
        <div style={{ display: "flex", gap: 20, width: "100%" }}>
          {/* Left panel - References */}
          <div
            style={{
              flex: 1,
              height: 400,
              borderRadius: 12,
              backgroundColor: COLORS.bgLight,
              border: `1px solid ${COLORS.border}`,
              padding: 20,
              opacity: panel1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: COLORS.textSubtle, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
              References
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 90,
                  borderRadius: 8,
                  backgroundColor: `rgba(125,155,130,${0.1 + i * 0.05})`,
                  border: `1px solid ${COLORS.border}`,
                }}
              />
            ))}
          </div>

          {/* Center panel - Canvas */}
          <div
            style={{
              flex: 2,
              height: 400,
              borderRadius: 12,
              backgroundColor: COLORS.bgLight,
              border: `1px solid ${COLORS.border}`,
              padding: 20,
              opacity: panel2,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 14, color: COLORS.textSubtle, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
              Canvas
            </div>

            {/* Canvas area */}
            <div
              style={{
                flex: 1,
                borderRadius: 8,
                backgroundColor: COLORS.bgDeepest,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Generating state */}
              {isGenerating && (
                <>
                  {/* Shimmer */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(90deg, transparent ${shimmerX - 100}%, rgba(224,122,95,0.08) ${shimmerX}%, transparent ${shimmerX + 100}%)`,
                    }}
                  />
                  {/* Centered spinner text */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: 18,
                      color: COLORS.accent,
                      fontWeight: 500,
                    }}
                  >
                    Generating...
                  </div>
                </>
              )}

              {/* Result */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: resultOpacity,
                  transform: `scale(${resultScale})`,
                  background: `linear-gradient(135deg, rgba(125,155,130,0.3) 0%, rgba(224,122,95,0.2) 50%, rgba(139,126,200,0.2) 100%)`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    color: COLORS.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  Generated Image
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {isGenerating && (
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: "rgba(224,122,95,0.2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressWidth}%`,
                    backgroundColor: COLORS.accent,
                    borderRadius: 2,
                  }}
                />
              </div>
            )}
          </div>

          {/* Right panel - Settings */}
          <div
            style={{
              flex: 1,
              height: 400,
              borderRadius: 12,
              backgroundColor: COLORS.bgLight,
              border: `1px solid ${COLORS.border}`,
              padding: 20,
              opacity: panel3,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 14, color: COLORS.textSubtle, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
              Settings
            </div>
            {["Model", "Size", "Steps", "Guidance"].map((label) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 13, color: COLORS.textSubtle }}>{label}</div>
                <div
                  style={{
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: COLORS.bgDeepest,
                    border: `1px solid ${COLORS.border}`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
