// Questie palette: playful colours with chunky "3D" edges (each colour has a darker edge),
// sitting on calm, Apple-style grouped backgrounds.
export const palette = {
  violet: '#7C5CFF',
  violetEdge: '#5F3FE0',
  mint: '#22C58B',
  mintEdge: '#18A272',
  sky: '#3BA7FF',
  skyEdge: '#2489DE',
  coral: '#FF5A6E',
  coralEdge: '#E23E53',
  orange: '#FF8A1F',
  orangeEdge: '#E06F07',
  gold: '#FFC233',
  goldEdge: '#E0A615',
  pink: '#FF7AC6',
  pinkEdge: '#E05AA8',
  white: '#FFFFFF',
};

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryEdge: string;
  primarySoft: string;
  success: string;
  successEdge: string;
  info: string;
  infoEdge: string;
  danger: string;
  dangerEdge: string;
  streak: string;
  xp: string;
  coin: string;
  tabInactive: string;
};

export const lightColors: ThemeColors = {
  bg: '#F5F4FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEDF7',
  border: '#E3E0EE',
  text: '#2B2640',
  textMuted: '#77728A',
  primary: palette.violet,
  primaryEdge: palette.violetEdge,
  primarySoft: '#EEE9FF',
  success: palette.mint,
  successEdge: palette.mintEdge,
  info: palette.sky,
  infoEdge: palette.skyEdge,
  danger: palette.coral,
  dangerEdge: palette.coralEdge,
  streak: palette.orange,
  xp: palette.gold,
  coin: palette.gold,
  tabInactive: '#8C879E',
};

export const darkColors: ThemeColors = {
  bg: '#14121F',
  surface: '#1E1B2E',
  surfaceAlt: '#27233A',
  border: '#34304A',
  text: '#F3F1FA',
  textMuted: '#A19BB8',
  primary: palette.violet,
  primaryEdge: palette.violetEdge,
  primarySoft: '#2C2550',
  success: palette.mint,
  successEdge: palette.mintEdge,
  info: palette.sky,
  infoEdge: palette.skyEdge,
  danger: palette.coral,
  dangerEdge: palette.coralEdge,
  streak: palette.orange,
  xp: palette.gold,
  coin: palette.gold,
  tabInactive: '#A19BB8',
};

export const fonts = {
  regular: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Darkens a hex color — used to derive the 3D edge of arbitrary colors. */
export function shade(hex: string, amount = 0.18): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const r = f(n >> 16), g = f((n >> 8) & 0xff), b = f(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Hex color with alpha, e.g. tint('#7C5CFF', 0.15) */
export function tint(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}
