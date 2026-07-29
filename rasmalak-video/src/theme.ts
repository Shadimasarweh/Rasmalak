/**
 * Canonical Rasmalak design tokens, mirrored from the app's globals.css so
 * rendered video is visually identical to the product. Purple/violet/indigo
 * are intentionally absent — they are not part of the design system.
 */
export const theme = {
  bgPage: '#F5F0EB', // cream page background
  bgCard: '#FFFFFF',
  bgDark: '#0F1914', // dark glass card surface
  primary: '#2D6A4F', // buttons, active states, progress fills
  primaryLight: '#F0F7F4', // tinted backgrounds
  accentGold: '#D97706', // achievements / badges only
  ink: '#16211C', // primary text on light
  inkInverse: '#F5F0EB', // text on dark
  muted: '#5C6B63', // secondary text
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;
