import { createContext, useContext, useEffect, type ReactNode } from 'react';
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
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import type { PetSpecies } from '@/data/types';
import type { Mood } from '@/game/engine';
import { darken, lighten, OUTLINE } from './paint';

export type PetMood = Mood | 'sleep';
/** walk = the cat and dragon step on their feet, the bunny hops; eat = big chomps; chew = small chews */
export type PetAction = 'idle' | 'walk' | 'eat' | 'chew' | 'wave';

export const PETS: { id: PetSpecies; name: string; body: string; belly: string; accent: string; eyes: string }[] = [
  { id: 'cat', name: 'Cat', body: '#FFAE5C', belly: '#FFE6C7', accent: '#E07F2C', eyes: '#2E9E6A' },
  { id: 'bunny', name: 'Bunny', body: '#EEE8FF', belly: '#FFFFFF', accent: '#FF8CC4', eyes: '#7A55E8' },
  { id: 'dino', name: 'Dragon', body: '#5FD68F', belly: '#D2F7DF', accent: '#24A35F', eyes: '#B8622A' },
];

const INK = '#2A1F3D';
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** One step or hop, in ms. The roaming pet times the bunny's hops with this. */
export const STEP_MS = 460;
/** While hopping, the bunny is on the ground for this share of each hop. */
export const HOP_GROUND = 0.28;

/** Smaller when young; adults and legends are full size. */
const STAGE_SCALE = [0.72, 0.84, 0.93, 1, 1];

type Layout = {
  /** The head is drawn around (60,70) and moved here with this scale */
  head: { x: number; y: number; k: number };
  /** A separate body under the head; babies and kids are one round blob (null) */
  body: { cy: number; rx: number; ry: number } | null;
  feet: { y: number; dx: number; rx: number; ry: number };
  arms: { y: number; dx: number; rx: number; ry: number };
  tail: { x: number; y: number };
};

/** Babies and kids are a single round blob; teens and up grow a head on a body. */
function layout(stage: number, species: PetSpecies): Layout {
  const bigFeet = species === 'bunny';
  if (stage <= 1) {
    return {
      head: { x: 60, y: 70, k: 1 },
      body: null,
      feet: { y: 105, dx: 16, rx: bigFeet ? 14 : 12, ry: bigFeet ? 7 : 6.5 },
      arms: { y: 90, dx: 30, rx: 7.5, ry: 9 },
      tail: { x: 96, y: 92 },
    };
  }
  const teen = stage === 2;
  return {
    head: { x: 60, y: teen ? 50 : 45, k: teen ? 0.8 : 0.72 },
    body: { cy: teen ? 90 : 87, rx: teen ? 24 : 27, ry: teen ? 18 : 21 },
    feet: { y: 108, dx: 13, rx: bigFeet ? 13 : 10.5, ry: bigFeet ? 6.5 : 5.5 },
    arms: { y: teen ? 87 : 84, dx: teen ? 23 : 26, rx: 6.5, ry: 8.5 },
    tail: { x: 82, y: teen ? 98 : 96 },
  };
}

function Sparkle({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const k = r * 0.28;
  return (
    <Path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`}
      fill={color}
    />
  );
}

/** Headroom above the drawing for the bunny's long ears. */
const EAR_ROOM = 40;

/** Still previews draw the whole pet as one SVG; moving pets stack a layer per part. */
const FlatContext = createContext(false);

/**
 * A full-size SVG layer, so each part of the pet can move on its own. It is cached as a
 * hardware texture, so moving it doesn't redraw the SVG every frame.
 */
function Layer({ size, children, style, room = 0 }: { size: number; children: ReactNode; style?: object; room?: number }) {
  const flat = useContext(FlatContext);
  if (flat) return <G>{children}</G>;
  // `room` is extra canvas above the box (in drawing units) for parts that reach past the top, like long ears
  const r = (room * size) / 120;
  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[{ position: 'absolute', left: 0, width: size, top: -r, height: size + r }, style]}>
      <Svg width={size} height={size + r} viewBox={`0 ${-room} 120 ${120 + room}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** Parts that move together (the body, the head). In a still preview this is just a grouping. */
function Group({ children, style }: { children: ReactNode; style?: object }) {
  const flat = useContext(FlatContext);
  if (flat) return <>{children}</>;
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** Outer frame: scales young pets down about their feet; a still preview becomes one SVG. */
function Frame({ size, flat, scale, originY, children }: { size: number; flat: boolean; scale: number; originY: number; children: ReactNode }) {
  if (flat) {
    return (
      <FlatContext.Provider value>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={(size * (120 + EAR_ROOM)) / 120} viewBox={`0 ${-EAR_ROOM} 120 ${120 + EAR_ROOM}`} style={{ position: 'absolute', top: (-EAR_ROOM * size) / 120 }}>
            <G transform={`translate(60 112) scale(${scale}) translate(-60 -112)`}>{children}</G>
          </Svg>
        </View>
      </FlatContext.Provider>
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ scale }], transformOrigin: [size / 2, originY, 0] }]}>{children}</View>
    </View>
  );
}

