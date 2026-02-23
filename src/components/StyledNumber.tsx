'use client';

import { ReactNode } from 'react';

const DECIMAL_STYLE: React.CSSProperties = {
  fontSize: '0.65em',
  opacity: 0.55,
  fontWeight: 400,
};

/**
 * Takes a formatted number string and renders the decimal portion
 * (after . or ٫) smaller and lighter for visual clarity.
 */
export function styledNum(formatted: string): ReactNode {
  const match = formatted.match(/^(.*?)([.٫])(.*)$/);
  if (!match) return <>{formatted}</>;
  const [, main, sep, decimals] = match;
  return (
    <>
      {main}
      <span style={DECIMAL_STYLE}>
        {sep}
        {decimals}
      </span>
    </>
  );
}
