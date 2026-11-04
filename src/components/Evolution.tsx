import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Pet } from '@/characters/Pet';
import { useGame } from '@/data/store';
import { PET_STAGES } from '@/game/engine';
import { useTheme } from '@/theme/ThemeProvider';
import { EASE_OUT } from '@/theme/motion';
import { palette, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button3D } from './Button3D';
import { Confetti } from './Confetti';

const BLAST_COLORS = ['#FFC233', '#7C5CFF', '#FF7AC6', '#22C58B', '#3BA7FF', '#FF8A1F'];

/** Deterministic pseudo-random in [0, 1) so renders stay pure. */
function rand(seed: number) {
  const x = Math.sin(seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Spark({ seed, delay }: { seed: number; delay: number }) {
  const t = useSharedValue(0);
  const angle = rand(seed) * Math.PI * 2;
  const dist = 90 + rand(seed + 1) * 90;
  const size = 7 + rand(seed + 2) * 7;
  const color = BLAST_COLORS[seed % BLAST_COLORS.length];
  // Worklets can't call JS helpers, so work out the spin up front
  const spin = rand(seed + 3) * 540;
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value * t.value,
    transform: [
      { translateX: Math.cos(angle) * dist * t.value },
      // a touch of gravity pulls the sparks down as they fly out
      { translateY: Math.sin(angle) * dist * t.value + 60 * t.value * t.value },
      { rotate: `${spin * t.value}deg` },
    ],
  }));
  return <Animated.View style={[styles.spark, { width: size, height: size * 0.6, backgroundColor: color }, style]} />;
}

/** A ring of confetti exploding outwards from the pet. */
function Blast({ delay, count = 28, seed = 0 }: { delay: number; count?: number; seed?: number }) {
  const ids = useMemo(() => Array.from({ length: count }, (_, i) => i + seed), [count, seed]);
  return (
    <View pointerEvents="none" style={styles.blast}>
      {ids.map((i) => (
        <Spark key={i} seed={i + 1} delay={delay} />
      ))}
    </View>
  );
}

/** Old form glows white and fades out while the new form grows in behind a light ring. */
function Transform({ species, from, to, accessory }: { species: Parameters<typeof Pet>[0]['species']; from: number; to: number; accessory: string | null }) {
  const t = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(250, withTiming(1, { duration: 900, easing: EASE_OUT }));
    spin.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1);
  }, [t, spin]);
  const oldStyle = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 1 - t.value * 0.3 }] }));
  const newStyle = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.6 + t.value * 0.4 }] }));
  const flash = useAnimatedStyle(() => ({ opacity: t.value < 0.5 ? t.value * 1.6 : (1 - t.value) * 1.6 }));
  const ring = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ rotate: `${spin.value * 360}deg` }] }));
  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.ring, ring]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, oldStyle]}>
        <Pet species={species} stage={from} mood="idle" size={150} accessory={accessory} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, newStyle]}>
        <Pet species={species} stage={to} mood="celebrate" size={170} accessory={accessory} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.flash, flash]} />
    </View>
  );
}

/** "Congratulations! Mochi evolved into a Kid!" with confetti blasts. Waits until any level-up popup is closed. */
export function Evolution() {
  const { evolution, dismissEvolution, reward, profile } = useGame();
  const { colors } = useTheme();
  const visible = !!evolution && !reward && !!profile;

  useEffect(() => {
    if (!visible) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const t = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 700);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible || !evolution || !profile) return null;
  const stage = PET_STAGES[evolution.stage];
  const legendary = evolution.stage === PET_STAGES.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissEvolution}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="caption" upper color={palette.violet}>
            {legendary ? 'Legendary form unlocked' : 'Evolution!'}
          </AppText>
          <Transform species={profile.pet} from={evolution.stage - 1} to={evolution.stage} accessory={profile.pet_accessory} />
          <AppText variant="title" center>
            Congratulations!
          </AppText>
          <AppText variant="heading" center color={palette.violet}>
            {profile.pet_name} evolved into a {stage.name}!
          </AppText>
          <AppText muted center>
            {legendary
              ? 'The ultimate form. Your hard work made this happen.'
              : `Keep completing quests and ${profile.pet_name} will keep growing.`}
          </AppText>
          <Button3D title="Awesome!" onPress={dismissEvolution} style={{ alignSelf: 'stretch', marginTop: space.sm }} />
        </View>
        <Blast delay={900} />
        <Blast delay={1300} seed={40} count={22} />
        <Confetti count={70} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,8,20,0.6)', justifyContent: 'center', padding: space.xl },
  sheet: { borderRadius: radius.lg, borderWidth: 2, padding: space.xl, alignItems: 'center', gap: space.sm },
  stage: { width: 200, height: 190, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: '#FFC233',
    borderStyle: 'dashed',
  },
  flash: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#FFFFFF' },
  blast: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', borderRadius: 2 },
});
