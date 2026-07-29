import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from './theme';
import { lesson, isRTL, type Locale } from './content';
import {
  AnimatedNumber,
  BrandMark,
  SceneShell,
  fontFor,
  useActiveStep,
  useFadeUp,
} from './components';

type SceneProps = { locale: Locale; durationInFrames: number };

/** Accent underline that sweeps in — a small persistent-feeling flourish. */
const Underline: React.FC<{ delay: number; color?: string; width?: number }> = ({
  delay,
  color = theme.accentGold,
  width = 220,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        height: 8,
        width: interpolate(p, [0, 1], [0, width]),
        backgroundColor: color,
        borderRadius: 4,
        marginTop: 18,
      }}
    />
  );
};

export const TitleScene: React.FC<SceneProps> = ({ locale, durationInFrames }) => {
  const brand = useFadeUp(0);
  const label = useFadeUp(10);
  const title = useFadeUp(20);
  return (
    <SceneShell locale={locale} durationInFrames={durationInFrames}>
      <div style={{ position: 'absolute', top: 100, insetInlineStart: 140, ...brand }}>
        <BrandMark locale={locale} label={lesson.brand[locale]} />
      </div>
      <div style={{ ...label, color: theme.accentGold, fontSize: 40, fontWeight: 700 }}>
        {lesson.course[locale]} · {lesson.lessonLabel[locale]}
      </div>
      <div style={{ ...title, fontSize: 118, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>
        {lesson.lessonTitle[locale]}
      </div>
      <div style={title}>
        <Underline delay={34} width={300} />
      </div>
    </SceneShell>
  );
};

export const HookScene: React.FC<SceneProps> = ({ locale, durationInFrames }) => {
  const line = useFadeUp(6);
  const accent = useFadeUp(Math.round(durationInFrames * 0.45));
  return (
    <SceneShell locale={locale} durationInFrames={durationInFrames}>
      <div style={{ ...line, fontSize: 88, fontWeight: 800, lineHeight: 1.25, maxWidth: 1400 }}>
        {lesson.hook[locale]}
      </div>
      <div style={accent}>
        <Underline delay={0} width={340} />
      </div>
    </SceneShell>
  );
};

export const ConceptScene: React.FC<SceneProps> = ({ locale, durationInFrames }) => {
  const heading = useFadeUp(0);
  // Cards reveal one by one, then a highlight steps through them across the scene.
  const active = useActiveStep(3, Math.round(durationInFrames * 0.35), durationInFrames, 20);
  return (
    <SceneShell locale={locale} durationInFrames={durationInFrames}>
      <div style={{ ...heading, fontSize: 64, fontWeight: 800, marginBottom: 8 }}>
        {lesson.conceptHeading[locale]}
      </div>
      <Underline delay={8} width={260} />
      <div style={{ display: 'flex', gap: 40, marginTop: 60 }}>
        {lesson.conceptPoints[locale].map((point, i) => (
          <ConceptCard key={i} index={i} text={point} active={active === i} />
        ))}
      </div>
    </SceneShell>
  );
};

const ConceptCard: React.FC<{ index: number; text: string; active: boolean }> = ({
  index,
  text,
  active,
}) => {
  const enter = useFadeUp(16 + index * 12);
  const enterOpacity = typeof enter.opacity === 'number' ? enter.opacity : 1;
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: theme.bgCard,
        borderRadius: 28,
        padding: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        // Reveal (fade+rise), then highlight the active card: lift, gold ring, deeper shadow.
        opacity: enterOpacity * (active ? 1 : 0.82),
        transform: `${enter.transform} scale(${active ? 1.05 : 1})`,
        boxShadow: active
          ? '0 34px 70px rgba(45,106,79,0.22)'
          : '0 16px 40px rgba(45,106,79,0.10)',
        outline: active ? `4px solid ${theme.accentGold}` : '4px solid transparent',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: active ? theme.accentGold : theme.primaryLight,
          color: active ? theme.inkInverse : theme.primary,
          fontSize: 40,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {index + 1}
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.3 }}>{text}</div>
    </div>
  );
};

