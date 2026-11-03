import { useId } from 'react';
import { LinearGradient, RadialGradient, Stop } from 'react-native-svg';

/** Blend two hex colours, t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 0xff) * (1 - t) + ((pb >> shift) & 0xff) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

export const lighten = (hex: string, t: number) => mix(hex, '#FFFFFF', t);
export const darken = (hex: string, t: number) => mix(hex, '#1A1028', t);

/** Soft toon outline shared by every character shape. */
export const OUTLINE = { stroke: '#2A1F3D', strokeOpacity: 0.22, strokeWidth: 1.4 } as const;

/** SVG gradient ids must be unique per drawing, or several characters on one screen share fills. */
export function useGradientIds() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name: string) => ({ id: `${name}${uid}`, url: `url(#${name}${uid})` });
}

/** "Lit from the top-left" sphere shading: highlight, base, then core shadow. */
export function Ball({ id, color }: { id: string; color: string }) {
  return (
    <RadialGradient id={id} cx="38%" cy="32%" rx="70%" ry="70%" fx="34%" fy="26%">
      <Stop offset="0" stopColor={lighten(color, 0.45)} />
      <Stop offset="0.45" stopColor={color} />
      <Stop offset="1" stopColor={darken(color, 0.35)} />
    </RadialGradient>
  );
}

/** Top-to-bottom shading for cloth, hair and limbs. */
export function Drop({ id, color, from = 0.25, to = 0.3 }: { id: string; color: string; from?: number; to?: number }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
      <Stop offset="0" stopColor={lighten(color, from)} />
      <Stop offset="1" stopColor={darken(color, to)} />
    </LinearGradient>
  );
}

/** Soft fade-out blob, used for blush and ground shadows. */
export function Glow({ id, color, opacity = 1 }: { id: string; color: string; opacity?: number }) {
  return (
    <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

/** Glossy eye: dark at the top, iris colour glowing up from the bottom. */
export function Iris({ id, color }: { id: string; color: string }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor="#120C1E" />
      <Stop offset="0.55" stopColor={darken(color, 0.35)} />
      <Stop offset="1" stopColor={lighten(color, 0.25)} />
    </LinearGradient>
  );
}
