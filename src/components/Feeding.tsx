import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FoodIcon } from '@/characters/FoodIcon';
import { AppText } from './AppText';

function Heart({ i }: { i: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(500 + i * 140, withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
  }, [i, t]);
  const drift = (i % 2 ? 1 : -1) * (10 + i * 6);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [{ translateY: -70 * t.value }, { translateX: drift * t.value }, { scale: 0.6 + t.value * 0.6 }],
  }));
  return (
    <Animated.View style={[styles.heart, style]}>
      <AppText style={{ fontSize: 22, lineHeight: 26 }}>💖</AppText>
    </Animated.View>
  );
}

/** Food drops onto the pet, gets gobbled up, and hearts float away. Remount (key) to replay. */
export function Feeding({ foodId }: { foodId: string }) {
  const drop = useSharedValue(0);
  const munch = useSharedValue(1);
  useEffect(() => {
    drop.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.6)) });
    munch.value = withDelay(
      420,
      withSequence(
        withTiming(0.8, { duration: 120 }),
        withTiming(0.95, { duration: 120 }),
        withTiming(0.6, { duration: 120 }),
        withTiming(0, { duration: 180 }),
      ),
    );
  }, [drop, munch]);
  const foodStyle = useAnimatedStyle(() => ({
    opacity: munch.value,
    transform: [{ translateY: -50 + drop.value * 50 }, { scale: munch.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={foodStyle}>
        <FoodIcon id={foodId} size={40} />
      </Animated.View>
      {[0, 1, 2, 3, 4].map((i) => (
        <Heart key={i} i={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, top: 0, width: 84, height: 84, alignItems: 'center', justifyContent: 'flex-end' },
  heart: { position: 'absolute', bottom: 30 },
});
