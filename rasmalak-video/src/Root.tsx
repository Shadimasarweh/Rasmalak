import React from 'react';
import { Composition, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { VIDEO } from './theme';
import { SCENES, SCENE_ORDER, clipFile, type Locale } from './content';
import { LessonIntro, type ScenePlanItem } from './LessonIntro';

const TAIL_SECONDS = 0.4; // small breath after each narration line before the cut

/**
 * Build the timeline plan for a locale. For each scene we try to measure its
 * voiceover clip (vo/<locale>/<scene>.mp3); if present, the scene auto-lengths
 * to the audio (+ a short tail). If the clip is missing, we fall back to the
 * static SCENES duration and render that scene silent — so the project renders
 * cleanly before any audio exists, and tightens to the narration once it does.
 */
const buildPlan = async (locale: Locale): Promise<ScenePlanItem[]> => {
  const plan: ScenePlanItem[] = [];
  for (const key of SCENE_ORDER) {
    const file = clipFile(locale, key);
    try {
      const seconds = await getAudioDurationInSeconds(staticFile(file));
      plan.push({
        key,
        durationInFrames: Math.round((seconds + TAIL_SECONDS) * VIDEO.fps),
        audioSrc: file,
      });
    } catch {
      plan.push({ key, durationInFrames: SCENES[key].durationInFrames });
    }
  }
  return plan;
};

const totalFrames = (plan: ScenePlanItem[]) =>
  plan.reduce((sum, item) => sum + item.durationInFrames, 0);

/**
 * Two compositions from one code path: Arabic (RTL) and English (LTR). Scene
 * lengths and the composition duration are computed at load time from the
 * per-scene audio clips (see VOICEOVER.md). To add narration, drop the clips in
 * public/vo/<locale>/ — nothing else to change. Optionally set musicSrc to a
 * soft music bed in /public.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LessonIntroAR"
        component={LessonIntro}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={{ locale: 'ar' as const, plan: [] as ScenePlanItem[], musicSrc: undefined }}
        calculateMetadata={async ({ props }) => {
          const plan = await buildPlan(props.locale);
          return { durationInFrames: totalFrames(plan), props: { ...props, plan } };
        }}
      />
      <Composition
        id="LessonIntroEN"
        component={LessonIntro}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={{ locale: 'en' as const, plan: [] as ScenePlanItem[], musicSrc: undefined }}
        calculateMetadata={async ({ props }) => {
          const plan = await buildPlan(props.locale);
          return { durationInFrames: totalFrames(plan), props: { ...props, plan } };
        }}
      />
    </>
  );
};
