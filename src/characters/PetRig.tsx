import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { PetSpecies } from '@/data/types';
import type { Mood } from '@/game/engine';
import { darken, lighten } from './paint';

/**
 * A pet built from separate moving parts (legs, tail, wings, head, eyes, jaw) so it can really walk,
 * chew, blink and smile. Everything is drawn side-on facing right in a 120×120 box; a parent flips it
 * with scaleX to face left. Each part sits in its own full-size layer that rotates about a joint.
 */

export type RigMood = Mood | 'sleep';
export type RigAction = 'idle' | 'walk' | 'eat' | 'chew' | 'draw' | 'wave';

const INK = '#2A1F3D';
const LINE = { stroke: INK, strokeOpacity: 0.55, strokeWidth: 1.4, strokeLinejoin: 'round' as const };
const GROUND = 108;
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Body proportions per growth stage: chubby chibi baby → long-necked, big-winged legend. */
const STAGES = [
  { r: 25, rx: 24, ry: 19, L: 9, lw: 9, n: 0, tail: 0.6, wing: 0.55, horn: 0.45, scale: 0.78 },
  { r: 21, rx: 25, ry: 17, L: 12, lw: 8, n: 4, tail: 0.8, wing: 0.75, horn: 0.7, scale: 0.86 },
  { r: 18, rx: 27, ry: 16, L: 15, lw: 7.5, n: 9, tail: 1, wing: 0.95, horn: 0.9, scale: 0.94 },
  { r: 16, rx: 29, ry: 15, L: 18, lw: 7.5, n: 13, tail: 1.1, wing: 1.2, horn: 1.1, scale: 1 },
  { r: 15.5, rx: 30, ry: 15, L: 19, lw: 8, n: 14, tail: 1.2, wing: 1.35, horn: 1.25, scale: 1 },
];

type Palette = { body: string; belly: string; wing: string; horn: string; eye: string; accent: string };

/** Colours shift as the pet grows; the dragon goes gold → green → emerald → midnight. */
function paletteFor(species: PetSpecies, stage: number): Palette {
  if (species === 'dino') {
    return [
      { body: '#F2C14E', belly: '#FFF0C2', wing: '#5DBE7A', horn: '#F6E3B4', eye: '#1E9C8F', accent: '#5DBE7A' },
      { body: '#6CCB7E', belly: '#FFF3C9', wing: '#F5A54A', horn: '#FFF1D6', eye: '#7A55E8', accent: '#F5A54A' },
      { body: '#3FAE73', belly: '#FFE7A8', wing: '#F28C3A', horn: '#FFF1D6', eye: '#D9572A', accent: '#F28C3A' },
      { body: '#1F8A5B', belly: '#F6D27A', wing: '#E2563B', horn: '#FFF6E0', eye: '#FFB21E', accent: '#E2563B' },
      { body: '#2B3C8F', belly: '#F2C14E', wing: '#7B2FBF', horn: '#FFE6A3', eye: '#FFD34D', accent: '#F2C14E' },
    ][stage];
  }
  if (species === 'bunny') {
    const legend = stage >= 4;
    return { body: legend ? '#F4EEFF' : '#EEE8FF', belly: '#FFFFFF', wing: '#FF9ACB', horn: '#FF9ACB', eye: '#7A55E8', accent: legend ? '#FFC233' : '#FF8CC4' };
  }
  const legend = stage >= 4;
  return { body: legend ? '#FFC24D' : '#FFAE5C', belly: '#FFE6C7', wing: '#E07F2C', horn: '#FF9ACB', eye: '#2E9E6A', accent: '#E07F2C' };
}

type Pt = { x: number; y: number };

/** Joint positions for a stage, in the 120×120 box. */
export function rigGeometry(stage: number) {
  const s = STAGES[Math.max(0, Math.min(4, stage))];
  const bx = 50;
  const by = GROUND - s.L - s.ry * 0.5;
  const hipY = by + s.ry * 0.45;
  const backHip = { x: bx - s.rx * 0.5, y: hipY };
  const frontHip = { x: bx + s.rx * 0.45, y: hipY };
  const neck = { x: bx + s.rx * 0.62, y: by - s.ry * 0.35 };
  const head = { x: neck.x + 4 + s.n * 0.45, y: neck.y - s.n - s.r * 0.5 };
  const wingRoot = { x: bx + s.rx * 0.05, y: by - s.ry * 0.7 };
  const tailBase = { x: bx - s.rx * 0.85, y: by + 2 };
  return { s, bx, by, backHip, frontHip, neck, head, wingRoot, tailBase };
}

