# Voiceover — production sheet

The video renders silent until you add narration, and it now **auto-syncs**: each
scene measures its own voiceover clip and stretches to match it (plus a ~0.4s
breath). You don't touch any timing — just produce the clips and drop them in.

## What to produce

One MP3 **per scene, per language**, named exactly by scene, in these folders:

```
public/vo/ar/title.mp3   public/vo/en/title.mp3
public/vo/ar/hook.mp3    public/vo/en/hook.mp3
public/vo/ar/concept.mp3 public/vo/en/concept.mp3
public/vo/ar/data.mp3    public/vo/en/data.mp3
public/vo/ar/recap.mp3   public/vo/en/recap.mp3
public/vo/ar/outro.mp3   public/vo/en/outro.mp3
```

Any scene whose clip is missing simply stays silent at its default length, so you
can add them one at a time and re-render as you go.

## Script — Arabic (فصحى / MSA)

| Clip | العربية |
|---|---|
| `title.mp3` | أهلًا ومرحبًا بك. قبل أن نتحدّث عن الادّخار أو الاستثمار، لنبدأ من الأساس: ما هو المال حقًّا؟ |
| `hook.mp3` | معظمنا يستخدم المال كل يوم، لكنّ قليلين تعلّموا كيف يعمل فعلًا. وهذه الفجوة الصغيرة في الفهم هي ما يجعل إدارة المال تبدو أصعب ممّا يجب أن تكون. |
| `concept.mp3` | الحقيقة الأولى: المال ليس هدفًا في ذاته، بل أداة. وللمال ثلاث وظائف أساسية. أولًا، وسيلة للتبادل تُغنيك عن مقايضة السلع. وثانيًا، مخزن للقيمة يحفظ قدرتك الشرائية إلى وقتٍ لاحق. وثالثًا، وحدة للقياس تتيح لك مقارنة قيمة الأشياء برقمٍ واحد. |
| `data.mp3` | ولنترجم ذلك إلى خطوةٍ عملية، إليك قاعدة خمسين وثلاثين وعشرين لتقسيم دخلك الشهري. خمسون بالمئة للاحتياجات كالسكن والطعام. وثلاثون بالمئة للرغبات كالترفيه. وعشرون بالمئة للادّخار وسداد الديون. إنها ليست قانونًا صارمًا، بل نقطة انطلاق تمنح كل ريالٍ وظيفةً واضحة. |
| `recap.mp3` | حين تفهم أنّ المال أداة، وتمنح كلّ جزءٍ منه وظيفة، تتحوّل الميزانية من قيدٍ يُثقلك إلى أداةٍ تمنحك الحريّة وراحة البال. |
| `outro.mp3` | هذه كانت البداية. ابدأ الدرس الأول كاملًا، مجّانًا، من هنا. |

## Script — English

| Clip | English |
|---|---|
| `title.mp3` | Welcome — glad you're here. Before we talk about saving or investing, let's start with the foundation: what is money, really? |
| `hook.mp3` | Most of us use money every day, yet very few were ever taught how it actually works. That small gap in understanding is what makes managing money feel harder than it should. |
| `concept.mp3` | The first truth: money isn't a goal in itself — it's a tool. And it does three jobs. First, a medium of exchange, so you don't have to barter. Second, a store of value, holding your purchasing power for later. And third, a unit of account, letting you compare the worth of things with a single number. |
| `data.mp3` | Let's turn that into one practical move: the fifty–thirty–twenty rule for splitting your monthly income. Fifty percent for needs, like housing and food. Thirty percent for wants, like entertainment. And twenty percent for savings and paying down debt. It isn't a strict law — it's a starting point that gives every dinar a clear job. |
| `recap.mp3` | Once you see money as a tool, and give every part of it a job, a budget stops being a limit that weighs on you and becomes something that buys you freedom and peace of mind. |
| `outro.mp3` | That was just the start. Begin the full first lesson, free, right here. |

> This is the expanded script (≈ 2–2.5 min total read). The source of truth is
> `src/content.ts → lesson.narration` if you want to edit wording.

## Open issue — the brand name is not spoken

**The narration never says رَسمالَك / Rasmalak.** No engine we tried pronounces it
acceptably in *either* language, so the wordmark carries the brand on screen and the
narration points at it instead ("من هنا" / "right here"). Don't add the name back to
the script without auditioning the result.

Target pronunciation, for whoever picks this up: **RAS-ma-lak** — stress on the first
syllable.

What was already ruled out: six Arabic respellings (full tashkeel with sukun, the
etymological رَأْسمالَك, an alif for a long opening vowel, a kasra on the kaf, Latin
script inside the Arabic, and a pronunciation hint in the delivery direction), across
both `gemini-3.1-flash-tts-preview` and `gemini-2.5-flash-preview-tts`. Re-audition
them any time with `npm run voiceover:brand`.

Routes that remain, roughly by cost:

1. **Splice a real recording.** The name is only spoken in the `title` and `outro`
   clips, so a single clean take per language covers it; synthesise each sentence in
   two halves and concatenate around it.
2. **ElevenLabs.** Its pronunciation dictionaries take explicit IPA, which makes this
   deterministic rather than a matter of coaxing.
3. **A human narrator** for the whole voiceover.

## Note on prompt hints

If you ever add delivery direction (pronunciation, pacing, emotion), it must sit
**before** the colon that ends the style prompt in `scripts/lib/tts.mjs`. Anything
after the colon is treated as script and gets read aloud — a hint placed there
turned a 7-second clip into a 19-second one.

## Make the clips — automated (Gemini TTS)

```bash
npm run voiceover              # all 12 clips (skips any that already exist)
npm run voiceover -- --force   # re-generate everything
npm run voiceover -- --locale ar --scene concept,data
```

Reads `GOOGLE_AI_API_KEY` from the app's `../.env.local`, takes the script text
straight from `src/content.ts` (so there is no second copy to keep in sync), and
writes normalised MP3s to `public/vo/<locale>/`. One voice narrates both
languages for brand consistency; override with `TTS_VOICE` / `TTS_MODEL`, e.g.
`TTS_VOICE=Sulafat npm run voiceover -- --force`.

## Make the clips — manual alternative

Recommended for Modern Standard Arabic:

- **Lahajati** — MENA-native, pick a فصحى voice. Free 10,000 points/month.
- **ElevenLabs** — strong MSA (multilingual v2/v3). Free to test; Starter ($6/mo)
  for commercial rights on a shipped product.
- **CapCut TTS** — free, commercial-cleared, decent MSA.

For English, any natural voice on the same tools. Keep one consistent voice per
language across all six clips. Export as MP3.

## Wire it in — nothing to configure

1. Save the clips into `public/vo/ar/` and `public/vo/en/` with the exact names above.
2. `npm run studio` — scene lengths and the total duration update automatically.
3. `npm run render:all`.

## Optional: music bed

Save a soft royalty-free instrumental as `public/music-bed.mp3` (Pixabay Music or
the YouTube Audio Library — free + commercial), then set `musicSrc: 'music-bed.mp3'`
in `src/Root.tsx`. It auto-loops at 14% volume under the narration.

## How the auto-sync works (for reference)

`src/Root.tsx` runs `calculateMetadata` at load: it measures each clip with
`getAudioDurationInSeconds`, converts to frames, adds a 0.4s tail, and feeds a
per-scene plan into the composition. Missing clip → fall back to the static
length in `src/content.ts → SCENES` and render that scene silent.
