# Rasmalak Video Studio (Remotion)

Programmatic, **owned**, watermark-free video for Rasmalak. You write videos as
React components and render them to MP4 — no subscription, no per-minute fee, no
third party in the loop. Arabic (RTL) and English (LTR) render from the same code.

This is the single pipeline we settled on: **Remotion is the spine**, and the
other two "creation" options fold into it as ingredients rather than separate
tools:

- **Native visualizer** → the animated bar scene (`DataScene` in `src/scenes.tsx`)
  is frame-driven data viz. Your existing **Recharts** components can render
  inside a scene too — disable Recharts' own animation and feed it frame-driven
  values so it stays in sync with the render clock.
- **Lottie** → drop a `.json` animation into a scene with `@remotion/lottie`
  (`npm i @remotion/lottie lottie-web`) when you want richer illustration motion.

## Setup

```bash
cd rasmalak-video
npm install
npm run studio     # opens Remotion Studio at http://localhost:3000
```

Studio gives you a live preview with a locale switcher (two compositions:
`LessonIntroAR`, `LessonIntroEN`), a scrubber, and hot reload.

## Render to MP4 (1080p)

```bash
npm run render:ar    # -> out/foundations-of-money-l1-ar.mp4
npm run render:en    # -> out/foundations-of-money-l1-en.mp4
npm run render:all   # both
```

## Add the voiceover (free, auto-synced)

Full instructions in **`VOICEOVER.md`**. In short: drop one MP3 per scene per
language into `public/vo/ar/` and `public/vo/en/` (`title.mp3`, `hook.mp3`,
`concept.mp3`, `data.mp3`, `recap.mp3`, `outro.mp3`). Each scene **auto-lengths
to its clip** — no timing to configure. A missing clip = that scene stays silent
at its default length, so you can add them one at a time.

## Project map

| File | Role |
|---|---|
| `src/content.ts` | **Single source of truth** — bilingual copy, per-scene narration, fallback durations, clip paths |
| `src/theme.ts` | Rasmalak design tokens (mirrors the app's `globals.css`) + video dimensions |
| `src/scenes.tsx` | The six scenes (title, hook, concept, data viz, recap, outro) + motion |
| `src/components.tsx` | Fonts (Cairo/Inter), drifting background, progress bar, brand marks, audio track, motion helpers |
| `src/LessonIntro.tsx` | Renders the timeline from the per-scene plan |
| `src/Root.tsx` | AR + EN compositions; `calculateMetadata` measures clips and builds the plan |

## Notes

- Length is driven by the voiceover clips (fallback ≈ **2 min** when silent).
- Arabic uses the **Cairo** font and `direction: rtl`; English uses **Inter**.
  Both load via `@remotion/google-fonts` — no font files to manage.
- This folder is a **standalone project** with its own `package.json`; it does
  not touch the Next.js app's dependencies. Keep it here, move it, or add it to
  `.gitignore` — your call.
- Everything rendered here is yours outright. Cancelling nothing, owing nothing.
