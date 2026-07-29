#!/usr/bin/env node
/**
 * Builds a listenable sample pack so the narrator can be chosen by ear instead of
 * from voice-name adjectives. Two sweeps, deliberately kept small enough to audition
 * in one sitting:
 *
 *   1. Voice sweep — six voices (mixed male/female) on the newest TTS model.
 *   2. Model sweep — the current production voice across all three TTS models.
 *
 * Output: vo-samples/<locale>/<model>__<voice>.mp3 plus vo-samples/index.html.
 * These are auditions only; they live outside /public so they are never bundled
 * into a render.
 *
 * Usage: npm run voiceover:samples [-- --force]
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_VOICE,
  durationSeconds,
  loadContent,
  pool,
  projectRoot,
  readApiKey,
  synthesise,
  toMp3,
} from './lib/tts.mjs';

const MODELS = [
  { id: 'gemini-3.1-flash-tts-preview', short: '3.1-flash', note: 'newest' },
  { id: 'gemini-2.5-pro-preview-tts', short: '2.5-pro', note: 'pro tier' },
  { id: 'gemini-2.5-flash-preview-tts', short: '2.5-flash', note: 'current production' },
];

const NEWEST = MODELS[0].id;

const VOICES = [
  { name: 'Charon', note: 'informative · male · current' },
  { name: 'Sadaltager', note: 'knowledgeable · male' },
  { name: 'Achird', note: 'friendly · male' },
  { name: 'Sulafat', note: 'warm · female' },
  { name: 'Vindemiatrix', note: 'gentle · female' },
  { name: 'Kore', note: 'firm · female' },
];

/**
 * Audition line per locale, stitched from real script phrases so the sample
 * exercises the things that actually go wrong: the brand name, a question
 * intonation, and spoken-out numbers.
 */
const sampleLine = (lesson, locale) =>
  locale === 'ar'
    ? `أهلًا بك في ${lesson.brand.ar}. ${lesson.lessonTitle.ar} خمسون بالمئة للاحتياجات، وثلاثون للرغبات، وعشرون للادّخار.`
    : `Welcome to ${lesson.brand.en}. What is money, really? Fifty percent for needs, thirty for wants, and twenty for savings.`;

const outDir = path.join(projectRoot, 'vo-samples');
const force = process.argv.includes('--force');
const shortOf = (modelId) => MODELS.find((m) => m.id === modelId).short;
const clipPath = (locale, modelId, voice) =>
  path.join(outDir, locale, `${shortOf(modelId)}__${voice}.mp3`);

const buildIndex = (results) => {
  const durations = new Map(results.map((r) => [r.key, r]));
  const player = (locale, modelId, voice, note) => {
    const file = clipPath(locale, modelId, voice);
    const rel = path.relative(outDir, file);
    const entry = durations.get(`${locale}|${modelId}|${voice}`);
    const meta = entry?.error
      ? `<span class="err">failed: ${entry.error}</span>`
      : `<span class="dur">${entry?.seconds?.toFixed(1) ?? '?'}s</span>`;
    return `<tr><th>${voice}<small>${note}</small></th><td>${meta}</td>
      <td><audio controls preload="none" src="${rel}"></audio></td></tr>`;
  };

  const section = (locale, title, rows) => `
    <section${locale === 'ar' ? ' dir="rtl"' : ''}>
      <h3>${title}</h3>
      <table>${rows}</table>
    </section>`;

  const body = ['ar', 'en']
    .map((locale) => {
      const voiceRows = VOICES.map((v) => player(locale, NEWEST, v.name, v.note)).join('');
      const modelRows = MODELS.map((m) =>
        player(locale, m.id, DEFAULT_VOICE, `${m.short} · ${m.note}`),
      ).join('');
      return `
        <article>
          <h2>${locale === 'ar' ? 'Arabic (العربية)' : 'English'}</h2>
          ${section(locale, `Voice sweep — model ${shortOf(NEWEST)}`, voiceRows)}
          ${section(locale, `Model sweep — voice ${DEFAULT_VOICE}`, modelRows)}
        </article>`;
    })
    .join('');

  writeFileSync(
    path.join(outDir, 'index.html'),
    `<!doctype html>
<meta charset="utf-8">
<title>Rasmalak voiceover auditions</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background:#F5F0EB; color:#16211C;
         margin:0; padding:48px; }
  h1 { margin:0 0 4px; } p.sub { color:#5C6B63; margin:0 0 32px; }
  article { background:#fff; border-radius:20px; padding:28px 32px; margin-bottom:28px;
            box-shadow:0 18px 44px rgba(45,106,79,.10); }
  h2 { margin:0 0 18px; color:#2D6A4F; }
  h3 { font-size:14px; text-transform:uppercase; letter-spacing:.06em; color:#5C6B63;
       margin:22px 0 8px; }
  table { border-collapse:collapse; width:100%; }
  th { text-align:start; font-weight:700; padding:8px 16px 8px 0; white-space:nowrap;
       vertical-align:middle; }
  th small { display:block; font-weight:400; color:#5C6B63; }
  td { padding:8px 0; } audio { width:340px; vertical-align:middle; }
  .dur { color:#5C6B63; font-variant-numeric:tabular-nums; }
  .err { color:#B42318; }
</style>
<h1>Voiceover auditions</h1>
<p class="sub">Same line per language, so differences are voice and model only. All clips are
loudness-matched, and produced through the same path as a real render.</p>
${body}`,
  );
};

const main = async () => {
  const apiKey = readApiKey();
  const { lesson } = await loadContent();

  // Charon on the newest model belongs to both sweeps; generate it once.
  const jobs = [];
  for (const locale of ['ar', 'en']) {
    for (const v of VOICES) jobs.push({ locale, model: NEWEST, voice: v.name });
    for (const m of MODELS) {
      if (m.id !== NEWEST) jobs.push({ locale, model: m.id, voice: DEFAULT_VOICE });
    }
  }

  mkdirSync(outDir, { recursive: true });
  console.log(`Auditioning ${jobs.length} clips into vo-samples/`);

  const fetched = await pool(jobs, 4, async (job) => {
    const file = clipPath(job.locale, job.model, job.voice);
    if (existsSync(file) && !force) return { ...job, file, cached: true };
    try {
      const text = sampleLine(lesson, job.locale);
      const audio = await synthesise({ ...job, apiKey, text });
      return { ...job, file, audio };
    } catch (error) {
      console.log(`  FAIL ${job.locale} ${shortOf(job.model)} ${job.voice}: ${error.message}`);
      return { ...job, file, error: error.message };
    }
  });

  const results = [];
  for (const item of fetched) {
    if (item.audio) toMp3(item.audio.pcm, item.audio.sampleRate, item.file);
    const seconds = item.error ? undefined : durationSeconds(item.file);
    results.push({
      key: `${item.locale}|${item.model}|${item.voice}`,
      seconds,
      error: item.error,
    });
    if (!item.error) {
      const tag = item.cached ? 'cached' : `${seconds.toFixed(1)}s`;
      console.log(`  ${item.locale}  ${shortOf(item.model).padEnd(10)} ${item.voice.padEnd(13)} ${tag}`);
    }
  }

  buildIndex(results);
  console.log(`\nOpen: ${path.join(outDir, 'index.html')}`);
};

await main();