/**
 * Solid colours for each part. Every moving part is its own SVG, and on Android an SVG can't
 * use a gradient defined in another one, so shading is painted with soft light and shadow shapes.
 */
function usePaint(species: PetSpecies) {
  const p = PETS.find((x) => x.id === species) ?? PETS[0];
  const fill = (url: string) => ({ url });
  return {
    p,
    dark: darken(p.body, 0.2),
    shade: darken(p.body, 0.35),
    body: fill(p.body),
    belly: fill(p.belly),
    accent: fill(p.accent),
    inner: fill('#FF9ACB'),
    iris: fill(darken(p.eyes, 0.15)),
    blush: fill('rgba(255,111,168,0.38)'),
    tear: fill('#7CC6FF'),
    aura: fill('rgba(255,212,92,0.32)'),
    wing: fill('#FFFFFF'),
    gold: fill('#FFC233'),
    hat: fill('#7C5CFF'),
    lens: fill('#2A1F3D'),
    scarf: fill('#FF4D5E'),
  };
}
type Paint = ReturnType<typeof usePaint>;

/** Behind the head, growing with the pet: cat ears (and a lion mane at Legendary), dragon horns. */
function HeadBack({ species, stage, c }: { species: PetSpecies; stage: number; c: Paint }) {
  if (species === 'cat') {
    const lift = 14 * (1 + stage * 0.06);
    return (
      <G>
        {stage >= 4 &&
          Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            const x = 60 + Math.cos(a) * 40;
            const y = 70 + Math.sin(a) * 37;
            return <Ellipse key={i} cx={x} cy={y} rx={12} ry={9} fill="#FFC233" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} {...OUTLINE} />;
          })}
        <Path d={`M24 52 Q24 ${40 - lift} 30 ${28 - lift} Q44 24 54 38 Z`} fill={c.body.url} {...OUTLINE} />
        <Path d={`M96 52 Q96 ${40 - lift} 90 ${28 - lift} Q76 24 66 38 Z`} fill={c.body.url} {...OUTLINE} />
        <Path d={`M31 42 Q31 30 33 ${37 - lift} Q41 29 46 36 Z`} fill={c.inner.url} />
        <Path d={`M89 42 Q89 30 87 ${37 - lift} Q79 29 74 36 Z`} fill={c.inner.url} />
        {stage >= 3 && <Path d={`M30 ${28 - lift} l-3 -7 M90 ${28 - lift} l3 -7`} stroke={c.dark} strokeWidth={2} strokeLinecap="round" />}
      </G>
    );
  }
  if (species === 'dino') {
    // Little nubs on the baby, then curling horns that grow with every stage
    const h = [4, 9, 14, 19, 22][stage];
    return (
      <G>
        <Path d={`M42 40 Q${36 - h * 0.3} ${32 - h} ${34 - h * 0.4} ${26 - h} Q44 ${30 - h * 0.4} 50 36 Z`} fill="#FFF3D6" {...OUTLINE} />
        <Path d={`M78 40 Q${84 + h * 0.3} ${32 - h} ${86 + h * 0.4} ${26 - h} Q76 ${30 - h * 0.4} 70 36 Z`} fill="#FFF3D6" {...OUTLINE} />
        {stage >= 1 && <Path d="M44 36 L50 24 L56 34 L60 18 L64 34 L70 24 L76 36 Z" fill={c.accent.url} {...OUTLINE} />}
      </G>
    );
  }
  return null;
}

/** Bunny ears get longer as it grows; the adult lets one ear flop over. */
function BunnyEars({ stage, c }: { stage: number; c: Paint }) {
  const len = 25 + stage * 4;
  return (
    <G>
      <G transform={stage >= 3 ? 'rotate(-62 44 40)' : 'rotate(-10 44 40)'}>
        <Ellipse cx="44" cy={40 - len * 0.62} rx="11" ry={len} fill={c.body.url} {...OUTLINE} />
        <Ellipse cx="44" cy={42 - len * 0.62} rx="5.5" ry={len * 0.68} fill={c.inner.url} />
      </G>
      <G transform="rotate(10 76 40)">
        <Ellipse cx="76" cy={40 - len * 0.62} rx="11" ry={len} fill={c.body.url} {...OUTLINE} />
        <Ellipse cx="76" cy={42 - len * 0.62} rx="5.5" ry={len * 0.68} fill={c.inner.url} />
      </G>
    </G>
  );
}