/**
 * Data scene — the "native visualizer." Fixed vertical zones: a header band up
 * top, and a chart band anchored to the bottom with a capped bar height, so a
 * bar's percentage label can never reach the caption (the earlier overlap bug).
 * Bars grow in sequence across the scene, with a highlight stepping through them.
 */
export const DataScene: React.FC<SceneProps> = ({ locale, durationInFrames }) => {
  const heading = useFadeUp(0);
  const caption = useFadeUp(8);
  const active = useActiveStep(3, Math.round(durationInFrames * 0.5), durationInFrames, 20);
  const toneColor: Record<string, string> = {
    needs: theme.primary,
    wants: theme.accentGold,
    savings: theme.bgDark,
  };
  return (
    <SceneShell locale={locale} durationInFrames={durationInFrames} justify="flex-start">
      {/* Header band */}
      <div style={{ ...heading, fontSize: 62, fontWeight: 800 }}>
        {lesson.dataHeading[locale]}
      </div>
      <div style={{ ...caption, fontSize: 36, color: theme.muted, marginTop: 6 }}>
        {lesson.dataCaption[locale]}
      </div>
      {/* Chart band — fixed height, bars anchored to bottom */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 70,
          height: 470,
          marginTop: 110,
        }}
      >
        {lesson.dataBars.map((bar, i) => (
          <Bar
            key={i}
            revealAt={Math.round(durationInFrames * (0.12 + i * 0.16))}
            pct={bar.pct}
            color={toneColor[bar.tone]}
            label={bar.label[locale]}
            active={active === i}
          />
        ))}
      </div>
    </SceneShell>
  );
};

const MAX_BAR_PX = 320; // 50% -> 320px, well clear of the header band

const Bar: React.FC<{
  revealAt: number;
  pct: number;
  color: string;
  label: string;
  active: boolean;
}> = ({ revealAt, pct, color, label, active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = spring({ frame: frame - revealAt, fps, config: { damping: 200 } });
  const height = interpolate(grow, [0, 1], [0, (pct / 50) * MAX_BAR_PX]);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 18,
        opacity: interpolate(grow, [0, 0.15], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `scale(${active ? 1.04 : 1})`,
      }}
    >
      <div style={{ fontSize: 54, fontWeight: 800, color }}>
        <AnimatedNumber to={pct} suffix="%" delay={revealAt} />
      </div>
      <div
        style={{
          width: '100%',
          height,
          backgroundColor: color,
          borderRadius: '20px 20px 0 0',
          outline: active ? `4px solid ${theme.accentGold}` : 'none',
          outlineOffset: 4,
        }}
      />
      <div style={{ fontSize: 40, fontWeight: 700 }}>{label}</div>
    </div>
  );
};

export const RecapScene: React.FC<SceneProps> = ({ locale, durationInFrames }) => {
  const heading = useFadeUp(0);
  const body = useFadeUp(12);
  const accent = useFadeUp(Math.round(durationInFrames * 0.5));
  return (
    <SceneShell locale={locale} durationInFrames={durationInFrames}>
      <div style={{ ...heading, fontSize: 72, fontWeight: 800, color: theme.primary }}>
        {lesson.recapHeading[locale]}
      </div>
      <div style={{ ...body, fontSize: 50, lineHeight: 1.45, maxWidth: 1400, marginTop: 28 }}>
        {lesson.recapBody[locale]}
      </div>
      <div style={accent}>
        <Underline delay={0} width={300} />
      </div>
    </SceneShell>
  );
};

export const OutroScene: React.FC<SceneProps> = ({ locale, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 } });
  const out = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: theme.bgDark,
        opacity: out,
        direction: isRTL(locale) ? 'rtl' : 'ltr',
        fontFamily: fontFor(locale),
        color: theme.inkInverse,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <div style={{ transform: `scale(${interpolate(pop, [0, 1], [0.9, 1])})` }}>
        <BrandMark locale={locale} label={lesson.brand[locale]} />
      </div>
      <div style={{ fontSize: 92, fontWeight: 800, marginTop: 20 }}>
        {lesson.ctaHeading[locale]}
      </div>
      <div style={{ fontSize: 46, color: theme.primaryLight }}>{lesson.ctaSub[locale]}</div>
    </div>
  );
};
