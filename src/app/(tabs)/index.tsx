import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Pet } from '@/characters/Pet';
import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { Card } from '@/components/Card';
import { ItemRow } from '@/components/ItemRow';
import { ProgressRing } from '@/components/Progress';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import type { Item } from '@/data/types';
import { isDueOn, levelFor, petMood, streakStatus, type StreakState } from '@/game/engine';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const PET_LINES: Record<StreakState, (pet: string) => string> = {
  done: (pet) => `${pet} is happy! Today's streak is safe.`,
  pending: (pet) => `${pet} is waiting. Check off one quest to grow your streak!`,
  frozen: () => `You missed a day, but a streak freeze will save it. Check something off!`,
  broken: (pet) => `${pet} misses you. Start a new streak today!`,
};

function Section({ title, items, render }: { title: string; items: Item[]; render: (i: Item) => React.ReactNode }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" muted upper>
        {title}
      </AppText>
      {items.map((i) => (
        <Animated.View key={i.id} layout={LinearTransition.springify().damping(18)}>
          {render(i)}
        </Animated.View>
      ))}
    </View>
  );
}

export default function Today() {
  const { profile, items, today, toggle, tap, deleteItem } = useGame();
  const { colors } = useTheme();
  if (!profile) return null;

  const now = new Date();
  const status = streakStatus(profile, now);
  const lvl = levelFor(profile.xp);
  const due = items.filter((i) => isDueOn(i, now));
  const doneIds = new Set(today.filter((c) => c.delta > 0).map((c) => c.item_id));
  const isDone = (i: Item) => (i.kind === 'todo' ? i.done_on != null : doneIds.has(i.id));
  // Unfinished first, so what's left stays at the top
  const byDone = (a: Item, b: Item) => Number(isDone(a)) - Number(isDone(b));
  const habits = due.filter((i) => i.kind === 'habit').sort(byDone);
  const counters = due.filter((i) => i.kind === 'counter');
  const todos = due.filter((i) => i.kind === 'todo').sort(byDone);
  const checkable = [...habits, ...todos];
  const progress = checkable.length ? checkable.filter(isDone).length / checkable.length : 0;

  const confirmDelete = (i: Item) =>
    Alert.alert('Delete?', `"${i.title}" and its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteItem(i.id) },
    ]);

  const row = (i: Item) => (
    <ItemRow
      item={i}
      done={isDone(i)}
      plus={today.filter((c) => c.item_id === i.id && c.delta > 0).length}
      minus={today.filter((c) => c.item_id === i.id && c.delta < 0).length}
      onToggle={() => toggle(i)}
      onTap={(d) => tap(i, d)}
      onEdit={() => router.push({ pathname: '/item', params: { id: String(i.id) } })}
      onDelete={() => confirmDelete(i)}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label" color={status.streak ? colors.streak : colors.textMuted}>
              🔥 {status.streak}
            </AppText>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label">🧊 {profile.freeze_tokens}</AppText>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label" color="#C98A00">
              🪙 {profile.coins}
            </AppText>
          </View>
          <View style={{ flex: 1 }} />
          <ProgressRing progress={lvl.intoLevel / lvl.levelSize} size={46} stroke={6} color={colors.xp}>
            <AppText variant="caption">{lvl.level}</AppText>
          </ProgressRing>
        </View>

        <Card style={styles.petCard}>
          <Pet species={profile.pet} mood={petMood(status.state)} size={84} />
          <View style={{ flex: 1, gap: space.xs }}>
            <AppText variant="heading">
              {checkable.length && progress === 1 ? 'All done for today!' : `Hi ${profile.name}!`}
            </AppText>
            <AppText muted>{PET_LINES[status.state](profile.pet_name)}</AppText>
          </View>
        </Card>

        {due.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: space.sm }}>
            <AppText variant="heading" center>
              Your quest log is empty
            </AppText>
            <AppText muted center>
              Add a habit like &quot;Drink water&quot; or &quot;Read 10 pages&quot;, or a to-do. Swipe right to complete, swipe left
              to edit.
            </AppText>
          </Card>
        ) : (
          <>
            <Section title="Daily quests" items={habits} render={row} />
            <Section title="Good & bad habits" items={counters} render={row} />
            <Section title="To-dos" items={todos} render={row} />
          </>
        )}
      </Screen>
      <View style={styles.fab} pointerEvents="box-none">
        <Button3D title="Add" icon="plus-thick" onPress={() => router.push('/item')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stat: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 2 },
  petCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  fab: { position: 'absolute', right: space.lg, bottom: space.lg },
});
