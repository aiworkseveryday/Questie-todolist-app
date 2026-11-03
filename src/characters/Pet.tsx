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

type Props = {
  species: PetSpecies;
  mood?: Mood;
  size?: number;
  /** Growth stage, 0 = Baby … 4 = Legendary (see PET_STAGES) */
  stage?: number;
  /** Shop accessory being worn */
  accessory?: string | null;
};

/** Smaller when young; adults and legends are full size. */
const STAGE_SCALE = [0.72, 0.84, 0.93, 1, 1];

/** Companion pet drawn with soft 3D shading. Bounces faster when celebrating and droops when sad. */
export function Pet({ species, mood = 'happy', size = 90, stage = 1, accessory = null }: Props) {
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
    aura: g('aura'),
    wing: g('wing'),
    gold: g('gold'),
    hat: g('hat'),
    lens: g('lens'),
    scarf: g('scarf'),
  };
  const dark = darken(p.body, 0.2);
  const legendary = stage >= 4;
  const scale = STAGE_SCALE[Math.max(0, Math.min(4, stage))];

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
          <Glow id={ids.aura.id} color="#FFD45C" opacity={0.75} />
          <Drop id={ids.wing.id} color="#FFFFFF" from={0} to={0.12} />
          <Drop id={ids.gold.id} color="#FFC233" from={0.5} to={0.25} />
          <Drop id={ids.hat.id} color="#7C5CFF" from={0.3} to={0.2} />
          <Drop id={ids.lens.id} color="#2A1F3D" from={0.25} to={0.2} />
          <Drop id={ids.scarf.id} color="#FF4D5E" from={0.25} to={0.25} />
        </Defs>

        {legendary && <Ellipse cx="60" cy="66" rx="58" ry="54" fill={ids.aura.url} />}
        <Ellipse cx="60" cy="112" rx={38 * scale} ry="6" fill={ids.shadow.url} />

        <G transform={`translate(60 110) scale(${scale}) translate(-60 -110)`}>
        {/* legendary wings fan out behind everything */}
        {legendary && (
          <G>
            <Path d="M30 70 Q2 58 -4 30 Q14 38 18 34 Q10 48 30 54 Q14 52 22 62 Z" fill={ids.wing.url} {...OUTLINE} />
            <Path d="M90 70 Q118 58 124 30 Q106 38 102 34 Q110 48 90 54 Q106 52 98 62 Z" fill={ids.wing.url} {...OUTLINE} />
            <Path d="M8 40 Q16 50 26 56 M112 40 Q104 50 94 56" stroke="#FFC233" strokeOpacity={0.6} strokeWidth={1.5} fill="none" />
          </G>
        )}

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

        {/* growth-stage details */}
        {stage === 0 && (
          <Path d="M60 34 Q56 24 62 20 Q68 18 66 25" stroke={dark} strokeWidth={3} strokeLinecap="round" fill="none" />
        )}
        {stage === 2 && accessory !== 'scarf' && (
          <G>
            <Path d="M30 84 Q60 98 90 84 L88 92 Q60 105 32 92 Z" fill={ids.accent.url} {...OUTLINE} />
            <Path d="M78 92 L90 104 L94 92 Z" fill={ids.accent.url} {...OUTLINE} />
          </G>
        )}
        {stage >= 3 && species === 'cat' && (
          <Path d="M44 88 L49 96 L54 89 L60 98 L66 89 L71 96 L76 88 Q60 94 44 88 Z" fill="#FFFFFF" opacity={0.9} {...OUTLINE} />
        )}
        {stage >= 3 && species === 'bunny' && !legendary && (
          <G>
            {[38, 49, 60, 71, 82].map((x, i) => (
              <G key={x}>
                <Circle cx={x} cy={i % 2 ? 34 : 36} r="5" fill={['#FF8CC4', '#FFC233', '#7CC6FF', '#FFC233', '#FF8CC4'][i]} {...OUTLINE} />
                <Circle cx={x} cy={i % 2 ? 34 : 36} r="1.8" fill="#FFFFFF" />
              </G>
            ))}
          </G>
        )}
        {stage >= 3 && species === 'dino' && (
          <G>
            <Path d="M42 40 L38 24 L50 36 Z M78 40 L82 24 L70 36 Z" fill="#FFF3D6" {...OUTLINE} />
            <Path d="M48 80 H72 M46 88 H74 M48 96 H72" stroke={darken(p.belly, 0.25)} strokeWidth={2} strokeLinecap="round" />
          </G>
        )}
        {legendary && (
          <G>
            <Path d="M42 36 L44 18 L52 28 L60 14 L68 28 L76 18 L78 36 Q60 32 42 36 Z" fill={ids.gold.url} {...OUTLINE} />
            <Circle cx="60" cy="25" r="3" fill="#FF4D5E" />
            <Circle cx="47" cy="29" r="2" fill="#7CC6FF" />
            <Circle cx="73" cy="29" r="2" fill="#7CC6FF" />
          </G>
        )}

        {/* shop accessories */}
        {accessory === 'party_hat' && !legendary && (
          <G>
            <Path d="M46 38 L60 2 L74 38 Q60 43 46 38 Z" fill={ids.hat.url} {...OUTLINE} />
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
        {accessory === 'scarf' && (
          <G>
            <Path d="M28 82 Q60 98 92 82 L92 92 Q60 108 28 92 Z" fill={ids.scarf.url} {...OUTLINE} />
            <Path d="M72 94 L76 116 L86 114 L82 92 Z" fill={ids.scarf.url} {...OUTLINE} />
            <Path d="M36 88 L40 96 M48 92 L50 100 M62 94 L62 102 M76 90 L74 98" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} />
          </G>
        )}
        {accessory === 'shades' && (
          <G>
            <Path d="M30 58 H90" stroke={INK} strokeWidth={3} />
            <Path d="M33 56 H57 Q57 72 45 72 Q33 72 33 56 Z" fill={ids.lens.url} {...OUTLINE} />
            <Path d="M63 56 H87 Q87 72 75 72 Q63 72 63 56 Z" fill={ids.lens.url} {...OUTLINE} />
            <Path d="M37 60 L43 60 M67 60 L73 60" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
          </G>
        )}
        </G>

        {(mood === 'celebrate' || legendary) && (
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
