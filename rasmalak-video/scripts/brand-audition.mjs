#!/usr/bin/env node
/**
 * Auditions ways of getting the Arabic TTS to say the brand name correctly.
 *
 * The problem: "رَسمالَك" is only partly voweled, so the engine infers the vowels
 * and can land on ras-ma-lak (colliding with رَسْم, "drawing") instead of the
 * intended رأسمال, "capital" -> ras-MAA-lak. Because the narration field is separate
 * from the on-screen wordmark, the narration can be respelled purely for the
 * engine's benefit without changing what viewers read.
 *
 * Each candidate is heard twice per clip — mid-sentence and sentence-final — since
 * prosody differs between the title line and the outro CTA.
 *
 * Usage: npm run voiceover:brand [-- --force]
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_VOICE,
  STYLE,
  durationSeconds,
  pool,
  projectRoot,
  readApiKey,
  synthesise,
  toMp3,
} from './lib/tts.mjs';

const MODELS = [
  { id: 'gemini-3.1-flash-tts-preview', short: '3.1-flash' },
  { id: 'gemini-2.5-flash-preview-tts', short: '2.5-flash' },
];

const VARIANTS = [
  {
    id: 'baseline',
    brand: 'رَسمالَك',
    label: 'Current spelling',
    note: 'what content.ts uses today — the one you flagged',
  },
  {
    id: 'sukun',
    brand: 'رَسْمَالَك',
    label: 'Full tashkeel with sukun',
    note: 'sukun on the س blocks an inserted vowel → ras-MAA-lak',
  },
  {
    id: 'hamza',
    brand: 'رَأْسمالَك',
    label: 'Etymological, with hamza',
    note: 'the literal رأسمال ("capital") → raʔs-MAA-lak, most formal MSA',
  },
  {
    id: 'alif',
    brand: 'راسمالَك',
    label: 'Alif for a long first vowel',
    note: 'common colloquial spelling → raas-MAA-lak',
  },
  {
    id: 'madd',
    brand: 'رَسْمالِك',
    label: 'Kasra on the kaf',
    note: 'ras-MAA-lik — worth hearing if the final vowel is what sounds off',
  },
  {
    id: 'latin',
    brand: 'Rasmalak',
    label: 'Latin script inside the Arabic',
    note: 'multilingual models often apply English phonology to Latin names',
  },
  {
    id: 'hint',
    brand: 'رَسمالَك',
    label: 'Current spelling + spoken-form hint',
    note: 'spelling untouched; the delivery direction names the pronunciation',
    // The hint has to sit *before* the colon that separates direction from content,
    // otherwise the model treats it as script and reads it out loud.
    style: `${STYLE.ar.replace(/:\s*$/, '')}، مع نطق اسم العلامة «رَسمالَك» ككلمة واحدة موصولة تُلفظ «راس ما لَك»:`,
  },
];

/** Carrier line: the brand mid-sentence, then sentence-final, as in title + outro. */
const carrier = (brand) => `أهلًا بك في ${brand}. ابدأ الدرس الأول مجّانًا على ${brand}.`;

const outDir = path.join(projectRoot, 'vo-samples', 'brand');
const force = process.argv.includes('--force');
const clipPath = (modelShort, id) => path.join(outDir, `${modelShort}__${id}.mp3`);

const buildIndex = (results) => {
  const byKey = new Map(results.map((r) => [r.key, r]));
  const rows = VARIANTS.map((v) => {
    const players = MODELS.map((m) => {
      const entry = byKey.get(`${m.short}|${v.id}`);
      const rel = path.relative(outDir, clipPath(m.short, v.id));
      const cell = entry?.error
        ? `<span class="err">failed</span>`
        : `<audio controls preload="none" src="${rel}"></audio>`;
      return `<td><div class="model">${m.short}</div>${cell}</td>`;
    }).join('');
    return `<tr>
      <th><span class="brand" dir="rtl">${v.brand}</span>
        <span class="label">${v.label}</span><small>${v.note}</small></th>
      ${players}
    </tr>`;
  }).join('');

  writeFileSync(
    path.join(outDir, 'index.html'),
    `<!doctype html>
<meta charset="utf-8">
<title>Rasmalak — Arabic brand pronunciation</title>
<style>
  body { font-family:-apple-system, system-ui, sans-serif; background:#F5F0EB; color:#16211C;
         margin:0; padding:48px; }
  h1 { margin:0 0 4px; } p.sub { color:#5C6B63; margin:0 0 28px; max-width:70ch; }
  .card { background:#fff; border-radius:20px; padding:28px 32px;
          box-shadow:0 18px 44px rgba(45,106,79,.10); }
  table { border-collapse:collapse; width:100%; }
  tr + tr th, tr + tr td { border-top:1px solid #EBE4DC; }
  th { text-align:start; padding:16px 24px 16px 0; vertical-align:middle; }
  .brand { display:block; font-size:30px; font-weight:700; color:#2D6A4F; }
  .label { display:block; font-weight:700; margin-top:2px; }
  th small { display:block; font-weight:400; color:#5C6B63; max-width:46ch; margin-top:2px; }
  td { padding:16px 0 16px 20px; }
  .model { font-size:11px; text-transform:uppercase; letter-spacing:.06em;
           color:#5C6B63; margin-bottom:4px; }
  audio { width:280px; }
  .err { color:#B42318; }
</style>
<h1>Arabic brand pronunciation</h1>
<p class="sub">Every clip is the same sentence — the brand mid-sentence, then sentence-final —
so the only variable is how the name is spelled for the engine. The on-screen wordmark is
unaffected by any of these; narration text is a separate field from display text.</p>
<div class="card"><table>${rows}</table></div>`,
  );
};

const main = async () => {
  const apiKey = readApiKey();
  const jobs = MODELS.flatMap((m) => VARIANTS.map((v) => ({ model: m, variant: v })));

  mkdirSync(outDir, { recursive: true });
  console.log(`Auditioning ${jobs.length} brand pronunciations`);

  const fetched = await pool(jobs, 4, async ({ model, variant }) => {
    const file = clipPath(model.short, variant.id);
    if (existsSync(file) && !force) return { model, variant, file, cached: true };
    try {
      const audio = await synthesise({
        apiKey,
        locale: 'ar',
        text: carrier(variant.brand),
        voice: DEFAULT_VOICE,
        model: model.id,
        style: variant.style,
      });
      return { model, variant, file, audio };
    } catch (error) {
      console.log(`  FAIL ${model.short} ${variant.id}: ${error.message}`);
      return { model, variant, file, error: error.message };
    }
  });

  const results = [];
  for (const item of fetched) {
    if (item.audio) toMp3(item.audio.pcm, item.audio.sampleRate, item.file);
    results.push({
      key: `${item.model.short}|${item.variant.id}`,
      error: item.error,
    });
    if (!item.error) {
      const seconds = durationSeconds(item.file);
      console.log(`  ${item.model.short.padEnd(11)} ${item.variant.id.padEnd(10)} ${seconds.toFixed(1)}s`);
    }
  }

  buildIndex(results);
  console.log(`\nOpen: ${path.join(outDir, 'index.html')}`);
};

await main();
