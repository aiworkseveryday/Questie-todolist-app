import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { Chip, ChipRow } from '@/components/Chip';
import { DIFFICULTY_COLOR } from '@/components/ItemRow';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import type { Difficulty, ItemKind } from '@/data/types';
import { REWARD } from '@/game/engine';
import { addDays, toISODate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, tint } from '@/theme/tokens';

const KINDS: { id: ItemKind; label: string; hint: string }[] = [
  { id: 'habit', label: 'Habit', hint: 'Repeats on the days you choose. Keeps your streak alive.' },
  { id: 'counter', label: 'Good / Bad', hint: 'Tap + when you do the good thing, − when you slip. Any time, any day.' },
  { id: 'todo', label: 'To-do', hint: 'A one-off task. Disappears the day after you finish it.' },
];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const dueOptions = () => {
  const today = new Date();
  return [
    { label: 'No date', value: null },
    { label: 'Today', value: toISODate(today) },
    { label: 'Tomorrow', value: toISODate(addDays(today, 1)) },
    { label: 'Next week', value: toISODate(addDays(today, 7)) },
  ];
};

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
      due: kind === 'todo' ? due : null,
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

      {kind === 'todo' && (
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" muted upper>
            Due
          </AppText>
          <ChipRow>
            {dueOptions().map((o) => (
              <Chip key={o.label} label={o.label} selected={due === o.value} onPress={() => setDue(o.value)} />
            ))}
          </ChipRow>
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
});