/** Where the mouth is, so food can be placed right in front of it. */
export function mouthPoint(species: PetSpecies, stage: number): Pt {
  const { s, head } = rigGeometry(stage);
  const m = species === 'dino' ? { x: head.x + s.r * 0.72, y: head.y + s.r * 0.45 } : { x: head.x + s.r * 0.55, y: head.y + s.r * 0.38 };
  return scalePoint(m, s.scale);
}

/** Tip of the pencil when the front paw is raised to draw (facing right), in the 120×120 box. */
export function pencilTip(stage: number): Pt {
  const { s, frontHip } = rigGeometry(stage);
  const reach = GROUND - frontHip.y + 12;
  // The leg is raised -100°: it points forward and a little up
  const a = (-100 * Math.PI) / 180;
  const tip = { x: frontHip.x - Math.sin(a) * reach, y: frontHip.y + Math.cos(a) * reach };
  return scalePoint(tip, s.scale);
}

/** The whole rig is scaled about its bottom centre so young pets stand on the same ground. */
function scalePoint(p: Pt, k: number): Pt {
  return { x: 60 + (p.x - 60) * k, y: 120 + (p.y - 120) * k };
}

/** A full-size layer that rotates about a joint. */
function Joint({ size, pivot, style, children }: { size: number; pivot: Pt; style?: object; children: ReactNode }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [(pivot.x / 120) * size, (pivot.y / 120) * size, 0] }, style]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {children}
      </Svg>
    </Animated.View>
  );
}

function Leg({ hip, len, w, color, paw, pencil }: { hip: Pt; len: number; w: number; color: string; paw: string; pencil?: boolean }) {
  const bottom = hip.y + len;
  return (
    <G>
      {pencil && (
        <G>
          <Rect x={hip.x - 1.6} y={bottom - 2} width={3.2} height={11} rx={0.8} fill="#FFC233" stroke={INK} strokeWidth={0.6} />
          <Path d={`M${hip.x - 1.6} ${bottom + 9} L${hip.x} ${bottom + 13} L${hip.x + 1.6} ${bottom + 9} Z`} fill="#F6D9A8" stroke={INK} strokeWidth={0.5} />
          <Circle cx={hip.x} cy={bottom + 12.3} r={0.7} fill={INK} />
          <Rect x={hip.x - 1.6} y={bottom - 3.5} width={3.2} height={2} fill="#FF8CC4" />
        </G>
      )}
      <Path
        d={`M${hip.x - w / 2} ${hip.y - 2} L${hip.x - w / 2} ${bottom - 3} Q${hip.x - w / 2} ${bottom} ${hip.x} ${bottom} Q${hip.x + w / 2} ${bottom} ${hip.x + w / 2} ${bottom - 3} L${hip.x + w / 2} ${hip.y - 2} Z`}
        fill={color}
        {...LINE}
      />
      <Ellipse cx={hip.x + 1.2} cy={bottom - 1.5} rx={w * 0.66} ry={2.8} fill={paw} {...LINE} />
    </G>
  );
}

type FaceProps = { species: PetSpecies; stage: number; mood: RigMood; pal: Palette; accessory: string | null };

