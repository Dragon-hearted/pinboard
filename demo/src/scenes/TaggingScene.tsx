import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT } from "../theme";

export const TaggingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Typewriter effect for the prompt
  const fullPrompt = "A serene landscape with @1 style lighting and @2 color palette, cinematic composition";
  const charCount = Math.floor(
    interpolate(frame, [30, 120], [0, fullPrompt.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const displayedPrompt = fullPrompt.slice(0, charCount);

  // Cursor blink
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  // Autocomplete dropdown
  const showAutocomplete = frame > 80 && frame < 140;
  const autocompleteOpacity = showAutocomplete
    ? interpolate(frame, [80, 90], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const autocompleteY = showAutocomplete
    ? interpolate(frame, [80, 90], [10, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 10;

  // Tag badges
  const tag1Opacity = spring({ frame, fps, delay: 50, config: { damping: 200 } });
  const tag2Opacity = spring({ frame, fps, delay: 90, config: { damping: 200 } });

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
        Smart Tagging
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          opacity: fadeIn,
          width: "100%",
          maxWidth: 900,
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
          @-Tag Your References
        </div>

        {/* Tags row */}
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor: "rgba(125,155,130,0.2)",
              border: `1px solid ${COLORS.sage}`,
              color: COLORS.sage,
              fontSize: 16,
              fontWeight: 500,
              opacity: tag1Opacity,
              transform: `scale(${interpolate(tag1Opacity, [0, 1], [0.8, 1])})`,
            }}
          >
            @1 — ref_1.jpg
          </div>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor: "rgba(224,122,95,0.15)",
              border: `1px solid ${COLORS.accent}`,
              color: COLORS.accent,
              fontSize: 16,
              fontWeight: 500,
              opacity: tag2Opacity,
              transform: `scale(${interpolate(tag2Opacity, [0, 1], [0.8, 1])})`,
            }}
          >
            @2 — ref_2.jpg
          </div>
        </div>

        {/* Prompt textarea mockup */}
        <div
          style={{
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              minHeight: 120,
              borderRadius: 12,
              backgroundColor: COLORS.bgLight,
              border: `1px solid ${COLORS.border}`,
              padding: 24,
              fontSize: 20,
              color: COLORS.textPrimary,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {displayedPrompt.split(/(@[12])/).map((part, i) => {
              if (part === "@1")
                return (
                  <span key={i} style={{ color: COLORS.sage, fontWeight: 600 }}>
                    {part}
                  </span>
                );
              if (part === "@2")
                return (
                  <span key={i} style={{ color: COLORS.accent, fontWeight: 600 }}>
                    {part}
                  </span>
                );
              return <span key={i}>{part}</span>;
            })}
            {cursorVisible && charCount < fullPrompt.length && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 24,
                  backgroundColor: COLORS.accent,
                  marginLeft: 2,
                  verticalAlign: "text-bottom",
                }}
              />
            )}
          </div>

          {/* Autocomplete dropdown */}
          <div
            style={{
              position: "absolute",
              bottom: -80,
              left: 24,
              backgroundColor: COLORS.bgLight,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 8,
              opacity: autocompleteOpacity,
              transform: `translateY(${autocompleteY}px)`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                backgroundColor: "rgba(224,122,95,0.15)",
                color: COLORS.textPrimary,
                fontSize: 16,
              }}
            >
              <span style={{ color: COLORS.accent }}>@2</span> — ref_2.jpg
            </div>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                color: COLORS.textSecondary,
                fontSize: 16,
                marginTop: 4,
              }}
            >
              <span style={{ color: COLORS.sage }}>@3</span> — ref_3.jpg
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