/** The round head (the whole body for babies), cheeks and species markings. */
function HeadFront({ species, stage, mood, c }: { species: PetSpecies; stage: number; mood: PetMood; c: Paint }) {
  return (
    <G>
      <Ellipse cx="60" cy="70" rx="40" ry="37" fill={c.body.url} {...OUTLINE} />
      {/* soft shading: darker lower-right, a light patch upper-left */}
      <Path d="M100 70 A40 37 0 0 1 60 107 A40 37 0 0 1 24 88 Q60 100 92 70 Q96 56 92 46 Q100 56 100 70 Z" fill={c.shade} opacity={0.18} />
      <Ellipse cx="44" cy="50" rx="16" ry="10" fill="#FFFFFF" opacity={0.22} />
      {stage <= 1 && <Ellipse cx="60" cy="88" rx="24" ry="15" fill={c.belly.url} />}
      {stage >= 2 && <Ellipse cx="60" cy="84" rx="20" ry="11" fill={c.belly.url} opacity={0.85} />}
      {species === 'cat' && (
        <G>
          <G stroke={c.p.accent} strokeWidth={2.6} strokeLinecap="round" opacity={0.75}>
            <Path d="M54 36 L55 44" />
            <Path d="M60 34 L60 43" />
            <Path d="M66 36 L65 44" />
          </G>
          <G stroke={darken(c.p.accent, 0.1)} strokeWidth={1.6} strokeLinecap="round" opacity={0.8}>
            <Path d="M18 72 L30 74" />
            <Path d="M18 79 L30 78" />
            <Path d="M102 72 L90 74" />
            <Path d="M102 79 L90 78" />
          </G>
          <Path d="M57 71 L63 71 L60 74.5 Z" fill="#FF8CA8" />
        </G>
      )}
      {species === 'bunny' && <Ellipse cx="60" cy="72" rx="3.2" ry="2.4" fill="#FF8CA8" />}
      {/* the legendary moon bunny wears a golden crescent */}
      {species === 'bunny' && stage >= 4 && <Path d="M53 44 Q60 34 67 44 Q60 39 53 44 Z" fill="#FFC233" {...OUTLINE} />}
      {species === 'dino' && (
        <G>
          <G fill={c.p.accent} opacity={0.45}>
            <Ellipse cx="28" cy="80" rx="4" ry="3" />
            <Ellipse cx="92" cy="78" rx="5" ry="3.5" />
            <Ellipse cx="34" cy="52" rx="3" ry="2.2" />
          </G>
          <Ellipse cx="55" cy="71.5" rx="1.3" ry="0.9" fill={INK} />
          <Ellipse cx="65" cy="71.5" rx="1.3" ry="0.9" fill={INK} />
        </G>
      )}
      {mood !== 'sad' && (
        <G>
          <Ellipse cx="33" cy="77" rx="8" ry="5" fill={c.blush.url} />
          <Ellipse cx="87" cy="77" rx="8" ry="5" fill={c.blush.url} />
        </G>
      )}
      <Path d="M26 56 Q32 40 48 35" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" fill="none" />
      {stage === 0 && species !== 'dino' && <Path d="M60 34 Q56 24 62 20 Q68 18 66 25" stroke={c.dark} strokeWidth={3} strokeLinecap="round" fill="none" />}
    </G>
  );
}

function GlossyEye({ cx, fill }: { cx: number; fill: string }) {
  return (
    <G>
      <Ellipse cx={cx} cy={62} rx={7.5} ry={9} fill={fill} />
      <Ellipse cx={cx} cy={66} rx={5} ry={4} fill="#FFFFFF" opacity={0.18} />
      <Circle cx={cx + 2.7} cy={58} r={3.1} fill="#FFFFFF" />
      <Circle cx={cx - 2.6} cy={66} r={1.5} fill="#FFFFFF" opacity={0.85} />
    </G>
  );
}

