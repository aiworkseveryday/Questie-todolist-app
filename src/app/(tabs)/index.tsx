import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';

import { Pet } from '@/characters/Pet';
import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { Card } from '@/components/Card';
import { FeedSheet } from '@/components/FeedSheet';
import { Feeding } from '@/components/Feeding';
import { ItemRow } from '@/components/ItemRow';
import { ProgressRing } from '@/components/Progress';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import type { Item } from '@/data/types';
import { greeting, isDueOn, levelFor, petMood, petStage, streakStatus, type StreakState } from '@/game/engine';
import { dueAt, toISODate } from '@/lib/dates';
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
  const [feedOpen, setFeedOpen] = useState(false);
  // Food currently being eaten; key replays the animation for back-to-back feeds
  const [eating, setEating] = useState<{ key: number; food: string } | null>(null);
  if (!profile) return null;

  const now = new Date();
  const status = streakStatus(profile, now);
  const fedToday = profile.fed_on === toISODate(now);
  const lvl = levelFor(profile.xp);
  const due = items.filter((i) => isDueOn(i, now));
  const taps = (i: Item) => today.filter((c) => c.item_id === i.id && c.delta > 0).length;
  const isDone = (i: Item) => (i.kind === 'todo' ? i.done_on != null : taps(i) >= Math.max(1, i.target));
  const isOverdue = (i: Item) => i.kind === 'todo' && !i.done_on && !!i.due && dueAt(i.due, i.due_time) < now;
  // Unfinished first, so what's left stays at the top
  const byDone = (a: Item, b: Item) => Number(isDone(a)) - Number(isDone(b));
  // Todos: unfinished first, then soonest due; undated ones after dated ones
  const dueKey = (i: Item) => (i.due ? `${i.due} ${i.due_time ?? '99'}` : '~');
  const habits = due.filter((i) => i.kind === 'habit').sort(byDone);
  const counters = due.filter((i) => i.kind === 'counter');
  const todos = due
    .filter((i) => i.kind === 'todo')
    .sort((a, b) => byDone(a, b) || dueKey(a).localeCompare(dueKey(b)));
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
      count={taps(i)}
      overdue={isOverdue(i)}
      plus={taps(i)}
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

        <Card style={{ gap: space.md }}>
          <View style={styles.petCard}>
            <View>
              <Pet
                species={profile.pet}
                mood={eating ? 'celebrate' : petMood(status.state, fedToday)}
                stage={petStage(lvl.level)}
                accessory={profile.pet_accessory}
                size={84}
              />
              {eating && <Feeding key={eating.key} foodId={eating.food} />}
            </View>
            {/* The pet's speech bubble pops in each time the app opens */}
            <Animated.View
              entering={ZoomIn.springify().damping(12).delay(250)}
              style={[styles.bubble, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.bubbleTail, { borderRightColor: colors.primarySoft }]} />
              <AppText variant="heading">
                {eating
                  ? 'Yum yum! 😋'
                  : checkable.length && progress === 1
                    ? `All done, ${profile.name}!`
                    : `${greeting(now)}, ${profile.name}!`}
              </AppText>
              <AppText muted>
                {eating
                  ? `${profile.pet_name} loves you! Happy all day.`
                  : fedToday && status.state !== 'done'
                    ? `${profile.pet_name} is full and happy. Check off a quest to grow your streak!`
                    : PET_LINES[status.state](profile.pet_name)}
              </AppText>
            </Animated.View>
          </View>
          <Button3D title={`Feed ${profile.pet_name}`} icon="food-apple" tone="outline" small onPress={() => setFeedOpen(true)} />
        </Card>
        <FeedSheet
          visible={feedOpen}
          onClose={() => setFeedOpen(false)}
          onFed={(food) => {
            setFeedOpen(false);
            const key = Date.now();
            setEating({ key, food });
            setTimeout(() => setEating((e) => (e?.key === key ? null : e)), 2600);
          }}
        />

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
  bubble: { flex: 1, gap: space.xs, padding: space.md, borderRadius: radius.md },
  bubbleTail: {
    position: 'absolute',
    left: -9,
    top: 22,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  fab: { position: 'absolute', right: space.lg, bottom: space.lg },
});
