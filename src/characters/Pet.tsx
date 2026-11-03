import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path } from 'react-native-svg';

import type { PetSpecies } from '@/data/types';
import type { Mood } from '@/game/engine';
import { Ball, darken, Drop, Glow, Iris, lighten, OUTLINE, useGradientIds } from './paint';

export const PETS: { id: PetSpecies; name: string; body: string; belly: string; accent: string; eyes: string }[] = [
  { id: 'cat', name: 'Cat', body: '#FFAE5C', belly: '#FFE6C7', accent: '#E07F2C', eyes: '#2E9E6A' },
  { id: 'bunny', name: 'Bunny', body: '#EEE8FF', belly: '#FFFFFF', accent: '#FF8CC4', eyes: '#7A55E8' },
  { id: 'dino', name: 'Dino', body: '#5FD68F', belly: '#D2F7DF', accent: '#24A35F', eyes: '#B8622A' },
];

const INK = '#2A1F3D';

/** Four-point sparkle */
function Sparkle({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const k = r * 0.28;
  return (
    <Path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`}
      fill={color}
    />
  );
}

function GlossyEye({ cx, fill }: { cx: number; fill: string }) {
  return (
    <G>
      <Ellipse cx={cx} cy={64} rx={7.5} ry={9} fill={fill} />
      <Circle cx={cx + 2.7} cy={60} r={3.1} fill="#FFFFFF" />
      <Circle cx={cx - 2.6} cy={68} r={1.5} fill="#FFFFFF" opacity={0.85} />
    </G>
  );
}

function Face({ mood, iris, tear }: { mood: Mood; iris: string; tear: string }) {
  const closed = mood === 'happy' || mood === 'celebrate';
  return (
    <G>
      {closed ? (
        <G stroke={INK} strokeWidth={3.6} strokeLinecap="round" fill="none">
          <Path d="M38 67 Q45 57 52 67" />
          <Path d="M68 67 Q75 57 82 67" />
        </G>
      ) : (
        <G>
          <GlossyEye cx={45} fill={iris} />
          <GlossyEye cx={75} fill={iris} />
        </G>
      )}
      {mood === 'sad' && (
        <G stroke={INK} strokeWidth={2.4} strokeLinecap="round">
          <Path d="M36 53 L47 50" />
          <Path d="M84 53 L73 50" />
        </G>
      )}
      {mood === 'sad' ? (
        <Path d="M53 81 Q60 75 67 81" stroke={INK} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      ) : mood === 'idle' ? (
        <Path d="M53 76 Q56.5 80 60 76 Q63.5 80 67 76" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      ) : (
        <G>
          <Path d="M52 74 Q60 86 68 74 Z" fill="#5A2333" />
          <Ellipse cx="60" cy="80.5" rx="3.6" ry="1.9" fill="#FF7A8A" />
        </G>
      )}
      {mood === 'sad' && <Path d="M82 70 Q85.5 77 82 80 Q78.5 77 82 70 Z" fill={tear} />}
    </G>
  );
}

type Props = { species: PetSpecies; mood?: Mood; size?: number };

/** Companion pet drawn with soft 3D shading. Bounces faster when celebrating and droops when sad. */
export function Pet({ species, mood = 'happy', size = 90 }: Props) {
  const y = useSharedValue(0);
  useEffect(() => {
    const height = mood === 'celebrate' ? -14 : mood === 'sad' ? -1 : -5;
    const speed = mood === 'celebrate' ? 260 : mood === 'sad' ? 1600 : 800;
    y.value = withRepeat(withSequence(withTiming(height, { duration: speed }), withTiming(0, { duration: speed })), -1);
  }, [mood, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scaleY: 1 - y.value * 0.005 }] }));

  const p = PETS.find((x) => x.id === species) ?? PETS[0];
  const g = useGradientIds();
  const ids = {
    body: g('body'),
    belly: g('belly'),
    accent: g('accent'),
    inner: g('inner'),
    iris: g('iris'),
    blush: g('blush'),
    tear: g('tear'),
    shadow: g('shadow'),
  };
  const dark = darken(p.body, 0.2);

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <Ball id={ids.body.id} color={p.body} />
          <Ball id={ids.belly.id} color={p.belly} />
          <Drop id={ids.accent.id} color={p.accent} from={0.3} to={0.25} />
          <Drop id={ids.inner.id} color="#FF9ACB" from={0.3} to={0.15} />
          <Iris id={ids.iris.id} color={p.eyes} />
          <Glow id={ids.blush.id} color="#FF6FA8" opacity={0.55} />
          <Drop id={ids.tear.id} color="#7CC6FF" from={0.5} to={0.1} />
          <Glow id={ids.shadow.id} color="#1A1028" opacity={0.35} />
        </Defs>

        <Ellipse cx="60" cy="112" rx="38" ry="6" fill={ids.shadow.url} />

        {/* behind the body: ears and tails */}
        {species === 'cat' && (
          <G>
            <Path d="M100 94 Q122 84 112 58 Q109 52 104 56 Q110 80 94 87 Z" fill={ids.accent.url} {...OUTLINE} />
            <Path d="M24 52 Q24 26 30 14 Q44 24 54 38 Z" fill={ids.body.url} {...OUTLINE} />
            <Path d="M96 52 Q96 26 90 14 Q76 24 66 38 Z" fill={ids.body.url} {...OUTLINE} />
            <Path d="M31 42 Q31 30 33 23 Q41 29 46 36 Z" fill={ids.inner.url} />
            <Path d="M89 42 Q89 30 87 23 Q79 29 74 36 Z" fill={ids.inner.url} />
          </G>
        )}
        {species === 'bunny' && (
          <G>
            <G transform="rotate(-10 44 30)">
              <Ellipse cx="44" cy="24" rx="11" ry="25" fill={ids.body.url} {...OUTLINE} />
              <Ellipse cx="44" cy="26" rx="5.5" ry="17" fill={ids.inner.url} />
            </G>
            <G transform="rotate(10 76 30)">
              <Ellipse cx="76" cy="24" rx="11" ry="25" fill={ids.body.url} {...OUTLINE} />
              <Ellipse cx="76" cy="26" rx="5.5" ry="17" fill={ids.inner.url} />
            </G>
            <Circle cx="100" cy="94" r="9" fill={ids.body.url} {...OUTLINE} />
          </G>
        )}
        {species === 'dino' && (
          <G>
            <Path d="M94 84 Q116 90 118 70 Q108 80 94 76 Z" fill={ids.body.url} {...OUTLINE} />
            <Path
              d="M36 42 L42 26 L49 38 L56 20 L63 37 L71 24 L77 40 L84 32 L86 46 Z"
              fill={ids.accent.url}
              {...OUTLINE}
            />
          </G>
        )}

        {/* body */}
        <Ellipse cx="60" cy="70" rx="40" ry="37" fill={ids.body.url} {...OUTLINE} />
        <Ellipse cx="60" cy="86" rx="24" ry="17" fill={ids.belly.url} />
        {species === 'dino' && (
          <G fill={p.accent} opacity={0.45}>
            <Ellipse cx="28" cy="80" rx="4" ry="3" />
            <Ellipse cx="92" cy="78" rx="5" ry="3.5" />
            <Ellipse cx="86" cy="92" rx="3" ry="2.2" />
          </G>
        )}
        {species === 'cat' && (
          <G stroke={p.accent} strokeWidth={2.6} strokeLinecap="round" opacity={0.75}>
            <Path d="M54 36 L55 44" />
            <Path d="M60 34 L60 43" />
            <Path d="M66 36 L65 44" />
          </G>
        )}

        {/* paws and feet */}
        <Ellipse cx="30" cy="90" rx="7.5" ry="9" fill={ids.body.url} {...OUTLINE} />
        <Ellipse cx="90" cy="90" rx="7.5" ry="9" fill={ids.body.url} {...OUTLINE} />
        <Ellipse cx="44" cy="105" rx="12" ry="6.5" fill={dark} {...OUTLINE} />
        <Ellipse cx="76" cy="105" rx="12" ry="6.5" fill={dark} {...OUTLINE} />
        <Ellipse cx="42" cy="103" rx="5" ry="1.8" fill="#FFFFFF" opacity={0.3} />
        <Ellipse cx="74" cy="103" rx="5" ry="1.8" fill="#FFFFFF" opacity={0.3} />

        {species === 'cat' && (
          <G stroke={darken(p.accent, 0.1)} strokeWidth={1.6} strokeLinecap="round" opacity={0.8}>
            <Path d="M18 72 L30 74" />
            <Path d="M18 79 L30 78" />
            <Path d="M102 72 L90 74" />
            <Path d="M102 79 L90 78" />
          </G>
        )}

        <Ellipse cx="33" cy="77" rx="8" ry="5" fill={ids.blush.url} />
        <Ellipse cx="87" cy="77" rx="8" ry="5" fill={ids.blush.url} />
        <Face mood={mood} iris={ids.iris.url} tear={ids.tear.url} />
        {species === 'bunny' && mood !== 'sad' && (
          <Path d="M57 74 h6 v4 q-3 1.5 -6 0 z" fill="#FFFFFF" stroke={INK} strokeOpacity={0.3} strokeWidth={0.8} />
        )}

        {/* rim light */}
        <Path d="M26 56 Q32 40 48 35" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" fill="none" />

        {mood === 'celebrate' && (
          <G>
            <Sparkle x={14} y={30} r={7} color="#FFC233" />
            <Sparkle x={106} y={22} r={8} color="#FFC233" />
            <Sparkle x={110} y={56} r={4.5} color={lighten('#7C5CFF', 0.3)} />
            <Sparkle x={10} y={58} r={4} color={lighten('#FF7AC6', 0.2)} />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}
