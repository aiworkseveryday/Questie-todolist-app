import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { PetSpecies } from '@/data/types';
import { AppText } from '@/components/AppText';
import { palette } from '@/theme/tokens';

const INK = '#2A1F3D';
const LINE = { stroke: INK, strokeOpacity: 0.5, strokeWidth: 1.4, strokeLinejoin: 'round' as const };

/** Where the doorway sits in the home's 120×100 box, so the pet can walk in and out of it. */
export const HOME_DOOR = { x: 60, y: 86, w: 38 };

/** A gentle "Zzz" drifting out of the doorway while the pet sleeps inside. */
function Snore() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1);
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateY: -18 * t.value }, { translateX: 8 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: '22%', top: '22%' }, style]}>
      <AppText variant="caption" color={palette.violet}>
        Zzz
      </AppText>
    </Animated.View>
  );
}

/** Wooden sign with the pet's name, propped against the home. */
function NameSign({ name }: { name: string }) {
  const label = name.length > 9 ? `${name.slice(0, 8)}…` : name;
  return (
    <G>
      <Rect x={84} y={74} width={4} height={22} fill="#7A5236" {...LINE} />
      <Rect x={68} y={64} width={46} height={16} rx={4} fill="#E8C48A" {...LINE} />
      <Path d="M71 68 H111" stroke="#C9A06A" strokeWidth={1} />
      <SvgText x={91} y={75.5} fontSize={8.5} fontWeight="bold" fill="#5A3B28" textAnchor="middle">
        {label}
      </SvgText>
    </G>
  );
}

/** Rocky cave with a warm glow inside: the dragon's home. */
function Cave({ name }: { name: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 100">
      <Defs>
        <RadialGradient id="caveGlow" cx="50%" cy="70%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#FFB347" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#3A2430" stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={58} cy={95} rx={52} ry={5} fill="#1A1028" opacity={0.15} />
      {/* boulders piled into an arch */}
      <Path d="M8 96 Q4 60 22 40 Q36 18 60 16 Q86 16 98 38 Q112 58 108 96 Z" fill="#8C7E9E" {...LINE} />
      <Path d="M22 40 Q36 18 60 16 Q72 16 80 22 Q60 26 44 40 Q32 52 30 70 Q20 60 22 40 Z" fill="#A99CBA" opacity={0.9} />
      <Path d="M26 50 Q32 46 38 50 M84 36 Q92 34 96 40 M16 78 Q22 74 28 78 M92 70 Q98 66 104 70" stroke={INK} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
      {/* doorway */}
      <Path d={`M${HOME_DOOR.x - 20} 96 Q${HOME_DOOR.x - 22} 52 ${HOME_DOOR.x} 48 Q${HOME_DOOR.x + 22} 52 ${HOME_DOOR.x + 20} 96 Z`} fill="url(#caveGlow)" {...LINE} />
      {/* moss and a tiny crystal */}
      <Path d="M10 92 Q20 84 30 92 Q40 86 48 94 L10 96 Z M74 94 Q84 86 94 92 Q102 86 110 94 L110 96 L74 96 Z" fill="#5DBE7A" {...LINE} />
      <Path d="M100 48 L104 40 L108 48 L104 54 Z" fill="#7CC6FF" {...LINE} />
      <NameSign name={name} />
    </Svg>
  );
}

/** Wooden doghouse with a round door: home for the cat and bunny. */
function Doghouse({ name, species }: { name: string; species: PetSpecies }) {
  const roof = species === 'bunny' ? '#FF8CC4' : '#E2563B';
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 100">
      <Ellipse cx={58} cy={95} rx={50} ry={5} fill="#1A1028" opacity={0.15} />
      {/* walls */}
      <Path d="M20 50 L60 22 L100 50 L100 96 L20 96 Z" fill="#E8B87A" {...LINE} />
      {[60, 70, 80, 90].map((y) => (
        <Path key={y} d={`M22 ${y} H98`} stroke="#C9935A" strokeWidth={1} />
      ))}
      {/* roof */}
      <Path d="M10 54 L60 14 L110 54 L102 58 L60 25 L18 58 Z" fill={roof} {...LINE} />
      <Path d="M24 48 L60 20" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2} />
      {/* round doorway */}
      <Path d={`M${HOME_DOOR.x - 18} 96 L${HOME_DOOR.x - 18} 66 Q${HOME_DOOR.x - 18} 48 ${HOME_DOOR.x} 48 Q${HOME_DOOR.x + 18} 48 ${HOME_DOOR.x + 18} 66 L${HOME_DOOR.x + 18} 96 Z`} fill="#4A2E24" {...LINE} />
      <Circle cx={60} cy={34} r={4} fill="#FFC233" {...LINE} />
      {/* food bowl by the door */}
      <Path d="M8 90 H26 L23 96 H11 Z" fill="#3BA7FF" {...LINE} />
      <NameSign name={name} />
    </Svg>
  );
}

/**
 * The pet's home in the top card. The pet walks out of the doorway when the app opens and back in
 * at night; while it's out exploring, the home stays empty.
 */
export function PetHome({ species, name, size = 110, sleeping = false }: { species: PetSpecies; name: string; size?: number; sleeping?: boolean }) {
  return (
    <View style={{ width: size, height: size * (100 / 120) }}>
      {species === 'dino' ? <Cave name={name} /> : <Doghouse name={name} species={species} />}
      {sleeping && <Snore />}
    </View>
  );
}
