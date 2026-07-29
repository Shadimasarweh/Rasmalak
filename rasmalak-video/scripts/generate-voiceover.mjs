#!/usr/bin/env node
/**
 * Generates the per-scene voiceover clips (public/vo/<locale>/<scene>.mp3) from
 * the narration script in src/content.ts using the Gemini TTS API.
 *
 * The script text is read out of content.ts rather than duplicated here, so
 * content.ts stays the single source of truth and edits to the wording only need
 * to happen in one place.
 *
 * Usage:
 *   npm run voiceover                                  # missing clips only
 *   npm run voiceover -- --force                       # re-generate everything
 *   npm run voiceover -- --locale ar --scene concept,data
 *   TTS_VOICE=Sulafat TTS_MODEL=gemini-3.1-flash-tts-preview npm run voiceover -- --force
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  durationSeconds,
  loadContent,
  projectRoot,
  readApiKey,
  synthesise,
  toMp3,
} from './lib/tts.mjs';

const model = process.env.TTS_MODEL ?? DEFAULT_MODEL;

/**
 * One voice for both languages keeps a single recognisable narrator across the
 * bilingual pair. Gemini's voices are multilingual, so the same name reads both
 * the Arabic and English scripts.
 */
const voice = process.env.TTS_VOICE ?? DEFAULT_VOICE;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const force = args.includes('--force');
const onlyLocales = flag('locale')?.split(',');
const onlyScenes = flag('scene')?.split(',');

const main = async () => {
  const apiKey = readApiKey();
  const { lesson, SCENE_ORDER, clipFile } = await loadContent();
  const locales = (onlyLocales ?? ['ar', 'en']).filter((l) => l === 'ar' || l === 'en');
  const scenes = SCENE_ORDER.filter((k) => !onlyScenes || onlyScenes.includes(k));

  console.log(`Model ${model} · voice ${voice}`);
  for (const locale of locales) {
    let total = 0;
    for (const scene of scenes) {
      const relative = clipFile(locale, scene);
      const outFile = path.join(projectRoot, 'public', relative);
      if (existsSync(outFile) && !force) {
        total += durationSeconds(outFile);
        console.log(`  skip ${relative} (exists)`);
        continue;
      }
      const text = lesson.narration[locale][scene];
      const { pcm, sampleRate } = await synthesise({ apiKey, text, locale, voice, model });
      toMp3(pcm, sampleRate, outFile);
      const seconds = durationSeconds(outFile);
      total += seconds;
      console.log(`  ${relative}  ${seconds.toFixed(1)}s`);
    }
    console.log(`  ${locale} total ≈ ${(total / 60).toFixed(2)} min\n`);
  }
};

await main();
