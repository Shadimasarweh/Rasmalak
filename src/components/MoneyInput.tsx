'use client';

import { CSSProperties, forwardRef } from 'react';

/**
 * MoneyInput
 * ==========
 * Drop-in replacement for `<input type="number">` for any field that
 * accepts a money amount.
 *
 * Why this exists:
 *   `<input type="number">` lets the browser mutate the value via
 *   spinner arrows, keyboard up/down, AND mouse-wheel / trackpad scroll.
 *   On macOS trackpads the wheel events fire on the slightest gesture,
 *   so a focused number input can drift from "500" to "499.98" with a
 *   two-tick scroll at step="0.01". This was the source of the
 *   long-standing "user typed 500 but the saved record is 499.98" bug.
 *
 * What we do:
 *   - Render `type="text"` so wheel/arrow/spinner mutations are
 *     impossible.
 *   - Set `inputMode="decimal"` so mobile still gets the numeric
 *     keypad (+ decimal separator depending on locale).
 *   - Sanitise input on every keystroke: keep digits and a single
 *     decimal point only. Reject everything else silently.
 *   - Exposed value matches what `parseFloat(value)` sees in the
 *     submit handler — no surprises.
 *
 * Note: the component intentionally does not format with thousands
 * separators while typing, because doing that synchronously while
 * the user is mid-typing breaks caret positioning and is rarely
 * worth the complexity. Display-time formatting is the responsibility
 * of the parent (it already shows a formatted preview below).
 */

interface MoneyInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
  id?: string;
  /**
   * If true, only integers are accepted (no decimal point). Useful
   * for whole-currency fields like "income range" or in countries
   * where fractional units are uncommon.
   */
  integerOnly?: boolean;
  /** Optional onBlur passthrough so callers can normalise on blur. */
  onBlur?: () => void;
}

function sanitiseAmountString(raw: string, integerOnly: boolean): string {
  if (!raw) return '';
  // Replace common alt separators (Arabic decimal, comma) with '.'.
  let normalised = raw
    .replace(/[\u066B\u066C]/g, '.') // Arabic decimal separator + thousands separator
    .replace(/,/g, '.');
  // Strip everything except digits and the decimal point.
  normalised = normalised.replace(/[^\d.]/g, '');
  if (integerOnly) {
    return normalised.replace(/\./g, '');
  }
  // Collapse multiple dots to a single one, keeping the first.
  const firstDot = normalised.indexOf('.');
  if (firstDot !== -1) {
    normalised =
      normalised.slice(0, firstDot + 1) +
      normalised.slice(firstDot + 1).replace(/\./g, '');
  }
  // Trim any accidental leading zeros (but keep "0." and "0" itself).
  if (/^0\d/.test(normalised)) {
    normalised = normalised.replace(/^0+/, '');
    if (normalised.startsWith('.')) normalised = '0' + normalised;
  }
  return normalised;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(props, ref) {
    const {
      value,
      onChange,
      placeholder,
      autoFocus,
      disabled,
      style,
      className,
      ariaLabel,
      id,
      integerOnly = false,
      onBlur,
    } = props;

    return (
      <input
        ref={ref}
        // type="text" + inputMode="decimal" gets the mobile numeric
        // keypad without enabling browser-driven mutation.
        type="text"
        inputMode={integerOnly ? 'numeric' : 'decimal'}
        // autoComplete=off prevents browsers from suggesting prior
        // numeric values that may include separators we don't expect.
        autoComplete="off"
        // Hint to mobile that this is a financial field; some keyboards
        // include a decimal point only when this is set explicitly.
        pattern={integerOnly ? '[0-9]*' : '[0-9]*[.]?[0-9]*'}
        value={value}
        onChange={(e) => onChange(sanitiseAmountString(e.target.value, integerOnly))}
        // Belt-and-suspenders: even if a future platform somehow
        // surfaces wheel events on text inputs, blur on wheel makes
        // it impossible to mutate the value via scroll.
        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        // Block keyboard arrow up/down so they can't jump the caret to
        // unexpected values when the field is paired with parent-level
        // shortcut handlers.
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
          }
        }}
        onBlur={onBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        style={style}
        className={className}
        aria-label={ariaLabel}
        id={id}
      />
    );
  },
);
