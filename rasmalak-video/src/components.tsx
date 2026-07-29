import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadCairo } from '@remotion/google-fonts/Cairo';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { theme } from './theme';
import type { Locale } from './content';
import { isRTL } from './content';

const { fontFamily: cairo } = loadCairo();
const { fontFamily: inter } = loadInter();

export const fontFor = (locale: Locale) => (isRTL(locale) ? cairo : inter);

/**
 * Persistent, continuously drifting background. Rendered once at the top of the
 * composition (not per scene) so the soft glow keeps moving the whole video —
 * this is the base layer that stops the screen ever feeling frozen. Uses the
 * absolute frame, so it must live outside the scene <Series>.
 */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames; // 0 -> 1 across the whole video
  const gx = 50 + Math.sin(t * Math.PI * 2) * 18; // horizontal drift
  const gy = 8 + Math.cos(t * Math.PI * 2) * 8; // vertical drift
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgPage }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 95% at ${gx}% ${gy}%, ${theme.primaryLight} 0%, ${theme.bgPage} 58%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Thin progress bar pinned to the bottom — constant motion + a sense of pace. */
export const ProgressBar: React.FC<{ locale: Locale }> = ({ locale }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = interpolate(frame, [0, durationInFrames - 1], [0, 100], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
      <div style={{ height: 8, width: '100%', backgroundColor: 'rgba(45,106,79,0.10)' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: theme.primary,
            marginInlineStart: isRTL(locale) ? 'auto' : 0, // grow from the start edge
            marginInlineEnd: isRTL(locale) ? 0 : 'auto',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Small persistent brand mark in a top corner so the frame is never empty. */
export const CornerBrand: React.FC<{ locale: Locale; label: string }> = ({ locale, label }) => (
  <AbsoluteFill style={{ padding: 70, pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        top: 70,
        insetInlineEnd: 70,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: fontFor(locale),
        fontWeight: 700,
        fontSize: 26,
        color: theme.primary,
        opacity: 0.8,
        direction: isRTL(locale) ? 'rtl' : 'ltr',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: theme.primary,
          color: theme.inkInverse,
          fontSize: 18,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isRTL(locale) ? 'ر' : 'R'}
      </div>
      {label}
    </div>
  </AbsoluteFill>
);

/** Large brand wordmark (title/outro). */
export const BrandMark: React.FC<{ locale: Locale; label: string }> = ({ locale, label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontFamily: fontFor(locale),
      fontWeight: 700,
      fontSize: 34,
      color: theme.primary,
      direction: isRTL(locale) ? 'rtl' : 'ltr',
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.inkInverse,
        fontSize: 24,
        fontWeight: 800,
      }}
    >
      {isRTL(locale) ? 'ر' : 'R'}
    </div>
    {label}
  </div>
);

/**
 * Transparent per-scene shell. The background lives at the composition level, so
 * scenes only carry content and a fade-in/out envelope — as one scene fades out
 * and the next fades in, the shared background shows through, reading as a soft
 * dissolve rather than a hard cut. Requires durationInFrames to time the fade-out.
 */
export const SceneShell: React.FC<{
  locale: Locale;
  durationInFrames: number;
  justify?: React.CSSProperties['justifyContent'];
  pad?: number;
  children: React.ReactNode;
}> = ({ locale, durationInFrames, justify = 'center', pad = 140, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <AbsoluteFill
      style={{
        opacity,
        padding: pad,
        paddingBottom: pad + 30, // keep content clear of the progress bar
        direction: isRTL(locale) ? 'rtl' : 'ltr',
        fontFamily: fontFor(locale),
        color: theme.ink,
        justifyContent: justify,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Optional audio track (renders nothing until an MP3 name is supplied). Used for
 * both the voiceover and an optional low-volume music bed (pass loop + volume).
 */
export const AudioTrack: React.FC<{ src?: string; volume?: number; loop?: boolean }> = ({
  src,
  volume,
  loop,
}) => {
  if (!src) return null;
  return <Audio src={staticFile(src)} volume={volume} loop={loop} />;
};

/** Frame-driven count-up number (frame-accurate on render). */
export const AnimatedNumber: React.FC<{
  to: number;
  suffix?: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ to, suffix = '', delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const value = Math.round(interpolate(progress, [0, 1], [0, to]));
  return (
    <span style={style}>
      {value}
      {suffix}
    </span>
  );
};

/** Entrance helper: fade + rise, driven by a spring for natural motion. */
export const useFadeUp = (delay = 0, distance = 40) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return {
    opacity: p,
    transform: `translateY(${interpolate(p, [0, 1], [distance, 0])}px)`,
  } satisfies React.CSSProperties;
};

/**
 * Which item is "active" right now, stepping through `count` items across the
 * scene. Drives the moving highlight so long scenes keep changing (and can be
 * matched to narration beats). Returns -1 before `startFrame`.
 */
export const useActiveStep = (
  count: number,
  startFrame: number,
  durationInFrames: number,
  endHold = 0,
) => {
  const frame = useCurrentFrame();
  if (frame < startFrame) return -1;
  const span = Math.max(1, durationInFrames - startFrame - endHold);
  const seg = span / count;
  return Math.min(count - 1, Math.floor((frame - startFrame) / seg));
};
