import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT } from "../theme";

const TechBadge = ({
  name,
  delay,
  color,
}: {
  name: string;
  delay: number;
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
        padding: "12px 24px",
        borderRadius: 10,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}40`,
        color,
        fontSize: 18,
        fontWeight: 600,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {name}
    </div>
  );
};

export const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // CTA button animation
  const ctaSpring = spring({ frame, fps, delay: 60, config: { damping: 15 } });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.8, 1]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

  // Pulse effect on CTA
  const pulseFrame = frame - 90;
  const pulse =
    pulseFrame > 0
      ? interpolate(
          pulseFrame % 60,
          [0, 30, 60],
          [1, 1.03, 1],
          { extrapolateRight: "clamp" }
        )
      : 1;

  // Gradient animation
  const gradientPos = interpolate(frame, [0, 180], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${50 + gradientPos * 0.15}% ${50 - gradientPos * 0.1}%, ${COLORS.bgLight} 0%, ${COLORS.bgDeepest} 70%)`,
        fontFamily: FONT,
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          opacity: fadeIn,
        }}
      >
        {/* Built with */}
        <div
          style={{
            fontSize: 16,
            color: COLORS.textSubtle,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase",
            transform: `translateY(${interpolate(frame, [0, 25], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          Built With
        </div>

        {/* Tech stack badges */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <TechBadge name="Bun" delay={10} color={COLORS.accent} />
          <TechBadge name="React" delay={18} color="#61DAFB" />
          <TechBadge name="Hono" delay={26} color={COLORS.accent} />
          <TechBadge name="SQLite" delay={34} color={COLORS.sage} />
          <TechBadge name="TypeScript" delay={42} color="#3178C6" />
        </div>

        {/* Divider */}
        <div
          style={{
            width: interpolate(frame, [40, 70], [0, 120], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            height: 2,
            backgroundColor: COLORS.accent,
            borderRadius: 1,
            opacity: 0.5,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.textPrimary,
            letterSpacing: -1,
          }}
        >
          Pinboard
        </div>

        {/* CTA Button */}
        <div
          style={{
            padding: "18px 48px",
            borderRadius: 12,
            backgroundColor: COLORS.accent,
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
            transform: `scale(${ctaScale * pulse})`,
            opacity: ctaOpacity,
            boxShadow: "0 4px 24px rgba(224,122,95,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* GitHub icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Get Started
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 18,
            color: COLORS.textSubtle,
            marginTop: 8,
            opacity: interpolate(frame, [80, 100], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Open source · Self-hosted · No API keys required to start
        </div>
      </div>
    </AbsoluteFill>
  );
};
