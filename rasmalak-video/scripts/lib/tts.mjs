/**
 * Shared Gemini TTS helpers, used by both the production voiceover generator and
 * the voice/model sample pack. Keeping the synthesis and encoding here means the
 * samples are produced through the exact same path as the real clips, so what you
 * hear when choosing a voice is what you get when you render.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const repoRoot = path.resolve(projectRoot, '..');

export const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
export const DEFAULT_VOICE = 'Charon';

/** Delivery direction sent with each line; consumed as style, not spoken. */
export const STYLE = {
  ar: 'اقرأ بنبرة هادئة وواثقة ودافئة، بإيقاع متمهّل ووضوح تامّ، كما في درس تعليمي عن المال بالفصحى:',
  en: 'Read in a calm, warm, confident tone at a measured, clear pace, as the narrator of a financial literacy lesson:',
};

export const readApiKey = () => {
  if (process.env.GOOGLE_AI_API_KEY) return process.env.GOOGLE_AI_API_KEY;
  const envFile = path.join(repoRoot, '.env.local');
  const match = existsSync(envFile)
    ? readFileSync(envFile, 'utf8').match(/^GOOGLE_AI_API_KEY=(.*)$/m)
    : null;
  const key = match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  if (!key) throw new Error('GOOGLE_AI_API_KEY not found in env or ../.env.local');
  return key;
};

/** Bundle content.ts in-memory so these plain-JS scripts can import its exports. */
export const loadContent = async () => {
  const result = await build({
    entryPoints: [path.join(projectRoot, 'src/content.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  });
  const code = Buffer.from(result.outputFiles[0].contents).toString('base64');
  return import(`data:text/javascript;base64,${code}`);
};

export const synthesise = async ({
  apiKey,
  text,
  locale,
  voice = DEFAULT_VOICE,
  model = DEFAULT_MODEL,
  /** Override the delivery direction, e.g. to add a pronunciation instruction. */
  style = STYLE[locale],
}) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${style} ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`TTS ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const payload = await response.json();
  const audio = payload.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!audio?.data) {
    throw new Error(`No audio returned: ${JSON.stringify(payload).slice(0, 300)}`);
  }
  return {
    pcm: Buffer.from(audio.data, 'base64'),
    sampleRate: Number(audio.mimeType?.match(/rate=(\d+)/)?.[1] ?? 24000),
  };
};

/**
 * PCM -> MP3. A 250ms lead-in keeps the first word clear of the scene's fade-in,
 * and loudnorm holds every clip at the same perceived level so no scene jumps out
 * (and so a voice comparison is about timbre, not volume).
 */
export const toMp3 = (pcm, sampleRate, outFile) => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'rasmalak-vo-'));
  const rawFile = path.join(scratch, 'clip.pcm');
  try {
    writeFileSync(rawFile, pcm);
    mkdirSync(path.dirname(outFile), { recursive: true });
    execFileSync(
      'npx',
      [
        'remotion', 'ffmpeg', '-y',
        '-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', rawFile,
        '-af', 'adelay=250,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-codec:a', 'libmp3lame', '-q:a', '2',
        outFile,
      ],
      { cwd: projectRoot, stdio: 'pipe' },
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

export const durationSeconds = (file) => {
  const out = execFileSync(
    'npx',
    ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', file],
    { cwd: projectRoot, encoding: 'utf8' },
  );
  return Number(out.trim());
};

/** Run async work with a concurrency cap, preserving input order in the results. */
export const pool = async (items, limit, fn) => {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
};