/** Eyes for the mood: happy upturned arcs, sleepy lines, glossy and open, or sad with brows and a tear. */
function Eyes({ mood, eating, c }: { mood: PetMood; eating: boolean; c: Paint }) {
  if (mood === 'happy' || mood === 'celebrate' || eating) {
    return (
      <G stroke={INK} strokeWidth={3.6} strokeLinecap="round" fill="none">
        <Path d="M38 65 Q45 55 52 65" />
        <Path d="M68 65 Q75 55 82 65" />
      </G>
    );
  }
  if (mood === 'sleep') {
    return (
      <G stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
        <Path d="M38 62 Q45 68 52 62" />
        <Path d="M68 62 Q75 68 82 62" />
      </G>
    );
  }
  return (
    <G>
      <GlossyEye cx={45} fill={c.iris.url} />
      <GlossyEye cx={75} fill={c.iris.url} />
      {mood === 'sad' && (
        <G>
          <G stroke={INK} strokeWidth={2.4} strokeLinecap="round">
            <Path d="M36 51 L47 48" />
            <Path d="M84 51 L73 48" />
          </G>
          <Path d="M82 68 Q85.5 75 82 78 Q78.5 75 82 68 Z" fill={c.tear.url} />
        </G>
      )}
    </G>
  );
}

/** Worn on the head (in head coordinates): the legendary crown and shop accessories. */
function HeadWear({ stage, accessory, c }: { stage: number; accessory: string | null; c: Paint }) {
  const legendary = stage >= 4;
  return (
    <G>
      {legendary && (
        <G>
          <Path d="M42 36 L44 18 L52 28 L60 14 L68 28 L76 18 L78 36 Q60 32 42 36 Z" fill={c.gold.url} {...OUTLINE} />
          <Circle cx="60" cy="25" r="3" fill="#FF4D5E" />
          <Circle cx="47" cy="29" r="2" fill="#7CC6FF" />
          <Circle cx="73" cy="29" r="2" fill="#7CC6FF" />
        </G>
      )}
      {accessory === 'party_hat' && !legendary && (
        <G>
          <Path d="M46 38 L60 2 L74 38 Q60 43 46 38 Z" fill={c.hat.url} {...OUTLINE} />
          <Path d="M50 28 L70 28 M54 18 L66 18" stroke="#FFC233" strokeWidth={3} strokeLinecap="round" />
          <Circle cx="60" cy="3" r="5" fill="#FF7AC6" {...OUTLINE} />
        </G>
      )}
      {accessory === 'bow' && (
        <G>
          <Path d="M80 30 L66 20 L68 40 Z M80 30 L94 20 L92 40 Z" fill="#FF7AC6" {...OUTLINE} />
          <Circle cx="80" cy="30" r="4.5" fill="#FF4FA8" {...OUTLINE} />
        </G>
      )}
      {accessory === 'shades' && (
        <G>
          <Path d="M30 56 H90" stroke={INK} strokeWidth={3} />
          <Path d="M33 54 H57 Q57 70 45 70 Q33 70 33 54 Z" fill={c.lens.url} {...OUTLINE} />
          <Path d="M63 54 H87 Q87 70 75 70 Q63 70 63 54 Z" fill={c.lens.url} {...OUTLINE} />
          <Path d="M37 58 L43 58 M67 58 L73 58" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      )}
    </G>
  );
}

/** Mouth shape per mood: how much it curves up (smile) or down (frown) and how wide it opens. */
const MOUTH: Record<PetMood, { curve: number; open: number }> = {
  happy: { curve: 5, open: 6 },
  celebrate: { curve: 6, open: 10 },
  idle: { curve: 3, open: 0 },
  sad: { curve: -5, open: 0 },
  sleep: { curve: 1.5, open: 0 },
};

type Props = {
  species: PetSpecies;
  mood?: PetMood;
  size?: number;
  /** Growth stage, 0 = Baby … 4 = Legendary (see PET_STAGES) */
  stage?: number;
  /** Shop accessory being worn */
  accessory?: string | null;
  action?: PetAction;
  /** Off for small previews: a still pose, no running animations */
  animated?: boolean;
};

/**
 * Companion pet, front-facing with soft shading, built from moving parts: feet that step
 * (the cat and dragon walk, the bunny hops), swinging arms, a swishing tail, flapping wings,
 * twitching ears, blinking eyes and a mouth that smiles, frowns and chews.
 */
