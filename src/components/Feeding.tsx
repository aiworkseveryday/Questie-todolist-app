import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FoodIcon } from '@/characters/FoodIcon';
import { Pet } from '@/characters/Pet';
import type { PetSpecies } from '@/data/types';
import { AppText } from './AppText';

const BITES = 4;
const BITE_MS = 850;
/** How long the whole scene lasts: settle, bites, then the happy moment. */
export const EATING_MS = 400 + BITES * BITE_MS + 2200;

function Heart({ i }: { i: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(i * 160, withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
  }, [i, t]);
  const drift = (i % 2 ? 1 : -1) * (8 + i * 5);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [{ translateY: -60 * t.value }, { translateX: drift * t.value }, { scale: 0.6 + t.value * 0.5 }],
  }));
  return (
    <Animated.View style={[styles.heart, style]}>
      <AppText style={{ fontSize: 20, lineHeight: 24 }}>💖</AppText>
    </Animated.View>
  );
}

/** A few crumbs that pop off the food on each bite. */
function Crumbs({ bite, color }: { bite: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });
  }, [bite, t]);
  return (
    <>
      {[-1, 0, 1].map((d) => (
        <CrumbBit key={d} t={t} dx={d * 12 + (bite % 2 ? 4 : -4)} color={color} />
      ))}
    </>
  );
}

function CrumbBit({ t, dx, color }: { t: { value: number }; dx: number; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ translateX: dx * t.value }, { translateY: -14 * t.value + 24 * t.value * t.value }],
  }));
  return <Animated.View style={[styles.crumb, { backgroundColor: color }, style]} />;
}

const CRUMB: Record<string, string> = { kibble: '#C98A4A', apple: '#FF4D5E', choco: '#7A4A2A', cake: '#FFD9A8' };

/**
 * Feeding scene: food is set down in front of the pet, the pet leans in and takes a few slow bites
 * (food shrinks, crumbs fly), then beams with a happy face and hearts.
 */
export function EatingScene({
  species,
  stage,
  accessory,
  foodId,
  size,
}: {
  species: PetSpecies;
  stage: number;
  accessory: string | null;
  foodId: string;
  size: number;
}) {
  const [bite, setBite] = useState(0);
  const done = bite >= BITES;
  const lean = useSharedValue(0);
  const drop = useSharedValue(0);
  const food = useSharedValue(1);

  useEffect(() => {
    drop.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    // Lean in and back for every bite
    lean.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: BITE_MS * 0.45, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: BITE_MS * 0.55, easing: Easing.inOut(Easing.quad) }),
        ),
        BITES,
      ),
    );
    const timers = Array.from({ length: BITES }, (_, i) =>
      setTimeout(() => {
        setBite(i + 1);
        food.value = withTiming(1 - (i + 1) / BITES, { duration: 180 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 400 + i * BITE_MS + BITE_MS * 0.45),
    );
    const happy = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400 + BITES * BITE_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(happy);
    };
  }, [drop, lean, food]);

  const petStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lean.value * size * 0.2 }, { translateY: lean.value * size * 0.08 }, { rotate: `${lean.value * 12}deg` }],
  }));
  const foodStyle = useAnimatedStyle(() => ({
    opacity: food.value === 0 ? 0 : 1,
    transform: [{ translateY: -30 * (1 - drop.value) }, { scale: 0.35 + food.value * 0.65 }],
  }));

  return (
    <View style={{ width: size * 1.3, height: size }}>
      <Animated.View style={petStyle}>
        <Pet species={species} stage={stage} accessory={accessory} size={size} mood={done ? 'celebrate' : 'idle'} />
      </Animated.View>
      <View pointerEvents="none" style={[styles.food, { left: size * 0.88, top: size * 0.6 }]}>
        <Animated.View style={foodStyle}>
          <FoodIcon id={foodId} size={size * 0.38} />
        </Animated.View>
        {bite > 0 && !done && <Crumbs key={bite} bite={bite} color={CRUMB[foodId] ?? '#C98A4A'} />}
      </View>
      {done && (
        <View pointerEvents="none" style={[styles.hearts, { left: size * 0.4 }]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Heart key={i} i={i} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  food: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  crumb: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5 },
  hearts: { position: 'absolute', top: 10, alignItems: 'center' },
  heart: { position: 'absolute' },
});