/** Eyes for the current mood (blinking is done by squashing this layer). */
function Eyes({ species, stage, mood, pal }: FaceProps) {
  const { s, head } = rigGeometry(stage);
  const r = s.r;
  const eyes = [
    { x: head.x + r * (species === 'dino' ? 0.05 : 0.12), y: head.y - r * 0.08, e: r * 0.27 },
    { x: head.x + r * (species === 'dino' ? 0.48 : 0.58), y: head.y - r * 0.12, e: r * 0.2 },
  ];
  if (mood === 'celebrate' || mood === 'sleep') {
    // Closed eyes: happy "^" arcs, or relaxed downward curves when asleep
    return (
      <G>
        {eyes.map((p) => (
          <Path
            key={p.x}
            d={
              mood === 'celebrate'
                ? `M${p.x - p.e} ${p.y + p.e * 0.4} Q${p.x} ${p.y - p.e * 1.1} ${p.x + p.e} ${p.y + p.e * 0.4}`
                : `M${p.x - p.e} ${p.y} Q${p.x} ${p.y + p.e * 0.8} ${p.x + p.e} ${p.y}`
            }
            stroke={INK}
            strokeWidth={Math.max(1.4, p.e * 0.32)}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </G>
    );
  }
  return (
    <G>
      {eyes.map((p) => (
        <G key={p.x}>
          <Ellipse cx={p.x} cy={p.y} rx={p.e} ry={p.e * 1.18} fill="#FFFFFF" {...LINE} />
          <Ellipse cx={p.x + p.e * 0.12} cy={p.y + p.e * 0.08} rx={p.e * 0.78} ry={p.e * 0.95} fill={pal.eye} />
          <Ellipse cx={p.x + p.e * 0.15} cy={p.y + p.e * 0.12} rx={p.e * 0.45} ry={p.e * 0.6} fill="#120C1E" />
          <Circle cx={p.x + p.e * 0.42} cy={p.y - p.e * 0.38} r={p.e * 0.3} fill="#FFFFFF" />
          <Circle cx={p.x - p.e * 0.2} cy={p.y + p.e * 0.45} r={p.e * 0.13} fill="#FFFFFF" />
          {mood === 'sad' && (
            <G>
              {/* heavy upper lid and a worried brow */}
              <Path d={`M${p.x - p.e * 1.15} ${p.y - p.e * 0.15} Q${p.x} ${p.y - p.e * 1.5} ${p.x + p.e * 1.15} ${p.y - p.e * 0.45} L${p.x + p.e * 1.2} ${p.y - p.e * 1.4} L${p.x - p.e * 1.2} ${p.y - p.e * 1.4} Z`} fill={pal.body} />
              <Path d={`M${p.x - p.e} ${p.y - p.e * 1.2} L${p.x + p.e * 0.9} ${p.y - p.e * 1.7}`} stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
            </G>
          )}
        </G>
      ))}
    </G>
  );
}

/** Head shape with species features; drawn under the eyes and mouth. */
function HeadShape({ species, stage, mood, pal, accessory }: FaceProps) {
  const { s, head } = rigGeometry(stage);
  const r = s.r;
  const legendary = stage >= 4;
  const blush = mood === 'happy' || mood === 'celebrate';
  return (
    <G>
      {species === 'dino' && (
        <G>
          {/* swept-back horns grow with each stage */}
          <Path
            d={`M${head.x - r * 0.45} ${head.y - r * 0.55} Q${head.x - r * (0.7 + 0.3 * s.horn)} ${head.y - r * (0.9 + 0.35 * s.horn)} ${head.x - r * (0.95 + 0.45 * s.horn)} ${head.y - r * (1.05 + 0.4 * s.horn)} Q${head.x - r * 0.55} ${head.y - r * 0.95} ${head.x - r * 0.1} ${head.y - r * 0.8} Z`}
            fill={legendary ? '#FFD34D' : pal.horn}
            {...LINE}
          />
          <Path
            d={`M${head.x - r * 0.05} ${head.y - r * 0.85} Q${head.x - r * 0.15} ${head.y - r * (1.2 + 0.35 * s.horn)} ${head.x - r * (0.4 + 0.3 * s.horn)} ${head.y - r * (1.3 + 0.45 * s.horn)} Q${head.x + r * 0.05} ${head.y - r * 1.15} ${head.x + r * 0.3} ${head.y - r * 0.82} Z`}
            fill={legendary ? '#FFD34D' : pal.horn}
            {...LINE}
          />
        </G>
      )}
      {species === 'cat' && (
        <G>
          <Path d={`M${head.x - r * 0.75} ${head.y - r * 0.45} L${head.x - r * 0.7} ${head.y - r * 1.3} L${head.x - r * 0.05} ${head.y - r * 0.85} Z`} fill={darken(pal.body, 0.08)} {...LINE} />
          <Path d={`M${head.x + r * 0.05} ${head.y - r * 0.9} L${head.x + r * 0.45} ${head.y - r * 1.45} L${head.x + r * 0.78} ${head.y - r * 0.5} Z`} fill={pal.body} {...LINE} />
          <Path d={`M${head.x + r * 0.2} ${head.y - r * 0.85} L${head.x + r * 0.45} ${head.y - r * 1.2} L${head.x + r * 0.62} ${head.y - r * 0.6} Z`} fill={pal.horn} />
        </G>
      )}
      {species === 'bunny' && (
        <G>
          <Ellipse cx={head.x - r * 0.35} cy={head.y - r * 1.35} rx={r * 0.28} ry={r * 0.85} fill={darken(pal.body, 0.06)} transform={`rotate(-18 ${head.x - r * 0.35} ${head.y - r * 0.6})`} {...LINE} />
          <Ellipse cx={head.x + r * 0.2} cy={head.y - r * 1.4} rx={r * 0.3} ry={r * 0.9} fill={pal.body} transform={`rotate(8 ${head.x + r * 0.2} ${head.y - r * 0.6})`} {...LINE} />
          <Ellipse cx={head.x + r * 0.2} cy={head.y - r * 1.35} rx={r * 0.14} ry={r * 0.65} fill={pal.horn} transform={`rotate(8 ${head.x + r * 0.2} ${head.y - r * 0.6})`} />
        </G>
      )}

      <Circle cx={head.x} cy={head.y} r={r} fill={pal.body} {...LINE} />
      {/* soft light on the top-left of the head */}
      <Ellipse cx={head.x - r * 0.3} cy={head.y - r * 0.45} rx={r * 0.45} ry={r * 0.3} fill="#FFFFFF" opacity={0.28} />

      {species === 'dino' && (
        <G>
          {/* snout pushing forward, with a nostril */}
          <Ellipse cx={head.x + r * 0.62} cy={head.y + r * 0.3} rx={r * 0.58} ry={r * 0.42} fill={lighten(pal.body, 0.08)} {...LINE} />
          <Ellipse cx={head.x + r * 1.0} cy={head.y + r * 0.12} rx={r * 0.07} ry={r * 0.05} fill={INK} />
          {/* little crest spikes on the back of the head */}
          <Path d={`M${head.x - r * 0.95} ${head.y - r * 0.1} l${-r * 0.3} ${-r * 0.12} l${r * 0.2} ${r * 0.3} l${-r * 0.28} ${r * 0.05} l${r * 0.36} ${r * 0.25} Z`} fill={pal.wing} {...LINE} />
        </G>
      )}
      {species === 'cat' && (
        <G>
          <Path d={`M${head.x - r * 0.3} ${head.y - r * 0.85} l${r * 0.05} ${r * 0.3} M${head.x - r * 0.05} ${head.y - r * 0.9} l0 ${r * 0.3}`} stroke={pal.wing} strokeWidth={1.6} strokeLinecap="round" />
          <Path d={`M${head.x + r * 0.58} ${head.y + r * 0.12} l${r * 0.14} 0 l${-r * 0.07} ${r * 0.1} Z`} fill={pal.horn} />
          <Path d={`M${head.x + r * 0.75} ${head.y + r * 0.3} l${r * 0.45} ${-r * 0.08} M${head.x + r * 0.75} ${head.y + r * 0.4} l${r * 0.45} ${r * 0.05}`} stroke={INK} strokeOpacity={0.5} strokeWidth={0.8} />
        </G>
      )}
      {species === 'bunny' && <Ellipse cx={head.x + r * 0.66} cy={head.y + r * 0.15} rx={r * 0.1} ry={r * 0.08} fill={pal.horn} />}

      {blush && (
        <G>
          <Ellipse cx={head.x - r * 0.05} cy={head.y + r * 0.35} rx={r * 0.18} ry={r * 0.1} fill="#FF6FA8" opacity={0.45} />
          <Ellipse cx={head.x + r * 0.5} cy={head.y + r * 0.32} rx={r * 0.13} ry={r * 0.08} fill="#FF6FA8" opacity={0.4} />
        </G>
      )}
      {mood === 'sad' && <Path d={`M${head.x - r * 0.05} ${head.y + r * 0.15} q${r * 0.12} ${r * 0.25} 0 ${r * 0.35} q${-r * 0.12} ${-r * 0.1} 0 ${-r * 0.35} Z`} fill="#7CC6FF" />}

      {/* worn on the head */}
      {legendary && (
        <G>
          <Path d={`M${head.x - r * 0.45} ${head.y - r * 0.82} L${head.x - r * 0.4} ${head.y - r * 1.25} L${head.x - r * 0.15} ${head.y - r * 1.02} L${head.x + r * 0.05} ${head.y - r * 1.38} L${head.x + r * 0.2} ${head.y - r * 1.02} L${head.x + r * 0.45} ${head.y - r * 1.25} L${head.x + r * 0.45} ${head.y - r * 0.82} Z`} fill="#FFC233" {...LINE} />
          <Circle cx={head.x + r * 0.05} cy={head.y - r * 1.02} r={r * 0.08} fill="#FF4D5E" />
        </G>
      )}
      {accessory === 'party_hat' && !legendary && (
        <G>
          <Path d={`M${head.x - r * 0.5} ${head.y - r * 0.8} L${head.x + r * 0.05} ${head.y - r * 1.85} L${head.x + r * 0.5} ${head.y - r * 0.82} Q${head.x} ${head.y - r * 0.68} ${head.x - r * 0.5} ${head.y - r * 0.8} Z`} fill="#7C5CFF" {...LINE} />
          <Path d={`M${head.x - r * 0.3} ${head.y - r * 1.15} L${head.x + r * 0.3} ${head.y - r * 1.15}`} stroke="#FFC233" strokeWidth={2} />
          <Circle cx={head.x + r * 0.05} cy={head.y - r * 1.85} r={r * 0.14} fill="#FF7AC6" {...LINE} />
        </G>
      )}
      {accessory === 'bow' && (
        <G>
          <Path d={`M${head.x - r * 0.55} ${head.y - r * 0.75} l${-r * 0.4} ${-r * 0.28} l0 ${r * 0.56} Z M${head.x - r * 0.55} ${head.y - r * 0.75} l${r * 0.4} ${-r * 0.28} l0 ${r * 0.56} Z`} fill="#FF7AC6" {...LINE} />
          <Circle cx={head.x - r * 0.55} cy={head.y - r * 0.75} r={r * 0.13} fill="#FF4FA8" />
        </G>
      )}
      {accessory === 'shades' && (
        <G>
          <Path d={`M${head.x - r * 0.35} ${head.y - r * 0.22} L${head.x + r * 0.85} ${head.y - r * 0.28}`} stroke={INK} strokeWidth={1.6} />
          <Ellipse cx={head.x + r * 0.08} cy={head.y - r * 0.05} rx={r * 0.33} ry={r * 0.24} fill="#2A1F3D" />
          <Ellipse cx={head.x + r * 0.58} cy={head.y - r * 0.08} rx={r * 0.24} ry={r * 0.2} fill="#2A1F3D" />
          <Path d={`M${head.x - r * 0.05} ${head.y - r * 0.15} l${r * 0.12} 0`} stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
        </G>
      )}
    </G>
  );
}

const SMILE: Record<RigMood, number> = { happy: 1, celebrate: 1.4, idle: 0.45, sad: -1, sleep: 0.15 };

type Props = {
  species: PetSpecies;
  stage?: number;
  mood?: RigMood;
  action?: RigAction;
  size?: number;
  accessory?: string | null;
  /** Off for small previews: a still pose, no running animations */
  animated?: boolean;
};

export function PetRig({ species, stage = 0, mood = 'happy', action = 'idle', size = 90, accessory = null, animated = true }: Props) {
  const st = Math.max(0, Math.min(4, stage));
  const g = rigGeometry(st);
  const { s, bx, by, backHip, frontHip, neck, head, wingRoot, tailBase } = g;
  const pal = paletteFor(species, st);
  const dragon = species === 'dino';
  const legLen = GROUND - backHip.y;
  const farColor = darken(pal.body, 0.22);
  const paw = darken(pal.body, 0.12);

  const cycle = useSharedValue(0); // walk cycle 0..1
  const breath = useSharedValue(0); // slow idle loop 0..1
  const walk = useSharedValue(0); // how much the legs swing
  const jaw = useSharedValue(mood === 'celebrate' ? 0.35 : 0);
  const tilt = useSharedValue(0); // head nod, degrees
  const arm = useSharedValue(0); // front paw raised (draw / wave)
  const wave = useSharedValue(0);
  const blink = useSharedValue(0);
  const smile = useSharedValue(SMILE[mood]);

  useEffect(() => {
    if (!animated) return;
    cycle.value = withRepeat(withTiming(1, { duration: 620, easing: Easing.linear }), -1);
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1);
    // Blink every few seconds
    blink.value = withRepeat(
      withSequence(withDelay(2800, withTiming(1, { duration: 90 })), withTiming(0, { duration: 110 })),
      -1,
    );
    return () => {
      cancelAnimation(cycle);
      cancelAnimation(breath);
      cancelAnimation(blink);
    };
  }, [animated, cycle, breath, blink]);

  useEffect(() => {
    smile.value = withTiming(SMILE[mood], { duration: 250 });
  }, [mood, smile]);

  useEffect(() => {
    if (!animated) return;
    cancelAnimation(jaw);
    cancelAnimation(tilt);
    cancelAnimation(wave);
    walk.value = withTiming(action === 'walk' ? 1 : 0, { duration: 160 });
    arm.value = withTiming(action === 'draw' || action === 'wave' ? 1 : 0, { duration: 260 });
    const rest = mood === 'celebrate' ? 0.35 : 0;
    if (action === 'eat') {
      // Lean down to the food and take big bites
      tilt.value = withRepeat(withSequence(withTiming(22, { duration: 300 }), withTiming(10, { duration: 400 })), -1);
      jaw.value = withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 400 })), -1);
    } else if (action === 'chew') {
      tilt.value = withTiming(-4, { duration: 250 });
      jaw.value = withRepeat(withSequence(withTiming(0.3, { duration: 140 }), withTiming(0, { duration: 140 })), -1);
    } else if (action === 'draw') {
      tilt.value = withTiming(14, { duration: 250 });
      jaw.value = withTiming(0.15, { duration: 200 });
      wave.value = withRepeat(withSequence(withTiming(1, { duration: 120 }), withTiming(-1, { duration: 120 })), -1);
    } else if (action === 'wave') {
      tilt.value = withTiming(-6, { duration: 250 });
      jaw.value = withTiming(0.45, { duration: 200 });
      wave.value = withRepeat(withSequence(withTiming(1, { duration: 220 }), withTiming(-1, { duration: 220 })), -1);
    } else {
      tilt.value = withTiming(0, { duration: 250 });
      jaw.value = withTiming(rest, { duration: 200 });
      wave.value = withTiming(0, { duration: 150 });
    }
  }, [action, mood, animated, walk, arm, tilt, jaw, wave]);

  // Legs swing in opposite pairs; the near front leg also raises to draw or wave
  const farBack = useSwing(cycle, walk, -1);
  const farFront = useSwing(cycle, walk, 1);
  const nearBack = useSwing(cycle, walk, 1);
  const nearFront = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${Math.sin(cycle.value * Math.PI * 2) * -26 * walk.value + arm.value * -100 + wave.value * (arm.value > 0.5 ? 14 : 0)}deg`,
      },
    ],
  }));
  const bodyBob = useAnimatedStyle(() => ({
    transform: [
      { translateY: -Math.abs(Math.sin(cycle.value * Math.PI * 2)) * 2.4 * walk.value * (size / 120) + Math.sin(breath.value * Math.PI * 2) * 0.6 * (size / 120) },
    ],
  }));
  const tail = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.sin(breath.value * Math.PI * 4) * 7 + Math.sin(cycle.value * Math.PI * 2) * 9 * walk.value}deg` }],
  }));
  const farWing = useFlap(breath, cycle, walk, -1);
  const nearWing = useFlap(breath, cycle, walk, 1);
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.value + Math.sin(breath.value * Math.PI * 2) * 1.5}deg` }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - blink.value * 0.9 }] }));

  const r = s.r;
  const mouth = dragon ? { x: head.x + r * 0.72, y: head.y + r * 0.45, w: r * 0.3 } : { x: head.x + r * 0.55, y: head.y + r * 0.38, w: r * 0.22 };
  const mouthProps = useAnimatedProps(() => {
    const sm = smile.value;
    const open = jaw.value * r * 0.42;
    const curve = sm * r * 0.14;
    return {
      d: `M${mouth.x - mouth.w} ${mouth.y - curve * 0.3} Q${mouth.x} ${mouth.y + curve} ${mouth.x + mouth.w} ${mouth.y - curve * 0.3} Q${mouth.x} ${mouth.y + curve + open + 0.6} ${mouth.x - mouth.w} ${mouth.y - curve * 0.3} Z`,
    };
  });
  const tongueProps = useAnimatedProps(() => ({
    opacity: jaw.value > 0.25 ? 1 : 0,
    d: `M${mouth.x - mouth.w * 0.5} ${mouth.y + smile.value * r * 0.14 + jaw.value * r * 0.3} Q${mouth.x} ${mouth.y + smile.value * r * 0.14 + jaw.value * r * 0.42} ${mouth.x + mouth.w * 0.5} ${mouth.y + smile.value * r * 0.14 + jaw.value * r * 0.3}`,
  }));

  // Head and face share one rotating group about the neck
  const headPivot = { x: (neck.x / 120) * size, y: (neck.y / 120) * size };
  const eyeLine = head.y - r * 0.1;

  const tailPath = species === 'bunny'
    ? null
    : (() => {
        const t = s.tail * (species === 'cat' ? 1.3 : 1);
        const b = tailBase;
        const tip = { x: b.x - 20 * t, y: b.y - (species === 'cat' ? 26 : 14) * t };
        const c = { x: b.x - 14 * t, y: b.y + 8 };
        return { d: `M${b.x + 3} ${b.y - 6} Q${c.x} ${c.y - 6} ${tip.x} ${tip.y} Q${c.x + 2} ${c.y + 4} ${b.x + 3} ${b.y + 6} Z`, tip };
      })();

  const wingPath = (k: number) =>
    `M0 0 L${-8 * k} ${-40 * k} Q${-15 * k} ${-31 * k} ${-21 * k} ${-33 * k} Q${-23 * k} ${-23 * k} ${-31 * k} ${-23 * k} Q${-30 * k} ${-13 * k} ${-36 * k} ${-11 * k} Z`;
  const wingRibs = (k: number) => `M0 0 L${-21 * k} ${-33 * k} M0 0 L${-31 * k} ${-23 * k}`;

  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ scale: s.scale }], transformOrigin: [size / 2, size, 0] }]}>
        {st >= 4 && (
          <View style={StyleSheet.absoluteFill}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
              <Ellipse cx={60} cy={70} rx={56} ry={46} fill="#FFD45C" opacity={0.22} />
            </Svg>
          </View>
        )}
        {/* ground shadow */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={size} height={size} viewBox="0 0 120 120">
            <Ellipse cx={bx + 4} cy={GROUND + 1} rx={s.rx + 8} ry={3.5} fill="#1A1028" opacity={0.18} />
          </Svg>
        </View>

        <Animated.View style={[StyleSheet.absoluteFill, bodyBob]}>
          {dragon && (
            <Joint size={size} pivot={wingRoot} style={farWing}>
              <G transform={`translate(${wingRoot.x + 5} ${wingRoot.y})`}>
                <Path d={wingPath(s.wing)} fill={darken(pal.wing, 0.25)} {...LINE} />
              </G>
            </Joint>
          )}
          {tailPath && (
            <Joint size={size} pivot={tailBase} style={tail}>
              <Path d={tailPath.d} fill={pal.body} {...LINE} />
              {dragon && <Path d={`M${tailPath.tip.x} ${tailPath.tip.y} l-5 -4 l2 6 l-5 2 Z`} fill={pal.wing} {...LINE} />}
              {species === 'cat' && <Circle cx={tailPath.tip.x} cy={tailPath.tip.y} r={2.5} fill={pal.wing} />}
            </Joint>
          )}
          <Joint size={size} pivot={{ x: backHip.x + 4, y: backHip.y }} style={farBack}>
            <Leg hip={{ x: backHip.x + 4, y: backHip.y }} len={legLen} w={s.lw} color={farColor} paw={darken(farColor, 0.1)} />
          </Joint>
          <Joint size={size} pivot={{ x: frontHip.x + 4, y: frontHip.y }} style={farFront}>
            <Leg hip={{ x: frontHip.x + 4, y: frontHip.y }} len={legLen} w={s.lw} color={farColor} paw={darken(farColor, 0.1)} />
          </Joint>

          {/* body, belly, neck */}
          <View style={StyleSheet.absoluteFill}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
              {species === 'bunny' && <Circle cx={bx - s.rx * 0.95} cy={by - 2} r={6} fill="#FFFFFF" {...LINE} />}
              <Path d={`M${neck.x - r * 0.35} ${neck.y + 4} L${head.x - r * 0.4} ${head.y + 2} L${head.x + r * 0.2} ${head.y + 4} L${neck.x + r * 0.45} ${neck.y + 6} Z`} fill={pal.body} {...LINE} />
              <Ellipse cx={bx} cy={by} rx={s.rx} ry={s.ry} fill={pal.body} {...LINE} />
              <Ellipse cx={bx + s.rx * 0.18} cy={by + s.ry * 0.28} rx={s.rx * 0.62} ry={s.ry * 0.58} fill={pal.belly} />
              {dragon && (
                <G>
                  {[0.2, 0.45, 0.7].map((k) => (
                    <Path key={k} d={`M${bx - s.rx * 0.2} ${by + s.ry * k} Q${bx + s.rx * 0.18} ${by + s.ry * (k + 0.12)} ${bx + s.rx * 0.6} ${by + s.ry * k}`} stroke={darken(pal.belly, 0.25)} strokeWidth={1} fill="none" />
                  ))}
                  {/* spikes along the back */}
                  {[-0.6, -0.3, 0, 0.3].map((k) => {
                    const x = bx + s.rx * k;
                    const y = by - s.ry * Math.sqrt(1 - k * k);
                    return <Path key={k} d={`M${x - 3.5} ${y + 1.5} L${x - 1} ${y - 5 * s.horn - 2} L${x + 2.5} ${y + 1.5} Z`} fill={pal.wing} {...LINE} />;
                  })}
                </G>
              )}
              <Ellipse cx={bx - s.rx * 0.35} cy={by - s.ry * 0.45} rx={s.rx * 0.4} ry={s.ry * 0.22} fill="#FFFFFF" opacity={0.25} />
              {accessory === 'scarf' && (
                <G>
                  <Path d={`M${neck.x - r * 0.45} ${neck.y + 2} Q${neck.x + 2} ${neck.y + 10} ${neck.x + r * 0.55} ${neck.y + 2} L${neck.x + r * 0.55} ${neck.y + 7} Q${neck.x + 2} ${neck.y + 15} ${neck.x - r * 0.45} ${neck.y + 7} Z`} fill="#FF4D5E" {...LINE} />
                  <Path d={`M${neck.x - r * 0.2} ${neck.y + 9} l-3 10 l5 1 l2 -10 Z`} fill="#E23E53" {...LINE} />
                </G>
              )}
            </Svg>
          </View>

          <Joint size={size} pivot={backHip} style={nearBack}>
            <Leg hip={backHip} len={legLen} w={s.lw} color={pal.body} paw={paw} />
          </Joint>
          <Joint size={size} pivot={frontHip} style={nearFront}>
            <Leg hip={frontHip} len={legLen} w={s.lw} color={pal.body} paw={paw} pencil={action === 'draw'} />
          </Joint>
          {dragon && (
            <Joint size={size} pivot={wingRoot} style={nearWing}>
              <G transform={`translate(${wingRoot.x} ${wingRoot.y})`}>
                <Path d={wingPath(s.wing)} fill={pal.wing} {...LINE} />
                <Path d={wingRibs(s.wing)} stroke={darken(pal.wing, 0.35)} strokeWidth={1.4} fill="none" />
              </G>
            </Joint>
          )}

          {/* head, face and mouth nod together about the neck */}
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [headPivot.x, headPivot.y, 0] }, headStyle]}>
            <View style={StyleSheet.absoluteFill}>
              <Svg width={size} height={size} viewBox="0 0 120 120">
                <HeadShape species={species} stage={st} mood={mood} pal={pal} accessory={accessory} />
              </Svg>
            </View>
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [size / 2, (eyeLine / 120) * size, 0] }, mood === 'celebrate' || mood === 'sleep' ? null : eyesStyle]}>
              <Svg width={size} height={size} viewBox="0 0 120 120">
                <Eyes species={species} stage={st} mood={mood} pal={pal} accessory={accessory} />
              </Svg>
            </Animated.View>
            <View style={StyleSheet.absoluteFill}>
              <Svg width={size} height={size} viewBox="0 0 120 120">
                <AnimatedPath animatedProps={mouthProps} fill="#5A2333" stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
                <AnimatedPath animatedProps={tongueProps} stroke="#FF7A8A" strokeWidth={2.2} strokeLinecap="round" fill="none" />
                {species === 'bunny' && mood !== 'sad' && (
                  <Rect x={mouth.x - 1.6} y={mouth.y + 0.5} width={3.2} height={3} rx={0.6} fill="#FFFFFF" stroke={INK} strokeWidth={0.5} />
                )}
              </Svg>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

/** A leg swinging with the walk cycle; `sign` picks which half of the stride. */
function useSwing(cycle: SharedValue<number>, walk: SharedValue<number>, sign: number) {
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.sin(cycle.value * Math.PI * 2) * 26 * walk.value * sign}deg` }] }));
}

/** A wing gently flapping, harder while walking. */
function useFlap(breath: SharedValue<number>, cycle: SharedValue<number>, walk: SharedValue<number>, k: number) {
  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${(Math.sin(breath.value * Math.PI * 2) * 5 + Math.sin(cycle.value * Math.PI * 2) * 10 * walk.value) * k}deg` }],
  }));
}
