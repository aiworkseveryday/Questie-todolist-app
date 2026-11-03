import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Hero } from '@/characters/Hero';
import { Pet } from '@/characters/Pet';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/Progress';
import { Screen } from '@/components/Screen';
import { loadDailyTotals } from '@/data/db';
import { useGame } from '@/data/store';
import { levelFor, petMood, streakStatus } from '@/game/engine';
import { addDays, toISODate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space, tint } from '@/theme/tokens';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Checked-off count for each of the last 7 days, oldest first. */
function useWeek(refreshKey: number) {
  const sql = useSQLiteContext();
  const [week, setWeek] = useState<{ date: Date; done: number }[]>([]);
  useEffect(() => {
    const start = addDays(new Date(), -6);
    loadDailyTotals(sql, toISODate(start)).then((rows) => {
      const byDate = new Map(rows.map((r) => [r.date, r.done]));
      setWeek(Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        return { date, done: byDate.get(toISODate(date)) ?? 0 };
      }));
    });
  }, [sql, refreshKey]);
  return week;
}

function Stat({ emoji, value, label }: { emoji: string; value: number | string; label: string }) {
  return (
    <Card style={styles.stat}>
      <AppText style={{ fontSize: 24, lineHeight: 30 }}>{emoji}</AppText>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </Card>
  );
}

function Locked({ title, body, unlock }: { title: string; body: string; unlock: string }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.locked}>
      <View style={[styles.lockIcon, { backgroundColor: colors.surfaceAlt }]}>
        <MaterialCommunityIcons name="lock" size={20} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" muted>
          {body}
        </AppText>
      </View>
      <AppText variant="caption" color={colors.primary}>
        {unlock}
      </AppText>
    </Card>
  );
}

export default function HeroScreen() {
  const { profile, today } = useGame();
  const { colors } = useTheme();
  const week = useWeek(today.length);
  if (!profile) return null;

  const lvl = levelFor(profile.xp);
  const status = streakStatus(profile);
  const max = Math.max(1, ...week.map((d) => d.done));

  return (
    <Screen>
      <Card fill={tint(colors.primary, 0.12)} edge={tint(colors.primary, 0.3)} style={styles.stage}>
        <View style={styles.pair}>
          <Hero gender={profile.gender} look={profile.look} size={130} />
          <Pet species={profile.pet} mood={petMood(status.state)} size={80} />
        </View>
        <AppText variant="title">{profile.name}</AppText>
        <AppText variant="caption" muted upper>
          Level {lvl.level} adventurer · with {profile.pet_name}
        </AppText>
        <View style={{ alignSelf: 'stretch', gap: space.xs }}>
          <ProgressBar progress={lvl.intoLevel / lvl.levelSize} color={colors.xp} />
          <AppText variant="caption" muted center>
            {lvl.intoLevel} / {lvl.levelSize} XP to level {lvl.level + 1}
          </AppText>
        </View>
      </Card>

      <View style={styles.grid}>
        <Stat emoji="🔥" value={status.streak} label="Streak" />
        <Stat emoji="🏆" value={profile.best_streak} label="Best" />
        <Stat emoji="🧊" value={profile.freeze_tokens} label="Freezes" />
        <Stat emoji="🪙" value={profile.coins} label="Coins" />
      </View>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">This week</AppText>
        <View style={styles.chart}>
          {week.map((d) => {
            const isToday = toISODate(d.date) === toISODate(new Date());
            return (
              <View key={d.date.toISOString()} style={styles.barCol}>
                <AppText variant="caption" muted>
                  {d.done || ''}
                </AppText>
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={{
                      height: `${(d.done / max) * 100}%`,
                      backgroundColor: isToday ? colors.primary : palette.mint,
                      borderRadius: 8,
                    }}
                  />
                </View>
                <AppText variant="caption" color={isToday ? colors.primary : colors.textMuted}>
                  {WEEKDAY[d.date.getDay()]}
                </AppText>
              </View>
            );
          })}
        </View>
      </Card>

      <AppText variant="caption" muted upper>
        Coming up
      </AppText>
      <Locked title="Choose a class" body="Warrior, Mage or Rogue with habit bonuses" unlock="Lv 10" />
      <Locked title="Gear shop" body="Spend coins on outfits and pet accessories" unlock="Soon" />
      <Locked title={`${profile.pet_name} evolves`} body="New forms at 7, 30 and 100 day streaks" unlock="7 🔥" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', gap: space.xs },
  pair: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  grid: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, alignItems: 'center', padding: space.md, gap: 0 },
  chart: { flexDirection: 'row', gap: space.sm, height: 140 },
  barCol: { flex: 1, alignItems: 'center', gap: space.xs },
  barTrack: { flex: 1, width: '100%', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  locked: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  lockIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
