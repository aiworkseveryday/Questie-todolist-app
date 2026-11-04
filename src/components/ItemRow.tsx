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
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { Difficulty, Item } from '@/data/types';
import { REWARD, tapXp } from '@/game/engine';
import { formatDue } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { POP, POP_SCALE, SPRING } from '@/theme/motion';
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

type Props = {
  item: Item;
  done: boolean;
  /** Today's taps towards a multi-tap habit goal */
  count: number;
  /** Todo is past its due date/time */
  overdue: boolean;
  /** Today's good/bad taps, for counter habits */
  plus: number;
  minus: number;
  onToggle: () => void;
  onTap: (delta: 1 | -1) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Multi-select mode is on (started by a long press) */
  selecting?: boolean;
  selected?: boolean;
  /** Long press starts selecting; while selecting, a tap toggles this row */
  onSelect?: () => void;
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

/** Ring that fills as taps add up towards a daily goal, e.g. 3 of 8 glasses of water. */
function GoalRing({ count, goal, color, track }: { count: number; goal: number; color: string; track: string }) {
  const size = 36;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, count / goal);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {p >= 1 ? (
        <MaterialCommunityIcons name="check-bold" size={18} color={color} />
      ) : (
        <AppText variant="caption" style={{ fontSize: 11 }}>
          {count}/{goal}
        </AppText>
      )}
    </View>
  );
}

export function ItemRow({ item, done, count, overdue, plus, minus, onToggle, onTap, onEdit, onDelete, selecting = false, selected = false, onSelect }: Props) {
  const { colors } = useTheme();
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const armed = useSharedValue(false);
  const pop = useSharedValue(1);
  const [burst, setBurst] = useState<{ key: number; amount: number } | null>(null);
  const isCounter = item.kind === 'counter';
  const accent = DIFFICULTY_COLOR[item.difficulty];
  const reward = REWARD[item.difficulty].xp;
  const goal = item.kind === 'habit' ? Math.max(1, item.target) : 1;
  const multi = goal > 1;
  const step = tapXp(item.difficulty, goal);

  const complete = () => {
    let amount = reward;
    if (isCounter) {
      onTap(1);
    } else {
      onToggle();
      if (done) return;
      // A step towards the goal pays a little; the final tap pays the full reward too
      amount = count + 1 < goal ? step : reward + step;
    }
    pop.value = withSequence(withSpring(POP_SCALE, POP), withSpring(1, POP));
    setBurst({ key: Date.now(), amount });
  };
  const tick = () => Haptics.selectionAsync();
  const close = () => {
    x.value = withSpring(0, SPRING);
  };

  const pan = usePanGesture({
    // No swiping while picking quests to delete
    enabled: !selecting,
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
          <Pressable
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelect?.();
            }}
            delayLongPress={400}>
            <View
              style={[
                styles.row,
                {
                  backgroundColor: selected ? tint(colors.primary, 0.1) : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  opacity: done && !isCounter && !selecting ? 0.6 : 1,
                },
              ]}>
              {selecting && (
                <View
                  style={[
                    styles.selectDot,
                    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface },
                  ]}>
                  {selected && <MaterialCommunityIcons name="check-bold" size={16} color="#fff" />}
                </View>
              )}
              {multi && (
                <Pressable accessibilityLabel={`${count} of ${goal} done`} onPress={complete} hitSlop={10}>
                  <Animated.View style={checkStyle}>
                    <GoalRing count={count} goal={goal} color={colors.success} track={colors.border} />
                  </Animated.View>
                </Pressable>
              )}
              {!isCounter && !multi && (
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
                  {multi && (
                    <AppText variant="caption" muted>
                      · {count}/{goal} today
                    </AppText>
                  )}
                </View>
                {item.kind === 'todo' && item.due && !done && (
                  <View style={styles.meta}>
                    <MaterialCommunityIcons
                      name={item.due_time ? 'bell-ring-outline' : 'calendar'}
                      size={14}
                      color={overdue ? colors.danger : colors.textMuted}
                    />
                    <AppText variant="caption" color={overdue ? colors.danger : colors.textMuted}>
                      {overdue ? 'Overdue · ' : ''}
                      {formatDue(item.due, item.due_time)}
                    </AppText>
                  </View>
                )}
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
              {selecting && (
                <Pressable
                  accessibilityLabel={selected ? `Deselect ${item.title}` : `Select ${item.title}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelect?.();
                  }}
                  style={StyleSheet.absoluteFill}
                />
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
  selectDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
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
