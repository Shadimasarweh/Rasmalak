import { VIDEO } from './theme';

export type Locale = 'ar' | 'en';

const s = (seconds: number) => Math.round(seconds * VIDEO.fps);

/**
 * Scene timings are the single source of truth for the timeline. Each duration
 * should be tuned to the real voiceover length once the narration MP3 is added
 * (see README). On-screen text is deliberately short — the narration carries
 * the detail; the screen carries the headline.
 */
export const SCENES = {
  title: { durationInFrames: s(6) },
  hook: { durationInFrames: s(14) },
  concept: { durationInFrames: s(28) },
  data: { durationInFrames: s(32) },
  recap: { durationInFrames: s(22) },
  outro: { durationInFrames: s(16) },
} as const;

export const TOTAL_FRAMES = Object.values(SCENES).reduce(
  (sum, sc) => sum + sc.durationInFrames,
  0,
); // Fallback length used only until per-scene audio clips are added (see Root.tsx).

export type SceneKey = keyof typeof SCENES;
export const SCENE_ORDER = Object.keys(SCENES) as SceneKey[];

/** Per-scene voiceover clip path in /public, e.g. "vo/ar/concept.mp3". */
export const clipFile = (locale: Locale, key: SceneKey) => `vo/${locale}/${key}.mp3`;

type Bilingual = Record<Locale, string>;

export interface LessonContent {
  brand: Bilingual;
  course: Bilingual;
  lessonLabel: Bilingual;
  lessonTitle: Bilingual;
  hook: Bilingual;
  conceptHeading: Bilingual;
  conceptPoints: Record<Locale, string[]>;
  dataHeading: Bilingual;
  dataCaption: Bilingual;
  dataBars: { label: Bilingual; pct: number; tone: 'needs' | 'wants' | 'savings' }[];
  recapHeading: Bilingual;
  recapBody: Bilingual;
  ctaHeading: Bilingual;
  ctaSub: Bilingual;
  /**
   * Narration script, keyed per scene per locale. Not rendered on screen — this
   * is the text you feed to the TTS tool to produce each per-scene clip
   * (vo/<locale>/<scene>.mp3), so the script lives beside the timeline it drives.
   *
   * The brand name is deliberately absent here: no TTS engine we tried says
   * رَسمالَك / Rasmalak acceptably in either language (see VOICEOVER.md). The
   * wordmark carries it on screen instead, and the narration points at the screen
   * ("من هنا" / "right here"). Don't reinstate it without auditioning the audio.
   */
  narration: Record<Locale, Record<SceneKey, string>>;
}

export const lesson: LessonContent = {
  brand: { ar: 'رَسمالَك', en: 'Rasmalak' },
  course: { ar: 'أساسيات المال', en: 'Foundations of Money' },
  lessonLabel: { ar: 'الدرس الأول', en: 'Lesson 1' },
  lessonTitle: { ar: 'ما هو المال حقًّا؟', en: 'What Money Really Is' },

  hook: {
    ar: 'معظمنا لم يتعلّم قطّ كيف يعمل المال.',
    en: 'Most of us were never taught how money actually works.',
  },

  conceptHeading: {
    ar: 'المال أداة — وله ثلاث وظائف',
    en: 'Money is a tool — with three jobs',
  },
  conceptPoints: {
    ar: ['وسيلة للتبادل', 'مخزن للقيمة', 'وحدة للقياس'],
    en: ['A medium of exchange', 'A store of value', 'A unit of account'],
  },

  dataHeading: {
    ar: 'قاعدة ٥٠ / ٣٠ / ٢٠',
    en: 'The 50 / 30 / 20 rule',
  },
  dataCaption: {
    ar: 'طريقة بسيطة لتقسيم دخلك الشهري.',
    en: 'A simple way to split your monthly income.',
  },
  dataBars: [
    { label: { ar: 'احتياجات', en: 'Needs' }, pct: 50, tone: 'needs' },
    { label: { ar: 'رغبات', en: 'Wants' }, pct: 30, tone: 'wants' },
    { label: { ar: 'ادّخار', en: 'Savings' }, pct: 20, tone: 'savings' },
  ],

  recapHeading: {
    ar: 'من المال إلى خطّة',
    en: 'From money to a plan',
  },
  recapBody: {
    ar: 'عندما تفهم وظيفة المال، تتحوّل الميزانية من قيدٍ إلى أداةٍ للحرية.',
    en: 'Once you understand what money is for, a budget stops being a limit and becomes a tool for freedom.',
  },

  ctaHeading: { ar: 'ابدأ الدرس الأول', en: 'Start Lesson 1' },
  ctaSub: { ar: 'مجّانًا على رَسمالَك', en: 'Free on Rasmalak' },

  narration: {
    ar: {
      title:
        'أهلًا ومرحبًا بك. قبل أن نتحدّث عن الادّخار أو الاستثمار، لنبدأ من الأساس: ما هو المال حقًّا؟',
      hook:
        'معظمنا يستخدم المال كل يوم، لكنّ قليلين تعلّموا كيف يعمل فعلًا. وهذه الفجوة الصغيرة في الفهم هي ما يجعل إدارة المال تبدو أصعب ممّا يجب أن تكون.',
      concept:
        'الحقيقة الأولى: المال ليس هدفًا في ذاته، بل أداة. وللمال ثلاث وظائف أساسية. أولًا، وسيلة للتبادل تُغنيك عن مقايضة السلع. وثانيًا، مخزن للقيمة يحفظ قدرتك الشرائية إلى وقتٍ لاحق. وثالثًا، وحدة للقياس تتيح لك مقارنة قيمة الأشياء برقمٍ واحد.',
      data:
        'ولنترجم ذلك إلى خطوةٍ عملية، إليك قاعدة خمسين وثلاثين وعشرين لتقسيم دخلك الشهري. خمسون بالمئة للاحتياجات كالسكن والطعام. وثلاثون بالمئة للرغبات كالترفيه. وعشرون بالمئة للادّخار وسداد الديون. إنها ليست قانونًا صارمًا، بل نقطة انطلاق تمنح كل ريالٍ وظيفةً واضحة.',
      recap:
        'حين تفهم أنّ المال أداة، وتمنح كلّ جزءٍ منه وظيفة، تتحوّل الميزانية من قيدٍ يُثقلك إلى أداةٍ تمنحك الحريّة وراحة البال.',
      outro: 'هذه كانت البداية. ابدأ الدرس الأول كاملًا، مجّانًا، من هنا.',
    },
    en: {
      title:
        "Welcome — glad you're here. Before we talk about saving or investing, let's start with the foundation: what is money, really?",
      hook:
        'Most of us use money every day, yet very few were ever taught how it actually works. That small gap in understanding is what makes managing money feel harder than it should.',
      concept:
        "The first truth: money isn't a goal in itself — it's a tool. And it does three jobs. First, a medium of exchange, so you don't have to barter. Second, a store of value, holding your purchasing power for later. And third, a unit of account, letting you compare the worth of things with a single number.",
      data:
        "Let's turn that into one practical move: the fifty–thirty–twenty rule for splitting your monthly income. Fifty percent for needs, like housing and food. Thirty percent for wants, like entertainment. And twenty percent for savings and paying down debt. It isn't a strict law — it's a starting point that gives every dinar a clear job.",
      recap:
        'Once you see money as a tool, and give every part of it a job, a budget stops being a limit that weighs on you and becomes something that buys you freedom and peace of mind.',
      outro: 'That was just the start. Begin the full first lesson, free, right here.',
    },
  },
};

export const isRTL = (locale: Locale) => locale === 'ar';
