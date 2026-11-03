import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import type { PetSpecies } from '@/data/types';
import type { Mood } from '@/game/engine';

export const PETS: { id: PetSpecies; name: string; body: string; belly: string; accent: string }[] = [
  { id: 'cat', name: 'Cat', body: '#FFB86B', belly: '#FFE3C2', accent: '#E08A3A' },
  { id: 'bunny', name: 'Bunny', body: '#ECE6FF', belly: '#FFFFFF', accent: '#FF9ACB' },
  { id: 'dino', name: 'Dino', body: '#6EDB9A', belly: '#C9F5D9', accent: '#2FA866' },
];

const INK = '#2A2440';

function Face({ mood }: { mood: Mood }) {
  const eyes =
    mood === 'happy' || mood === 'celebrate' ? (
      <G stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <Path d="M36 56 Q40 51 44 56" />
        <Path d="M56 56 Q60 51 64 56" />
      </G>
    ) : (
      <G>
        <Circle cx="40" cy="55" r="3.5" fill={INK} />
        <Circle cx="60" cy="55" r="3.5" fill={INK} />
        {mood === 'sad' && (
          <G stroke={INK} strokeWidth="2" strokeLinecap="round">
            <Path d="M35 50 L44 47" />
            <Path d="M65 50 L56 47" />
          </G>
        )}
      </G>
    );
  const mouth =
    mood === 'sad' ? (
      <Path d="M44 68 Q50 63 56 68" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    ) : mood === 'idle' ? (
      <Path d="M46 64 Q50 67 54 64" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    ) : (
      <Path d="M43 62 Q50 72 57 62 Z" fill={INK} />
    );
  return (
    <G>
      {eyes}
      {mouth}
      <Ellipse cx="32" cy="63" rx="4" ry="2.5" fill="#FF7AC6" opacity={0.4} />
      <Ellipse cx="68" cy="63" rx="4" ry="2.5" fill="#FF7AC6" opacity={0.4} />
      {mood === 'sad' && <Path d="M66 60 Q68 66 66 68 Q64 66 66 60 Z" fill="#3BA7FF" />}
    </G>
  );
}

type Props = { species: PetSpecies; mood?: Mood; size?: number };

/** Companion pet. Bounces faster when celebrating and droops when sad. */
export function Pet({ species, mood = 'happy', size = 90 }: Props) {
  const y = useSharedValue(0);
  useEffect(() => {
    const height = mood === 'celebrate' ? -14 : mood === 'sad' ? -1 : -5;
    const speed = mood === 'celebrate' ? 260 : mood === 'sad' ? 1600 : 800;
    y.value = withRepeat(withSequence(withTiming(height, { duration: speed }), withTiming(0, { duration: speed })), -1);
  }, [mood, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const p = PETS.find((x) => x.id === species) ?? PETS[0];

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx="50" cy="95" rx="26" ry="4" fill="#000" opacity={0.12} />
        {species === 'cat' && (
          <G fill={p.body}>
            <Path d="M22 40 L26 14 L44 30 Z" />
            <Path d="M78 40 L74 14 L56 30 Z" />
            <Path d="M80 80 Q98 70 90 52" stroke={p.accent} strokeWidth="7" strokeLinecap="round" fill="none" />
          </G>
        )}
        {species === 'bunny' && (
          <G>
            <Ellipse cx="38" cy="20" rx="8" ry="20" fill={p.body} />
            <Ellipse cx="62" cy="20" rx="8" ry="20" fill={p.body} />
            <Ellipse cx="38" cy="22" rx="4" ry="14" fill={p.accent} />
            <Ellipse cx="62" cy="22" rx="4" ry="14" fill={p.accent} />
          </G>
        )}
        {species === 'dino' && (
          <G fill={p.accent}>
            <Path d="M34 30 L40 16 L46 28 L52 12 L58 28 L64 18 L68 32 Z" />
            <Path d="M78 78 Q96 82 98 66 Q88 74 78 70 Z" />
          </G>
        )}
        <Ellipse cx="50" cy="60" rx="34" ry="32" fill={p.body} />
        <Ellipse cx="50" cy="72" rx="20" ry="16" fill={p.belly} />
        {species === 'cat' && (
          <G stroke={p.accent} strokeWidth="1.8" strokeLinecap="round">
            <Path d="M20 62 L30 63" />
            <Path d="M20 68 L30 66" />
            <Path d="M80 62 L70 63" />
            <Path d="M80 68 L70 66" />
          </G>
        )}
        <Face mood={mood} />
      </Svg>
    </Animated.View>
  );
}
