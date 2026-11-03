import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { CalendarPicker } from '@/components/CalendarPicker';
import { DIFFICULTY_COLOR } from '@/components/ItemRow';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import type { Difficulty, ItemKind } from '@/data/types';
import { REWARD } from '@/game/engine';
import { dueAt, formatClock } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, tint } from '@/theme/tokens';

const KINDS: { id: ItemKind; label: string; hint: string }[] = [
  { id: 'habit', label: 'Habit', hint: 'Repeats on the days you choose, once or several times a day. Keeps your streak alive.' },
  { id: 'counter', label: 'Good / Bad', hint: 'Tap + when you do the good thing, − when you slip. Any time, any day.' },
  { id: 'todo', label: 'To-do', hint: 'A one-off task. Disappears the day after you finish it.' },
];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const pad = (n: number) => String(n).padStart(2, '0');

/** Opens the system clock and returns "HH:MM", or null when cancelled. */
function pickTime(initial: string | null, onPick: (hhmm: string) => void) {
  const value = new Date();
  if (initial) {
    const [h, m] = initial.split(':').map(Number);
    value.setHours(h, m, 0, 0);
  } else {
    value.setHours(value.getHours() + 1, 0, 0, 0);
  }
  DateTimePickerAndroid.open({
    value,
    mode: 'time',
    is24Hour: false,
    onChange: (event, date) => {
      if (event.type === 'set' && date) onPick(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
    },
  });
}

export default function ItemEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { items, saveItem } = useGame();
  const { colors } = useTheme();
  const existing = id ? items.find((i) => i.id === Number(id)) : undefined;

  const [kind, setKind] = useState<ItemKind>(existing?.kind ?? 'habit');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? 'easy');
  const [days, setDays] = useState<number[]>(existing?.days.length ? existing.days : ALL_DAYS);
  const [due, setDue] = useState<string | null>(existing?.due ?? null);
  const [dueTime, setDueTime] = useState<string | null>(existing?.due_time ?? null);
  const [target, setTarget] = useState(existing?.target ?? 1);
  // iOS has no clock dialog, so its time picker renders inline
  const [showIosTime, setShowIosTime] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: number) => {
    Haptics.selectionAsync();
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  };

  const valid = title.trim().length > 0 && (kind !== 'habit' || days.length > 0);

  const save = async () => {
    setSaving(true);
    await saveItem({
      id: existing?.id,
      kind,
      title: title.trim(),
      difficulty,
      days: kind === 'habit' ? days : [],
      target: kind === 'habit' ? target : 1,
      due: kind === 'todo' ? due : null,
      due_time: kind === 'todo' && due ? dueTime : null,
    });
    router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button3D title={existing ? 'Save' : 'Add quest'} disabled={!valid} loading={saving} onPress={save} />}>
      <View style={styles.header}>
        <AppText variant="title">{existing ? 'Edit quest' : 'New quest'}</AppText>
        <Button3D title="Close" tone="ghost" small onPress={() => router.back()} />
      </View>

      <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
        {KINDS.map((k) => (
          <Pressable
            key={k.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === k.id }}
            onPress={() => {
              Haptics.selectionAsync();
              setKind(k.id);
            }}
            style={[styles.segmentItem, kind === k.id && { backgroundColor: colors.surface }]}>
            <AppText variant="caption" color={kind === k.id ? colors.text : colors.textMuted}>
              {k.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <AppText muted>{KINDS.find((k) => k.id === kind)?.hint}</AppText>

      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder={kind === 'counter' ? 'Drink water / Doomscrolling' : kind === 'todo' ? 'Book dentist' : 'Read 10 pages'}
        autoFocus={!existing}
        maxLength={60}
      />

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" muted upper>
          Difficulty
        </AppText>
        <View style={styles.row}>
          {DIFFICULTIES.map((d) => {
            const selected = difficulty === d;
            const c = DIFFICULTY_COLOR[d];
            return (
              <Pressable
                key={d}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDifficulty(d);
                }}
                style={[
                  styles.diff,
                  { borderColor: selected ? c : colors.border, backgroundColor: selected ? tint(c, 0.14) : colors.surface },
                ]}>
                <AppText variant="label" color={selected ? c : colors.text}>
                  {d[0].toUpperCase() + d.slice(1)}
                </AppText>
                <AppText variant="caption" muted>
                  +{REWARD[d].xp} XP · 🪙{REWARD[d].coins}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {kind === 'habit' && (
        <View style={{ gap: space.sm }}>
          <View style={styles.header}>
            <AppText variant="caption" muted upper>
              Repeat on
            </AppText>
            <Button3D
              title={days.length === 7 ? 'Weekdays' : 'Every day'}
              tone="ghost"
              small
              onPress={() => setDays(days.length === 7 ? [1, 2, 3, 4, 5] : ALL_DAYS)}
            />
          </View>
          <View style={styles.row}>
            {WEEKDAYS.map((label, d) => {
              const on = days.includes(d);
              return (
                <Pressable
                  key={d}
                  accessibilityLabel={`Day ${d}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => toggleDay(d)}
                  style={[styles.day, { backgroundColor: on ? colors.primary : colors.surfaceAlt }]}>
                  <AppText variant="label" color={on ? '#fff' : colors.textMuted}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {kind === 'habit' && (
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" muted upper>
            Times per day
          </AppText>
          <View style={[styles.stepper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable
              accessibilityLabel="Fewer times"
              disabled={target <= 1}
              onPress={() => {
                Haptics.selectionAsync();
                setTarget((t) => Math.max(1, t - 1));
              }}
              style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt, opacity: target <= 1 ? 0.4 : 1 }]}>
              <MaterialCommunityIcons name="minus" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="title">{target}×</AppText>
              <AppText variant="caption" muted>
                {target === 1 ? 'Once a day' : `${target} taps a day`}
              </AppText>
            </View>
            <Pressable
              accessibilityLabel="More times"
              disabled={target >= 20}
              onPress={() => {
                Haptics.selectionAsync();
                setTarget((t) => Math.min(20, t + 1));
              }}
              style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt }]}>
              <MaterialCommunityIcons name="plus" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
      )}

      {kind === 'todo' && (
        <View style={{ gap: space.sm }}>
          <View style={styles.header}>
            <AppText variant="caption" muted upper>
              Due date
            </AppText>
            {due && (
              <Button3D
                title="No date"
                tone="ghost"
                small
                onPress={() => {
                  setDue(null);
                  setDueTime(null);
                }}
              />
            )}
          </View>
          <CalendarPicker value={due} onChange={setDue} />
          {due && (
            <View style={styles.timeRow}>
              <Pressable
                accessibilityLabel="Set reminder time"
                onPress={() => (Platform.OS === 'android' ? pickTime(dueTime, setDueTime) : setShowIosTime((s) => !s))}
                style={[styles.timeBtn, { borderColor: dueTime ? colors.primary : colors.border, backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={20} color={dueTime ? colors.primary : colors.textMuted} />
                <AppText variant="label" color={dueTime ? colors.primary : colors.textMuted}>
                  {dueTime ? `Remind me at ${formatClock(dueTime)}` : 'Add time & reminder'}
                </AppText>
              </Pressable>
              {dueTime && (
                <Pressable accessibilityLabel="Remove time" hitSlop={8} onPress={() => setDueTime(null)}>
                  <MaterialCommunityIcons name="close-circle" size={24} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          )}
          {due && Platform.OS === 'ios' && showIosTime && (
            <DateTimePicker
              mode="time"
              display="spinner"
              value={dueTime ? dueAt(due, dueTime) : new Date()}
              onChange={(_, d) => d && setDueTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  row: { flexDirection: 'row', gap: space.sm },
  diff: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 2, borderBottomWidth: 4 },
  day: { flex: 1, aspectRatio: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 2 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  timeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 2 },
});
