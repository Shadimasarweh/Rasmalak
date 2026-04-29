'use client';

/**
 * Lightweight inline markdown renderer for chat messages.
 *
 * Why not react-markdown? The chatbot only ever emits a small subset of
 * markdown — bold and italic — and we want zero new dependencies. This
 * supports exactly what's needed:
 *   **bold**   __bold__
 *   *italic*   _italic_
 *
 * It also escapes nothing — the upstream sanitizer in src/app/api/chat/route.ts
 * already strips <script>, <iframe>, event handlers, etc. before content
 * reaches the client, so plain text rendering is safe.
 *
 * Limitations (intentional): no links, no headings, no lists, no inline
 * code. The chat agent's prompt explicitly forbids structured headings,
 * so anything beyond inline emphasis would just add bundle weight.
 */

import { Fragment, type ReactNode } from 'react';

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string };

/**
 * Tokenize a single line of text into plain/bold/italic runs.
 * Bold is checked before italic because `**x**` would otherwise be
 * mis-parsed as `*` + `*x*` + `*`.
 */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    const rest = line.slice(i);

    // **bold** or __bold__
    const boldMatch = rest.match(/^(\*\*|__)([\s\S]+?)\1/);
    if (boldMatch) {
      tokens.push({ kind: 'bold', value: boldMatch[2] });
      i += boldMatch[0].length;
      continue;
    }

    // *italic* or _italic_  — single delimiter, not part of a stray word
    // Reject `_` when it's flanked by word chars (e.g. snake_case, my_var).
    const italicMatch = rest.match(/^(\*|_)([^\s*_][\s\S]*?[^\s*_]|[^\s*_])\1/);
    if (italicMatch) {
      const delim = italicMatch[1];
      const before = i > 0 ? line[i - 1] : '';
      const after = line[i + italicMatch[0].length] ?? '';
      // Skip underscore italics that look like identifiers (foo_bar_baz).
      if (delim === '_' && (/\w/.test(before) || /\w/.test(after))) {
        tokens.push({ kind: 'text', value: line[i] });
        i += 1;
        continue;
      }
      tokens.push({ kind: 'italic', value: italicMatch[2] });
      i += italicMatch[0].length;
      continue;
    }

    // Plain text: take everything up to the next potential delimiter.
    const next = rest.search(/\*\*|__|\*|_/);
    const chunkLen = next === -1 ? rest.length : Math.max(1, next);
    tokens.push({ kind: 'text', value: rest.slice(0, chunkLen) });
    i += chunkLen;
  }

  return tokens;
}

function renderTokens(tokens: Token[], lineKey: string): ReactNode {
  return tokens.map((tok, idx) => {
    const key = `${lineKey}-${idx}`;
    if (tok.kind === 'bold') return <strong key={key}>{tok.value}</strong>;
    if (tok.kind === 'italic') return <em key={key}>{tok.value}</em>;
    return <Fragment key={key}>{tok.value}</Fragment>;
  });
}

interface MarkdownTextProps {
  text: string;
}

/**
 * Render text with inline markdown emphasis. Newlines are preserved by
 * the parent's `whiteSpace: pre-wrap` so we don't insert <br> here.
 */
export default function MarkdownText({ text }: MarkdownTextProps) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        const tokens = tokenizeLine(line);
        return (
          <Fragment key={i}>
            {renderTokens(tokens, String(i))}
            {!isLast && '\n'}
          </Fragment>
        );
      })}
    </>
  );
}
