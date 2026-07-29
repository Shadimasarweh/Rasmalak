import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { lesson, type Locale, type SceneKey } from './content';
import { AudioTrack, Background, CornerBrand, ProgressBar } from './components';
import {
  ConceptScene,
  DataScene,
  HookScene,
  OutroScene,
  RecapScene,
  TitleScene,
} from './scenes';

/** One entry per scene, produced by calculateMetadata in Root.tsx. */
export type ScenePlanItem = {
  key: SceneKey;
  durationInFrames: number;
  /** Per-scene voiceover clip path, if the MP3 exists; undefined = silent scene. */
  audioSrc?: string;
};

export type LessonIntroProps = {
  locale: Locale;
  /** Timeline plan: scene order, per-scene length, and per-scene audio. */
  plan: ScenePlanItem[];
  /** Optional low-volume music bed filename in /public, e.g. "music-bed.mp3". */
  musicSrc?: string;
};

const SCENE_COMPONENTS: Record<
  SceneKey,
  React.FC<{ locale: Locale; durationInFrames: number }>
> = {
  title: TitleScene,
  hook: HookScene,
  concept: ConceptScene,
  data: DataScene,
  recap: RecapScene,
  outro: OutroScene,
};

/**
 * Layer order (bottom -> top): drifting background, persistent corner logo,
 * the scene <Series>, then the progress bar. Each scene is driven by the plan,
 * so scene length and its narration clip always come from the same source and
 * stay in sync. Per-scene <Audio> lives inside the sequence, so it plays only
 * while that scene is on screen.
 */
export const LessonIntro: React.FC<LessonIntroProps> = ({ locale, plan, musicSrc }) => {
  return (
    <AbsoluteFill>
      <AudioTrack src={musicSrc} volume={0.14} loop />
      <Background />
      <CornerBrand locale={locale} label={lesson.brand[locale]} />
      <Series>
        {plan.map((item) => {
          const Scene = SCENE_COMPONENTS[item.key];
          return (
            <Series.Sequence key={item.key} durationInFrames={item.durationInFrames}>
              <AudioTrack src={item.audioSrc} />
              <Scene locale={locale} durationInFrames={item.durationInFrames} />
            </Series.Sequence>
          );
        })}
      </Series>
      <ProgressBar locale={locale} />
    </AbsoluteFill>
  );
};
