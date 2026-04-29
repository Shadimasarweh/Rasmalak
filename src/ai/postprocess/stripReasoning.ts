/**
 * Reasoning / step-label stripper
 * ===============================
 * Defensive post-processor that runs on every LLM reply before it leaves
 * the orchestrator. It exists because two things have been leaking into
 * user-facing chat replies:
 *
 *   1. Gemini thinking models occasionally emit a thought summary even when
 *      `includeThoughts: false` is set in the request (preview model bug).
 *   2. The chat agent's methodology used to encourage **bold step labels**
 *      ("Acknowledge:", "Assess:", "خطوة ١:" ...) which the model would
 *      mirror verbatim into the reply.
 *
 * Both cases produce text that reads like internal scaffolding rather than
 * the conversational answer the user wants. We strip them here as a safety
 * net — the prompt should also be doing its part (see chatAgent.ts).
 */

// Lines that introduce a reasoning block — drop entire line and anything
// before the first real content line that follows.
const LEADING_REASONING_BLOCK = new RegExp(
  '^(?:\\s*(?:' +
    [
      // English markers
      'Thinking',
      'Thought',
      'Reasoning',
      'Internal (?:thoughts?|reasoning|monologue)',
      'Chain of thought',
      'Scratchpad',
      'Plan',
      'Analysis',
      // Arabic markers
      'تفكير',
      'التفكير',
      'تحليل داخلي',
      'خطة الرد',
      'مسودة',
    ].join('|') +
    ')\\s*[:：]\\s*.*\\n+)+',
  'i'
);

// Step labels at the start of a line: `**Acknowledge:**`, `1. Assess:`,
// `**خطوة ١:**`, `الخطوة الأولى:` etc. We strip the label, keep the content.
const STEP_LABEL_LINE = new RegExp(
  '^\\s*(?:[*_]{1,2}\\s*)?' +
    '(?:\\d+[.)]\\s*)?' +
    '(?:[*_]{1,2}\\s*)?' +
    '(?:' +
    [
      // English methodology labels
      'Acknowledge',
      'Assess(?:ment)?',
      'Identify',
      'Recommend(?:ation)?',
      'Ask',
      'Step\\s*\\d+',
      // Arabic methodology labels
      'افهم',
      'اعترف',
      'قيّم',
      'قيم',
      'حدّد',
      'حدد',
      'أوصِ',
      'أوصي',
      'اسأل',
      'الخطوة\\s*[\\u0660-\\u0669\\d١٢٣٤٥٦٧٨٩٠]+',
      'خطوة\\s*[\\u0660-\\u0669\\d١٢٣٤٥٦٧٨٩٠]+',
    ].join('|') +
    ')' +
    '(?:[*_]{1,2}\\s*)?\\s*[:：—-]\\s*',
  'im'
);

/**
 * Strip leading reasoning blocks and inline step labels.
 * Pure: returns the cleaned text without modifying input.
 */
export function stripReasoning(text: string): string {
  if (!text) return text;

  let cleaned = text.replace(LEADING_REASONING_BLOCK, '');

  cleaned = cleaned
    .split('\n')
    .map((line) => {
      // Strip the label prefix; preserve everything after it on the same line.
      // If the line is *only* a label (no content), drop it entirely.
      const replaced = line.replace(STEP_LABEL_LINE, '');
      if (replaced.trim().length === 0 && STEP_LABEL_LINE.test(line)) {
        return '';
      }
      return replaced;
    })
    .filter((line, idx, arr) => {
      // Collapse runs of blank lines that appear after stripping.
      if (line.trim().length === 0 && idx > 0 && arr[idx - 1].trim().length === 0) {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();

  return cleaned;
}