export function Pet({ species, mood = 'happy', size = 90, stage = 1, accessory = null, action = 'idle', animated = true }: Props) {
  const st = Math.max(0, Math.min(4, stage));
  const L = layout(st, species);
  const c = usePaint(species);
  const legendary = st >= 4;
  const bunny = species === 'bunny';
  const wings: 'dragon' | 'angel' | null = species === 'dino' && st >= 2 ? 'dragon' : legendary ? 'angel' : null;
  const eating = action === 'eat' || action === 'chew';

  const cycle = useSharedValue(0);
  const breath = useSharedValue(0);
  const walk = useSharedValue(0);
  const blink = useSharedValue(0);
  const twitch = useSharedValue(0);
  const open = useSharedValue(MOUTH[mood].open);
  const curve = useSharedValue(MOUTH[mood].curve);
  const dip = useSharedValue(0);
  const armUp = useSharedValue(0);
  const wave = useSharedValue(0);
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    breath.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1);
    blink.value = withRepeat(withSequence(withDelay(3200, withTiming(1, { duration: 90 })), withTiming(0, { duration: 120 })), -1);
    twitch.value = withRepeat(
      withSequence(withDelay(4200, withTiming(1, { duration: 120 })), withTiming(-1, { duration: 140 }), withTiming(0, { duration: 140 })),
      -1,
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(blink);
      cancelAnimation(twitch);
    };
  }, [animated, breath, blink, twitch]);

  // The step cycle restarts whenever the pet sets off, so hops line up with the distance travelled
  useEffect(() => {
    if (!animated) return;
    if (action === 'walk') {
      cycle.value = 0;
      cycle.value = withRepeat(withTiming(1, { duration: STEP_MS, easing: Easing.linear }), -1);
      walk.value = withTiming(1, { duration: 120 });
    } else {
      walk.value = withTiming(0, { duration: 160 });
    }
  }, [action, animated, cycle, walk]);

  useEffect(() => {
    cancelAnimation(open);
    cancelAnimation(dip);
    cancelAnimation(wave);
    cancelAnimation(bounce);
    const m = MOUTH[mood];
    if (action === 'eat' && animated) {
      // Big chomps: lean down with the mouth wide open, close it and come back up
      curve.value = withTiming(2, { duration: 150 });
      open.value = withRepeat(withSequence(withTiming(11, { duration: 260 }), withTiming(0, { duration: 340 })), -1);
      dip.value = withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 340 })), -1);
    } else if (action === 'chew' && animated) {
      curve.value = withTiming(3, { duration: 150 });
      open.value = withRepeat(withSequence(withTiming(3, { duration: 150 }), withTiming(0, { duration: 150 })), -1);
      dip.value = withTiming(0, { duration: 200 });
    } else {
      curve.value = withTiming(m.curve, { duration: 220 });
      open.value = withTiming(m.open, { duration: 220 });
      dip.value = withTiming(0, { duration: 200 });
    }
    armUp.value = withTiming(action === 'wave' ? 1 : 0, { duration: 240 });
    wave.value =
      action === 'wave' && animated
        ? withRepeat(withSequence(withTiming(1, { duration: 220 }), withTiming(-1, { duration: 220 })), -1)
        : withTiming(0, { duration: 150 });
    // A celebrating pet bounces on the spot
    bounce.value =
      mood === 'celebrate' && action === 'idle' && animated
        ? withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 260 })), -1)
        : withTiming(0, { duration: 200 });
  }, [action, mood, animated, curve, open, dip, armUp, wave, bounce]);

  const k = size / 120;

  // Whole body: a stepping bob and sway for the walkers; squash, jump and land for the bunny
  const bodyStyle = useAnimatedStyle(() => {
    const p = cycle.value;
    const w = walk.value;
    const br = Math.sin(breath.value * Math.PI * 2);
    let y = -bounce.value * 10 * k + br * 0.6 * k;
    let sy = 1 + br * 0.012;
    let rot = 0;
    if (bunny) {
      if (p < HOP_GROUND) {
        sy -= Math.sin((p / HOP_GROUND) * Math.PI) * 0.14 * w;
      } else {
        const t = (p - HOP_GROUND) / (1 - HOP_GROUND);
        y -= Math.sin(t * Math.PI) * 18 * k * w;
        sy += Math.sin(t * Math.PI) * 0.06 * w;
      }
    } else {
      y -= Math.abs(Math.sin(p * Math.PI * 2)) * 3 * k * w;
      rot = Math.sin(p * Math.PI * 2) * 4 * w;
    }
    return { transform: [{ translateY: y }, { rotate: `${rot}deg` }, { scaleY: sy }] };
  });
  const shadowStyle = useAnimatedStyle(() => {
    const p = cycle.value;
    const air = bunny && p > HOP_GROUND ? Math.sin(((p - HOP_GROUND) / (1 - HOP_GROUND)) * Math.PI) * walk.value : 0;
    return { opacity: 1 - air * 0.4, transform: [{ scaleX: 1 - air * 0.35 - bounce.value * 0.2 }] };
  });
  // Feet take turns lifting; the bunny keeps its big feet together
  const footL = useAnimatedStyle(() => ({
    transform: [{ translateY: bunny ? 0 : -Math.max(0, Math.sin(cycle.value * Math.PI * 2)) * 6 * k * walk.value }],
  }));
  const footR = useAnimatedStyle(() => ({
    transform: [{ translateY: bunny ? 0 : -Math.max(0, -Math.sin(cycle.value * Math.PI * 2)) * 6 * k * walk.value }],
  }));
  const armL = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.sin(cycle.value * Math.PI * 2) * 16 * walk.value}deg` }] }));
  const armR = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-Math.sin(cycle.value * Math.PI * 2) * 16 * walk.value - armUp.value * 135 + wave.value * 18 * armUp.value}deg` }],
  }));
  const tailStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${Math.sin(breath.value * Math.PI * 4) * (species === 'cat' ? 12 : 6) + Math.sin(cycle.value * Math.PI * 2) * 14 * walk.value}deg` },
    ],
  }));
  const wingL = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-(Math.sin(breath.value * Math.PI * 2) * 6 + Math.abs(Math.sin(cycle.value * Math.PI * 2)) * 16 * walk.value + bounce.value * 18)}deg` },
    ],
  }));
  const wingR = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${Math.sin(breath.value * Math.PI * 2) * 6 + Math.abs(Math.sin(cycle.value * Math.PI * 2)) * 16 * walk.value + bounce.value * 18}deg` },
    ],
  }));
  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dip.value * 5 * k }, { rotate: `${dip.value * 3}deg` }] }));
  // Ears twitch now and then and trail behind the bunny's hops
  const earStyle = useAnimatedStyle(() => {
    const p = cycle.value;
    const air = bunny && p > HOP_GROUND ? Math.sin(((p - HOP_GROUND) / (1 - HOP_GROUND)) * Math.PI) : 0;
    const squash = bunny && p <= HOP_GROUND ? 0.06 : 0;
    return { transform: [{ rotate: `${twitch.value * 6}deg` }, { scaleY: 1 + (air * 0.08 - squash) * walk.value }] };
  });
  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - blink.value * 0.92 }] }));

  const mouthProps = useAnimatedProps(() => {
    const cv = curve.value;
    const o = open.value;
    return { d: `M53 76 Q60 ${76 + cv} 67 76 Q60 ${76 + cv + o} 53 76 Z` };
  });
  const tongueProps = useAnimatedProps(() => ({
    opacity: open.value > 3 ? 1 : 0,
    cy: 76 + curve.value * 0.5 + open.value * 0.62,
    ry: Math.min(2.2, open.value * 0.25),
  }));

  const h = L.head;
  const headT = `translate(${h.x} ${h.y}) scale(${h.k}) translate(-60 -70)`;
  const px = (v: number) => v * k;
  const eyeLine = px(h.y + (62 - 70) * h.k);
  const earRoot = px(h.y + (40 - 70) * h.k);
  const neck = px(h.y + 37 * h.k);
  const shoulderY = L.arms.y - L.arms.ry * 0.7;
  const bodyTop = L.body ? L.body.cy - L.body.ry : 60;
  const wingRoot = { y: bodyTop + 8, dx: L.body ? L.body.rx * 0.5 : 26 };
  const ws = species === 'dino' ? [0, 0, 0.6, 0.85, 1.15][st] : 1;
  const blinking = animated && !(mood === 'happy' || mood === 'celebrate' || mood === 'sleep' || eating);

  const feet = (
    <>
      <Layer size={size} style={footL}>
        <Ellipse cx={60 - L.feet.dx} cy={L.feet.y} rx={L.feet.rx} ry={L.feet.ry} fill={c.dark} {...OUTLINE} />
        <Ellipse cx={60 - L.feet.dx - 2} cy={L.feet.y - 2} rx={L.feet.rx * 0.42} ry={1.8} fill="#FFFFFF" opacity={0.3} />
      </Layer>
      <Layer size={size} style={footR}>
        <Ellipse cx={60 + L.feet.dx} cy={L.feet.y} rx={L.feet.rx} ry={L.feet.ry} fill={c.dark} {...OUTLINE} />
        <Ellipse cx={60 + L.feet.dx - 2} cy={L.feet.y - 2} rx={L.feet.rx * 0.42} ry={1.8} fill="#FFFFFF" opacity={0.3} />
      </Layer>
    </>
  );
  const arms = (
    <>
      <Layer size={size} style={[{ transformOrigin: [px(60 - L.arms.dx), px(shoulderY), 0] }, armL]}>
        <Ellipse cx={60 - L.arms.dx} cy={L.arms.y} rx={L.arms.rx} ry={L.arms.ry} fill={c.body.url} {...OUTLINE} />
      </Layer>
      <Layer size={size} style={[{ transformOrigin: [px(60 + L.arms.dx), px(shoulderY), 0] }, armR]}>
        <Ellipse cx={60 + L.arms.dx} cy={L.arms.y} rx={L.arms.rx} ry={L.arms.ry} fill={c.body.url} {...OUTLINE} />
      </Layer>
    </>
  );
  const dragonWing = (side: 1 | -1) => (
    <G transform={`translate(${60 + side * wingRoot.dx} ${wingRoot.y}) scale(${-side * ws} ${ws})`}>
      <Path d="M0 0 Q-20 -22 -40 -20 Q-34 -12 -36 -4 Q-28 -6 -26 2 Q-18 -2 -14 6 Z" fill={c.accent.url} {...OUTLINE} />
      <Path d="M0 0 L-40 -20 M-6 1 L-36 -4 M-6 3 L-26 2" stroke={darken(c.p.accent, 0.3)} strokeWidth={1.3} fill="none" />
    </G>
  );

  return (
    <Frame size={size} flat={!animated} scale={STAGE_SCALE[st]} originY={px(112)}>

        <Layer size={size}>
          {legendary && <Ellipse cx="60" cy="66" rx="58" ry="54" fill={c.aura.url} />}
        </Layer>
        <Layer size={size} style={[{ transformOrigin: [size / 2, px(112), 0] }, shadowStyle]}>
          <Ellipse cx="60" cy="112" rx="38" ry="6" fill="#1A1028" opacity={0.18} />
        </Layer>

        <Group style={[{ transformOrigin: [size / 2, px(112), 0] }, bodyStyle]}>
          {wings && (
            <>
              <Layer size={size} style={[{ transformOrigin: [px(60 - wingRoot.dx), px(wingRoot.y), 0] }, wingL]}>
                {wings === 'dragon' ? (
                  dragonWing(-1)
                ) : (
                  <Path d={`M${60 - wingRoot.dx} ${wingRoot.y + 10} Q2 58 -4 30 Q14 38 18 34 Q10 48 30 54 Q14 52 22 62 Z`} fill={c.wing.url} {...OUTLINE} />
                )}
              </Layer>
              <Layer size={size} style={[{ transformOrigin: [px(60 + wingRoot.dx), px(wingRoot.y), 0] }, wingR]}>
                {wings === 'dragon' ? (
                  dragonWing(1)
                ) : (
                  <Path d={`M${60 + wingRoot.dx} ${wingRoot.y + 10} Q118 58 124 30 Q106 38 102 34 Q110 48 90 54 Q106 52 98 62 Z`} fill={c.wing.url} {...OUTLINE} />
                )}
              </Layer>
            </>
          )}

          {/* tail, behind the body */}
          <Layer size={size} style={[{ transformOrigin: [px(L.tail.x), px(L.tail.y), 0] }, tailStyle]}>
            {species === 'cat' && (
              <Path
                d={`M${L.tail.x} ${L.tail.y + 2} Q${L.tail.x + 24} ${L.tail.y - 8} ${L.tail.x + 14 + st * 2} ${L.tail.y - 34 - st * 4} Q${L.tail.x + 10} ${L.tail.y - 38 - st * 4} ${L.tail.x + 8 + st * 2} ${L.tail.y - 30 - st * 4} Q${L.tail.x + 16} ${L.tail.y - 8} ${L.tail.x - 2} ${L.tail.y - 6} Z`}
                fill={c.accent.url}
                {...OUTLINE}
              />
            )}
            {species === 'bunny' && <Circle cx={L.tail.x + 4} cy={L.tail.y + 2} r={9} fill={c.body.url} {...OUTLINE} />}
            {species === 'dino' && (
              <G>
                <Path
                  d={`M${L.tail.x - 2} ${L.tail.y - 6} Q${L.tail.x + 24} ${L.tail.y} ${L.tail.x + 22 + st * 2} ${L.tail.y - 20} Q${L.tail.x + 14} ${L.tail.y - 10} ${L.tail.x - 2} ${L.tail.y + 6} Z`}
                  fill={c.body.url}
                  {...OUTLINE}
                />
                <Path d={`M${L.tail.x + 22 + st * 2} ${L.tail.y - 20} l2 -7 l-7 4 Z`} fill={c.accent.url} {...OUTLINE} />
              </G>
            )}
          </Layer>

          {L.body && feet}

          {L.body && (
            <Layer size={size}>
              <Ellipse cx="60" cy={L.body.cy} rx={L.body.rx} ry={L.body.ry} fill={c.body.url} {...OUTLINE} />
              <Ellipse cx={60 + L.body.rx * 0.25} cy={L.body.cy + L.body.ry * 0.3} rx={L.body.rx * 0.7} ry={L.body.ry * 0.6} fill={c.shade} opacity={0.14} />
              <Ellipse cx="60" cy={L.body.cy + L.body.ry * 0.2} rx={L.body.rx * 0.6} ry={L.body.ry * 0.62} fill={c.belly.url} />
              {species === 'dino' && st >= 3 && (
                <Path
                  d={`M${60 - L.body.rx * 0.45} ${L.body.cy} H${60 + L.body.rx * 0.45} M${60 - L.body.rx * 0.5} ${L.body.cy + 6} H${60 + L.body.rx * 0.5} M${60 - L.body.rx * 0.45} ${L.body.cy + 12} H${60 + L.body.rx * 0.45}`}
                  stroke={darken(c.p.belly, 0.25)}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              )}
              {species === 'cat' && st >= 3 && (
                <Path
                  d={`M48 ${L.body.cy - 12} L52 ${L.body.cy - 4} L56 ${L.body.cy - 11} L60 ${L.body.cy - 2} L64 ${L.body.cy - 11} L68 ${L.body.cy - 4} L72 ${L.body.cy - 12} Q60 ${L.body.cy - 8} 48 ${L.body.cy - 12} Z`}
                  fill="#FFFFFF"
                  opacity={0.9}
                  {...OUTLINE}
                />
              )}
              {/* a teen bandana, or the shop scarf */}
              {(st === 2 || accessory === 'scarf') && (
                <G>
                  <Path
                    d={`M${60 - L.body.rx * 0.9} ${bodyTop + 3} Q60 ${bodyTop + 13} ${60 + L.body.rx * 0.9} ${bodyTop + 3} L${60 + L.body.rx * 0.88} ${bodyTop + 10} Q60 ${bodyTop + 20} ${60 - L.body.rx * 0.88} ${bodyTop + 10} Z`}
                    fill={accessory === 'scarf' ? c.scarf.url : c.accent.url}
                    {...OUTLINE}
                  />
                  {accessory === 'scarf' && <Path d={`M${60 + L.body.rx * 0.3} ${bodyTop + 14} l3 16 l7 -2 l-3 -15 Z`} fill={c.scarf.url} {...OUTLINE} />}
                </G>
              )}
            </Layer>
          )}

          {L.body && arms}

          {/* head: ears, face, eyes and mouth move together */}
          <Group style={[{ transformOrigin: [size / 2, neck, 0] }, headStyle]}>
            {bunny && (
              <Layer size={size} room={EAR_ROOM} style={[{ transformOrigin: [size / 2, earRoot + px(EAR_ROOM), 0] }, earStyle]}>
                <G transform={headT}>
                  <BunnyEars stage={st} c={c} />
                </G>
              </Layer>
            )}
            <Layer size={size}>
              <G transform={headT}>
                <HeadBack species={species} stage={st} c={c} />
                <HeadFront species={species} stage={st} mood={mood} c={c} />
              </G>
            </Layer>
            <Layer size={size} style={blinking ? [{ transformOrigin: [size / 2, eyeLine, 0] }, blinkStyle] : undefined}>
              <G transform={headT}>
                <Eyes mood={mood} eating={eating} c={c} />
              </G>
            </Layer>
            <Layer size={size}>
              <G transform={headT}>
                <AnimatedPath animatedProps={mouthProps} fill="#5A2333" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
                <AnimatedEllipse animatedProps={tongueProps} cx={60} rx={3.6} fill="#FF7A8A" />
                {bunny && mood !== 'sad' && <Path d="M57.5 76.5 h5 v3.5 q-2.5 1.2 -5 0 z" fill="#FFFFFF" stroke={INK} strokeOpacity={0.3} strokeWidth={0.8} />}
                <HeadWear stage={st} accessory={accessory} c={c} />
                {!L.body && accessory === 'scarf' && (
                  <G>
                    <Path d="M28 84 Q60 100 92 84 L92 94 Q60 110 28 94 Z" fill={c.scarf.url} {...OUTLINE} />
                    <Path d="M72 96 L76 116 L86 114 L82 94 Z" fill={c.scarf.url} {...OUTLINE} />
                  </G>
                )}
              </G>
            </Layer>
          </Group>

          {!L.body && feet}
          {!L.body && arms}
        </Group>

        {(mood === 'celebrate' || legendary) && (
          <Layer size={size}>
            <Sparkle x={14} y={30} r={7} color="#FFC233" />
            <Sparkle x={106} y={22} r={8} color="#FFC233" />
            <Sparkle x={110} y={56} r={4.5} color={lighten('#7C5CFF', 0.3)} />
            <Sparkle x={10} y={58} r={4} color={lighten('#FF7AC6', 0.2)} />
          </Layer>
        )}

    </Frame>
  );
}
