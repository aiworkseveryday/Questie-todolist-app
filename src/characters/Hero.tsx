import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { HeroGender } from '@/data/types';
import { shade } from '@/theme/tokens';

export const HERO_LOOKS = [
  { name: 'Violet', skin: '#F6D2B4', hair: '#5A3A28', outfit: '#7C5CFF' },
  { name: 'Mint', skin: '#D9A47E', hair: '#1F1A17', outfit: '#22C58B' },
  { name: 'Ember', skin: '#8D5A3C', hair: '#2B1B12', outfit: '#FF8A1F' },
];

type Props = { gender: HeroGender; look: number; size?: number; bounce?: boolean };

/** Chibi adventurer. Female heroes get long hair; looks change skin, hair and outfit. */
export function Hero({ gender, look, size = 120, bounce = true }: Props) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (!bounce) return;
    y.value = withRepeat(withSequence(withTiming(-4, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, [bounce, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const l = HERO_LOOKS[look] ?? HERO_LOOKS[0];
  const skinDark = shade(l.skin, 0.12);
  const outfitDark = shade(l.outfit);

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
        <Ellipse cx="50" cy="114" rx="24" ry="4" fill="#000" opacity={0.12} />
        {/* cape */}
        <Path d="M30 72 L24 104 Q50 110 76 104 L70 72 Z" fill={outfitDark} />
        {/* legs and boots */}
        <Rect x="38" y="92" width="10" height="16" rx="4" fill="#3B3355" />
        <Rect x="52" y="92" width="10" height="16" rx="4" fill="#3B3355" />
        <Rect x="36" y="104" width="13" height="6" rx="3" fill="#2A2440" />
        <Rect x="51" y="104" width="13" height="6" rx="3" fill="#2A2440" />
        {/* arms */}
        <Rect x="25" y="72" width="10" height="22" rx="5" fill={l.skin} />
        <Rect x="65" y="72" width="10" height="22" rx="5" fill={l.skin} />
        {/* tunic */}
        <Path d="M34 70 Q50 64 66 70 L68 98 Q50 102 32 98 Z" fill={l.outfit} />
        <Rect x="32" y="86" width="36" height="5" fill={outfitDark} />
        <Rect x="46" y="85" width="8" height="7" rx="2" fill="#FFC233" />
        {/* long hair sits behind the head */}
        {gender === 'female' && (
          <Path
            d="M22 44 C18 6 82 6 78 44 L80 76 Q73 81 66 74 L64 52 L36 52 L34 74 Q27 81 20 76 Z"
            fill={l.hair}
          />
        )}
        {/* head */}
        <Circle cx="50" cy="44" r="26" fill={l.skin} />
        <Ellipse cx="24" cy="48" rx="4" ry="6" fill={skinDark} />
        <Ellipse cx="76" cy="48" rx="4" ry="6" fill={skinDark} />
        {/* hair front */}
        {gender === 'male' ? (
          <Path d="M23 46 C18 8 82 8 77 46 C74 34 66 28 58 31 C52 25 42 28 36 31 C30 34 26 39 23 46 Z" fill={l.hair} />
        ) : (
          <G>
            <Path d="M22 48 C16 6 84 6 78 48 C72 34 60 28 50 32 C40 28 28 34 22 48 Z" fill={l.hair} />
            <Circle cx="70" cy="22" r="7" fill={l.hair} />
          </G>
        )}
        {/* face */}
        <Ellipse cx="41" cy="48" rx="3.5" ry="4.5" fill="#2A2440" />
        <Ellipse cx="59" cy="48" rx="3.5" ry="4.5" fill="#2A2440" />
        <Circle cx="42.2" cy="46.4" r="1.3" fill="#fff" />
        <Circle cx="60.2" cy="46.4" r="1.3" fill="#fff" />
        <Ellipse cx="35" cy="56" rx="4" ry="2.5" fill="#FF7AC6" opacity={0.35} />
        <Ellipse cx="65" cy="56" rx="4" ry="2.5" fill="#FF7AC6" opacity={0.35} />
        <Path d="M44 57 Q50 62 56 57" stroke="#2A2440" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
