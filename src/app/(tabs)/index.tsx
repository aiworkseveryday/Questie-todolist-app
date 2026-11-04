import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { PetHome } from '@/characters/PetHome';
import { AppText } from '@/components/AppText';
import { BuddyProvider, useBuddy } from '@/components/Buddy';
import { Button3D } from '@/components/Button3D';
import { Card } from '@/components/Card';
import { FeedSheet } from '@/components/FeedSheet';
import { ItemRow } from '@/components/ItemRow';
import { ProgressRing } from '@/components/Progress';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import type { Item } from '@/data/types';
import { greeting, isDueOn, levelFor, petMood, shownPetStage, streakStatus, type StreakState } from '@/game/engine';
import { dueAt, toISODate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { SLIDE_MS, SPRING } from '@/theme/motion';
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
        <Animated.View key={i.id} layout={LinearTransition.springify().damping(SPRING.damping).stiffness(SPRING.stiffness)}>
          {render(i)}
        </Animated.View>
      ))}
    </View>
  );
}

/** The pet lives on this screen: its home is in the top card and it roams over everything here. */
export default function Today() {
  const { profile } = useGame();
  if (!profile) return null;
  const status = streakStatus(profile);
  const fedToday = profile.fed_on === toISODate(new Date());
  return (
    <BuddyProvider
      species={profile.pet}
      stage={shownPetStage(profile)}
      accessory={profile.pet_accessory}
      mood={petMood(status.state, fedToday)}
      hero={{ gender: profile.gender, look: profile.look }}>
      <TodayContent />
    </BuddyProvider>
  );
}

function TodayContent() {
  const { profile, items, today, toggle, tap, deleteItem, deleteItems } = useGame();
  const { colors } = useTheme();
  const buddy = useBuddy();
  const [feedOpen, setFeedOpen] = useState(false);
  // Quests picked for deleting; null when not in selection mode
  const [selected, setSelected] = useState<Set<number> | null>(null);
  if (!profile) return null;

  const toggleSelect = (id: number) =>
    setSelected((cur) => {
      const next = new Set(cur ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next.size ? next : null;
    });

  const confirmDeleteSelected = () => {
    if (!selected?.size) return;
    const n = selected.size;
    Alert.alert(`Delete ${n} quest${n > 1 ? 's' : ''}?`, 'They and all their history will be removed. XP and coins you already earned stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteItems([...selected]);
          setSelected(null);
        },
      },
    ]);
  };

  const now = new Date();
  const status = streakStatus(profile, now);
  const fedToday = profile.fed_on === toISODate(now);
  const lvl = levelFor(profile.xp);
  const eating = !!buddy?.eating;
  const due = items.filter((i) => isDueOn(i, now));
  const taps = (i: Item) => today.filter((c) => c.item_id === i.id && c.delta > 0).length;
  const isDone = (i: Item) => (i.kind === 'todo' ? i.done_on != null : taps(i) >= Math.max(1, i.target));
  const isOverdue = (i: Item) => i.kind === 'todo' && !i.done_on && !!i.due && dueAt(i.due, i.due_time) < now;
  // Unfinished first, so what's left stays at the top
  const byDone = (a: Item, b: Item) => Number(isDone(a)) - Number(isDone(b));
  // Todos: unfinished first, then soonest due; undated ones after dated ones
  const dueKey = (i: Item) => (i.due ? `${i.due} ${i.due_time ?? '99'}` : '~');
  const habits = due.filter((i) => i.kind === 'habit').sort(byDone);
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
      selecting={!!selected}
      selected={!!selected?.has(i.id)}
      onSelect={() => toggleSelect(i.id)}
    />
  );

  return (
    <>
      <Screen>
        {selected ? (
          <View style={[styles.selectBar, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Button3D title="Cancel" tone="ghost" small onPress={() => setSelected(null)} />
            <AppText variant="heading" style={{ flex: 1 }} center>
              {selected.size} selected
            </AppText>
            <Button3D title="Delete" icon="trash-can" tone="danger" small onPress={confirmDeleteSelected} />
          </View>
        ) : (
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
        )}

        <Card style={{ gap: space.md }}>
          <View style={styles.petCard}>
            {/* The pet's home: it walks out of here when the app opens, and the doorway stays empty while it roams */}
            <Pressable
              accessibilityLabel={`${profile.pet_name}'s home`}
              onPress={() => buddy?.callOut()}
              ref={buddy?.homeRef}
              collapsable={false}>
              <PetHome species={profile.pet} name={profile.pet_name} size={104} sleeping={!!buddy?.sleeping && !buddy?.out} />
            </Pressable>
            {/* The pet's speech bubble pops in each time the app opens */}
            <Animated.View
              entering={FadeIn.duration(SLIDE_MS).delay(200)}
              style={[styles.bubble, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.bubbleTail, { borderRightColor: colors.primarySoft }]} />
              <AppText variant="heading">
                {eating
                  ? 'Nom nom nom… 😋'
                  : checkable.length && progress === 1
                    ? `All done, ${profile.name}!`
                    : `${greeting(now)}, ${profile.name}!`}
              </AppText>
              <AppText muted>
                {eating
                  ? `${profile.pet_name} is munching happily.`
                  : buddy?.sleeping && !buddy?.out
                    ? `${profile.pet_name} is fast asleep in their home. Tap the home to wake them.`
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
            buddy?.feed(food);
          }}
        />

        {due.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: space.sm }}>
            <AppText variant="heading" center>
              Your quest log is empty
            </AppText>
            <AppText muted center>
              Add a habit like &quot;Drink water&quot; or &quot;Read 10 pages&quot;, or a to-do. Swipe right to complete, swipe left to edit, and long-press to select several to delete.

            </AppText>
          </Card>
        ) : (
          <>
            <Section title="Daily quests" items={habits} render={row} />
            <Section title="To-dos" items={todos} render={row} />
          </>
        )}
      </Screen>
      <View style={styles.fab} pointerEvents="box-none">
        <Button3D title="Add" icon="plus-thick" onPress={() => router.push('/item')} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  selectBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.xs, borderRadius: radius.lg, borderWidth: 2 },
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
