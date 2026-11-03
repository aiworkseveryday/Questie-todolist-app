import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { HeroGender } from '@/data/types';
import { Ball, darken, Drop, Glow, Iris, lighten, OUTLINE, useGradientIds } from './paint';

export const HERO_LOOKS = [
  { name: 'Violet', skin: '#F7D4B8', hair: '#6B4430', outfit: '#7C5CFF', eyes: '#7A55E8' },
  { name: 'Mint', skin: '#DDA680', hair: '#2A211D', outfit: '#1FBF88', eyes: '#1E9C73' },
  { name: 'Ember', skin: '#94603F', hair: '#2B1A12', outfit: '#FF8A1F', eyes: '#B8622A' },
];

const INK = '#2A1F3D';
const GOLD = '#FFC233';

type Props = { gender: HeroGender; look: number; size?: number; bounce?: boolean };

function Eye({ cx, fill, lashes }: { cx: number; fill: string; lashes: boolean }) {
  const flick = cx < 60 ? -1 : 1;
  return (
    <G>
      <Ellipse cx={cx} cy={58} rx={7.2} ry={9} fill={fill} />
      <Ellipse cx={cx} cy={59.5} rx={3.6} ry={4.6} fill="#0E0818" />
      <Circle cx={cx + 2.6} cy={54.2} r={2.9} fill="#FFFFFF" />
      <Circle cx={cx - 2.6} cy={62.5} r={1.4} fill="#FFFFFF" opacity={0.85} />
      {lashes && (
        <Path
          d={`M${cx - 7 * flick} 52 Q${cx} 46 ${cx + 7.5 * flick} 51 L${cx + 10 * flick} 48`}
          stroke={INK}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </G>
  );
}

/** Chibi adventurer drawn to look rendered: shaded volumes, glossy eyes, rim light and a trusty sword. */
export function Hero({ gender, look, size = 120, bounce = true }: Props) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (!bounce) return;
    y.value = withRepeat(withSequence(withTiming(-4, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, [bounce, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scaleY: 1 - y.value * 0.004 }] }));

  const l = HERO_LOOKS[look] ?? HERO_LOOKS[0];
  const g = useGradientIds();
  const ids = {
    skin: g('skin'),
    limb: g('limb'),
    hair: g('hair'),
    outfit: g('outfit'),
    cape: g('cape'),
    pants: g('pants'),
    boot: g('boot'),
    gold: g('gold'),
    blade: g('blade'),
    iris: g('iris'),
    blush: g('blush'),
    shadow: g('shadow'),
  };
  const female = gender === 'female';

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size * 1.25} viewBox="0 0 120 150">
        <Defs>
          <Ball id={ids.skin.id} color={l.skin} />
          <Drop id={ids.limb.id} color={l.skin} from={0.15} to={0.15} />
          <Drop id={ids.hair.id} color={l.hair} from={0.3} to={0.35} />
          <Ball id={ids.outfit.id} color={l.outfit} />
          <Drop id={ids.cape.id} color={darken(l.outfit, 0.25)} from={0.1} to={0.35} />
          <Drop id={ids.pants.id} color="#3E3566" />
          <Drop id={ids.boot.id} color="#7A5236" from={0.2} to={0.4} />
          <Drop id={ids.gold.id} color={GOLD} from={0.5} to={0.25} />
          <Drop id={ids.blade.id} color="#C9D3E4" from={0.8} to={0.2} />
          <Iris id={ids.iris.id} color={l.eyes} />
          <Glow id={ids.blush.id} color="#FF6FA8" opacity={0.55} />
          <Glow id={ids.shadow.id} color="#1A1028" opacity={0.35} />
        </Defs>

        <Ellipse cx="60" cy="143" rx="34" ry="6" fill={ids.shadow.url} />

        {/* cape with folds */}
        <Path d="M38 86 Q28 112 26 134 Q60 143 94 134 Q92 112 82 86 Z" fill={ids.cape.url} {...OUTLINE} />
        <Path d="M44 100 Q40 118 40 134 M76 100 Q80 118 80 134" stroke={darken(l.outfit, 0.5)} strokeOpacity={0.35} strokeWidth={1.5} fill="none" />

        {/* legs and boots */}
        <Rect x="46" y="114" width="12" height="20" rx="5" fill={ids.pants.url} {...OUTLINE} />
        <Rect x="62" y="114" width="12" height="20" rx="5" fill={ids.pants.url} {...OUTLINE} />
        <Rect x="42" y="127" width="18" height="11" rx="5.5" fill={ids.boot.url} {...OUTLINE} />
        <Rect x="60" y="127" width="18" height="11" rx="5.5" fill={ids.boot.url} {...OUTLINE} />
        <Ellipse cx="48" cy="130" rx="4" ry="1.6" fill="#FFFFFF" opacity={0.3} />
        <Ellipse cx="66" cy="130" rx="4" ry="1.6" fill="#FFFFFF" opacity={0.3} />

        {/* left arm */}
        <Rect x="27" y="87" width="13" height="26" rx="6.5" fill={ids.outfit.url} {...OUTLINE} />
        <Circle cx="33.5" cy="114" r="6.5" fill={ids.skin.url} {...OUTLINE} />

        {/* tunic */}
        <Path d="M39 86 Q60 77 81 86 L85 120 Q60 128 35 120 Z" fill={ids.outfit.url} {...OUTLINE} />
        <Path d="M47 84 Q60 96 73 84 Q60 90 47 84 Z" fill={lighten(l.outfit, 0.35)} />
        <Path d="M60 90 L60 104" stroke={darken(l.outfit, 0.35)} strokeOpacity={0.4} strokeWidth={1.5} />
        <Path d="M60 92 l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill={ids.gold.url} stroke={darken(GOLD, 0.4)} strokeWidth={0.8} />
        <Rect x="35" y="107" width="50" height="7" rx="2" fill="#5A3B28" {...OUTLINE} />
        <Rect x="54.5" y="104.5" width="11" height="12" rx="2.5" fill={ids.gold.url} stroke={darken(GOLD, 0.4)} strokeWidth={1} />
        <Rect x="57.5" y="107.5" width="5" height="6" rx="1" fill="none" stroke={darken(GOLD, 0.45)} strokeWidth={1.2} />

        {/* sword held in the right hand */}
        <G transform="rotate(30 87 113)">
          <Path d="M84.5 64 L87 56 L89.5 64 L89.5 106 L84.5 106 Z" fill={ids.blade.url} {...OUTLINE} />
          <Path d="M87 60 L87 104" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1} />
          <Rect x="79" y="105" width="16" height="4.5" rx="2.2" fill={ids.gold.url} {...OUTLINE} />
          <Rect x="85" y="109" width="4" height="10" rx="1.5" fill="#5A3B28" />
          <Circle cx="87" cy="121" r="2.8" fill={ids.gold.url} />
        </G>
        <Rect x="80" y="87" width="13" height="26" rx="6.5" fill={ids.outfit.url} {...OUTLINE} />
        <Circle cx="86.5" cy="114" r="6.5" fill={ids.skin.url} {...OUTLINE} />

        {/* long hair sits behind the head */}
        {female && (
          <Path
            d="M24 52 C18 6 102 6 96 52 L99 96 Q91 104 83 95 L80 66 L40 66 L37 95 Q29 104 21 96 Z"
            fill={ids.hair.url}
            {...OUTLINE}
          />
        )}

        {/* head */}
        <Ellipse cx="26" cy="57" rx="6" ry="8" fill={ids.skin.url} {...OUTLINE} />
        <Ellipse cx="94" cy="57" rx="6" ry="8" fill={ids.skin.url} {...OUTLINE} />
        <Circle cx="60" cy="52" r="34" fill={ids.skin.url} {...OUTLINE} />

        {/* hair front */}
        {female ? (
          <G>
            <Path
              d="M24 58 C14 2 106 2 96 58 C93 42 82 31 67 33 C58 41 45 43 35 40 C29 45 26 51 24 58 Z"
              fill={ids.hair.url}
              {...OUTLINE}
            />
            {/* hair clip */}
            <Path d="M84 22 L76 14 L76 30 Z M84 22 L92 14 L92 30 Z" fill="#FF7AC6" stroke={darken('#FF7AC6', 0.4)} strokeWidth={1} />
            <Circle cx="84" cy="22" r="3.2" fill={ids.gold.url} />
          </G>
        ) : (
          <Path
            d="M25 57 C17 4 103 4 95 57 C93 45 88 38 82 35 L78 43 L72 32 L64 41 L57 30 L50 40 L43 32 L38 42 C32 41 27 47 25 57 Z"
            fill={ids.hair.url}
            {...OUTLINE}
          />
        )}
        {/* glossy hair band */}
        <Path d="M40 27 Q58 18 78 24" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" fill="none" />

        {/* brows, eyes, blush, nose, mouth */}
        <Path d="M40 45 Q46 42 52 44 M68 44 Q74 42 80 45" stroke={darken(l.hair, 0.2)} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        <Eye cx={47} fill={ids.iris.url} lashes={female} />
        <Eye cx={73} fill={ids.iris.url} lashes={female} />
        <Ellipse cx="37" cy="70" rx="7" ry="4.5" fill={ids.blush.url} />
        <Ellipse cx="83" cy="70" rx="7" ry="4.5" fill={ids.blush.url} />
        <Ellipse cx="60" cy="66.5" rx="2" ry="1.3" fill={darken(l.skin, 0.25)} opacity={0.6} />
        <Path d="M53 71 Q60 81 67 71 Z" fill="#5A2333" />
        <Ellipse cx="60" cy="76" rx="3.4" ry="1.7" fill="#FF7A8A" />

        {/* rim light */}
        <Path d="M91 58 Q91 68 85 76" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
