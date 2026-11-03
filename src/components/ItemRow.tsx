import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Pressable, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Difficulty, Item } from '@/data/types';
import { REWARD } from '@/game/engine';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space, tint } from '@/theme/tokens';
import { AppText } from './AppText';

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: palette.mint,
  medium: palette.sky,
  hard: palette.pink,
};

/** Drag right past this to complete */
const COMPLETE_AT = 90;
/** Width of the edit/delete tray revealed by dragging left */
const TRAY = 136;
const SPRING = { damping: 18, stiffness: 220 };

type Props = {
  item: Item;
  done: boolean;
  /** Today's good/bad taps, for counter habits */
  plus: number;
  minus: number;
  onToggle: () => void;
  onTap: (delta: 1 | -1) => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Floating "+20 XP" that rises and fades after a completion. */
function XpBurst({ amount, color }: { amount: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 900 });
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateY: -28 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.burst, style]}>
      <AppText variant="label" color={color}>
        +{amount} XP
      </AppText>
    </Animated.View>
  );
}

export function ItemRow({ item, done, plus, minus, onToggle, onTap, onEdit, onDelete }: Props) {
  const { colors } = useTheme();
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const armed = useSharedValue(false);
  const pop = useSharedValue(1);
  const [burst, setBurst] = useState<{ key: number; amount: number } | null>(null);
  const isCounter = item.kind === 'counter';
  const accent = DIFFICULTY_COLOR[item.difficulty];
  const reward = REWARD[item.difficulty].xp;

  const complete = () => {
    if (isCounter) {
      onTap(1);
    } else {
      onToggle();
      if (done) return;
    }
    pop.value = withSequence(withSpring(1.25, { damping: 6 }), withSpring(1));
    setBurst({ key: Date.now(), amount: reward });
  };
  const tick = () => Haptics.selectionAsync();
  const close = () => {
    x.value = withSpring(0, SPRING);
  };

  const pan = usePanGesture({
    // Horizontal drags only, so vertical scrolling still works
    activeOffsetX: [-12, 12],
    failOffsetY: [-14, 14],
    onActivate: () => {
      'worklet';
      start.value = x.value;
    },
    onUpdate: (e) => {
      'worklet';
      // Dragging an open tray back only closes it, never completes
      const next = start.value < 0 ? Math.min(0, start.value + e.translationX) : start.value + e.translationX;
      // Rubber-band past the tray / complete point
      x.value = next > 0 ? Math.min(next, COMPLETE_AT + (next - COMPLETE_AT) * 0.25) : Math.max(next, -TRAY - 20);
      const nowArmed = x.value >= COMPLETE_AT;
      if (nowArmed !== armed.value) {
        armed.value = nowArmed;
        scheduleOnRN(tick);
      }
    },
    onDeactivate: () => {
      'worklet';
      if (x.value >= COMPLETE_AT) {
        scheduleOnRN(complete);
        x.value = withSpring(0, SPRING);
      } else {
        x.value = withSpring(x.value < -TRAY / 2 ? -TRAY : 0, SPRING);
      }
      armed.value = false;
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const leftStyle = useAnimatedStyle(() => ({
    opacity: x.value > 2 ? 1 : 0,
    transform: [{ scale: interpolate(x.value, [0, COMPLETE_AT], [0.6, 1.1], 'clamp') }],
  }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: x.value < -2 ? 1 : 0 }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View>
      <Animated.View style={[styles.under, { backgroundColor: colors.success }, leftStyle]}>
        <MaterialCommunityIcons name={isCounter ? 'plus-thick' : done ? 'undo' : 'check-bold'} size={28} color="#fff" />
      </Animated.View>
      <Animated.View style={[styles.tray, rightStyle]}>
        <Pressable
          accessibilityLabel="Edit"
          onPress={() => {
            close();
            onEdit();
          }}
          style={[styles.action, { backgroundColor: colors.info }]}>
          <MaterialCommunityIcons name="pencil" size={22} color="#fff" />
        </Pressable>
        <Pressable
          accessibilityLabel="Delete"
          onPress={() => {
            close();
            onDelete();
          }}
          style={[styles.action, { backgroundColor: colors.danger }]}>
          <MaterialCommunityIcons name="trash-can" size={22} color="#fff" />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <Pressable onLongPress={onEdit} delayLongPress={400}>
            <View
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: done && !isCounter ? 0.6 : 1 },
              ]}>
              {!isCounter && (
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={complete} hitSlop={10}>
                  <Animated.View
                    style={[
                      styles.check,
                      checkStyle,
                      { borderColor: done ? colors.success : colors.border, backgroundColor: done ? colors.success : 'transparent' },
                    ]}>
                    {done && <MaterialCommunityIcons name="check-bold" size={20} color="#fff" />}
                  </Animated.View>
                </Pressable>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="label" style={done && !isCounter ? styles.strike : undefined} numberOfLines={2}>
                  {item.title}
                </AppText>
                <View style={styles.meta}>
                  <View style={[styles.badge, { backgroundColor: tint(accent, 0.15) }]}>
                    <AppText variant="caption" color={accent} style={{ fontSize: 11 }}>
                      {item.difficulty.toUpperCase()}
                    </AppText>
                  </View>
                  <AppText variant="caption" muted>
                    +{reward} XP
                  </AppText>
                </View>
              </View>
              {isCounter && (
                <View style={styles.counter}>
                  <Pressable
                    accessibilityLabel="Bad habit"
                    onPress={() => onTap(-1)}
                    style={[styles.tapBtn, { backgroundColor: tint(colors.danger, 0.14) }]}>
                    <MaterialCommunityIcons name="minus-thick" size={20} color={colors.danger} />
                    {minus > 0 && <AppText variant="caption" color={colors.danger}>{minus}</AppText>}
                  </Pressable>
                  <Animated.View style={checkStyle}>
                    <Pressable
                      accessibilityLabel="Good habit"
                      onPress={complete}
                      style={[styles.tapBtn, { backgroundColor: tint(colors.success, 0.16) }]}>
                      <MaterialCommunityIcons name="plus-thick" size={20} color={colors.success} />
                      {plus > 0 && <AppText variant="caption" color={colors.success}>{plus}</AppText>}
                    </Pressable>
                  </Animated.View>
                </View>
              )}
              {burst && <XpBurst key={burst.key} amount={burst.amount} color={colors.xp} />}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  strike: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: radius.pill },
  counter: { flexDirection: 'row', gap: space.sm },
  tapBtn: { minWidth: 44, height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 8 },
  under: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    justifyContent: 'center',
    paddingLeft: space.xl,
  },
  tray: { position: 'absolute', top: 0, bottom: 4, right: 0, flexDirection: 'row', gap: space.sm },
  action: { width: 64, height: '100%', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', right: space.lg, top: 6 },
});
