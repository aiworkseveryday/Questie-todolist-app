import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { loadDayEntries, loadDayTotals, loadTopItems, type DayEntry, type DayTotals } from '@/data/db';
import { useGame } from '@/data/store';
import { addDays, addMonths, formatDay, formatMonth, fromISODate, startOfMonth, toISODate, todayISO } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space, tint } from '@/theme/tokens';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
type Period = 'week' | 'month';

/** Heat level 0-4 from quests completed that day. */
function heat(done: number) {
  if (done <= 0) return 0;
  if (done <= 2) return 1;
  if (done <= 4) return 2;
  if (done <= 7) return 3;
  return 4;
}

function Heatmap({
  month,
  totals,
  selected,
  onSelect,
  onMonth,
}: {
  month: Date;
  totals: Map<string, DayTotals>;
  selected: string;
  onSelect: (iso: string) => void;
  onMonth: (delta: number) => void;
}) {
  const { colors } = useTheme();
  const today = todayISO();
  const shades = [colors.surfaceAlt, tint(palette.mint, 0.3), tint(palette.mint, 0.55), tint(palette.mint, 0.8), palette.mint];
  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const isCurrent = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

  const nav = (icon: 'chevron-left' | 'chevron-right', delta: number, enabled: boolean) => (
    <Pressable
      accessibilityLabel={delta < 0 ? 'Previous month' : 'Next month'}
      disabled={!enabled}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        onMonth(delta);
      }}
      style={[styles.nav, { backgroundColor: colors.surfaceAlt, opacity: enabled ? 1 : 0.35 }]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <Card style={{ gap: space.xs }}>
      <View style={styles.header}>
        {nav('chevron-left', -1, true)}
        <AppText variant="heading">{formatMonth(month)}</AppText>
        {nav('chevron-right', 1, !isCurrent)}
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <AppText key={i} variant="caption" muted center style={styles.cell}>
            {d}
          </AppText>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.week}>
          {cells.slice(row * 7, row * 7 + 7).map((day, i) => {
            if (day == null) return <View key={i} style={styles.cell} />;
            const iso = toISODate(new Date(month.getFullYear(), month.getMonth(), day));
            const future = iso > today;
            const level = heat(totals.get(iso)?.done ?? 0);
            const isSel = iso === selected;
            return (
              <Pressable
                key={i}
                disabled={future}
                accessibilityLabel={`${iso}, ${totals.get(iso)?.done ?? 0} quests`}
                accessibilityState={{ selected: isSel }}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(iso);
                }}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    { backgroundColor: future ? 'transparent' : shades[level] },
                    isSel && { borderWidth: 2.5, borderColor: colors.primary },
                    !isSel && iso === today && { borderWidth: 2, borderColor: colors.textMuted },
                  ]}>
                  <AppText variant="caption" color={future ? colors.border : level >= 3 ? '#FFFFFF' : colors.text}>
                    {day}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <AppText variant="caption" muted>
          Less
        </AppText>
        {shades.map((c) => (
          <View key={c} style={[styles.legendBox, { backgroundColor: c }]} />
        ))}
        <AppText variant="caption" muted>
          More
        </AppText>
      </View>
    </Card>
  );
}

function DayDetail({ date, entries }: { date: string; entries: DayEntry[] }) {
  const { colors } = useTheme();
  const good = entries.filter((e) => e.delta > 0);
  // Group repeated taps (e.g. 8 glasses of water) into one line
  const grouped = useMemo(() => {
    const m = new Map<string, { title: string; good: number; bad: number; xp: number; coins: number }>();
    for (const e of entries) {
      const g = m.get(e.title) ?? { title: e.title, good: 0, bad: 0, xp: 0, coins: 0 };
      if (e.delta > 0) g.good++;
      else g.bad++;
      g.xp += e.xp;
      g.coins += e.coins;
      m.set(e.title, g);
    }
    return [...m.values()];
  }, [entries]);

  return (
    <Card style={{ gap: space.sm }}>
      <View style={styles.header}>
        <AppText variant="heading">{formatDay(fromISODate(date))}</AppText>
        <AppText variant="caption" color={colors.primary}>
          {good.length} done · +{entries.reduce((s, e) => s + e.xp, 0)} XP
        </AppText>
      </View>
      {grouped.length === 0 ? (
        <AppText muted>Nothing logged this day.</AppText>
      ) : (
        grouped.map((g) => (
          <View key={g.title} style={[styles.entry, { borderColor: colors.border }]}>
            <MaterialCommunityIcons
              name={g.good > 0 ? 'check-circle' : 'minus-circle'}
              size={22}
              color={g.good > 0 ? colors.success : colors.danger}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="label" numberOfLines={1}>
                {g.title}
              </AppText>
              <AppText variant="caption" muted>
                {[g.good > 1 && `${g.good}×`, g.bad > 0 && `${g.bad} slip${g.bad > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'Completed'}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color={g.xp >= 0 ? colors.text : colors.danger}>
                {g.xp >= 0 ? '+' : ''}
                {g.xp} XP
              </AppText>
              {g.coins > 0 && (
                <AppText variant="caption" color="#C98A00">
                  🪙 +{g.coins}
                </AppText>
              )}
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

function Stat({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <Card style={styles.stat}>
      <AppText style={{ fontSize: 20, lineHeight: 26 }}>{emoji}</AppText>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" muted center>
        {label}
      </AppText>
    </Card>
  );
}

function Stats({ period, onPeriod }: { period: Period; onPeriod: (p: Period) => void }) {
  const sql = useSQLiteContext();
  const { colors } = useTheme();
  const [rows, setRows] = useState<DayTotals[]>([]);
  const [top, setTop] = useState<{ title: string; count: number }[]>([]);

  const range = useMemo(() => {
    const end = new Date();
    const start = period === 'week' ? addDays(end, -6) : addDays(end, -29);
    return { start, from: toISODate(start), to: toISODate(end), days: period === 'week' ? 7 : 30 };
  }, [period]);

  useEffect(() => {
    loadDayTotals(sql, range.from, range.to).then(setRows);
    loadTopItems(sql, range.from, range.to).then(setTop);
  }, [sql, range]);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const series = Array.from({ length: range.days }, (_, i) => {
    const d = addDays(range.start, i);
    return { date: d, done: byDate.get(toISODate(d))?.done ?? 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.done));
  const sum = (k: keyof Omit<DayTotals, 'date'>) => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const best = rows.reduce<DayTotals | null>((b, r) => (!b || r.done > b.done ? r : b), null);

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.header}>
        <AppText variant="heading">Stats</AppText>
        <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
          {(['week', 'month'] as Period[]).map((p) => (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === p }}
              onPress={() => {
                Haptics.selectionAsync();
                onPeriod(p);
              }}
              style={[styles.segmentItem, period === p && { backgroundColor: colors.surface }]}>
              <AppText variant="caption" color={period === p ? colors.text : colors.textMuted}>
                {p === 'week' ? '7 days' : '30 days'}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        <Stat emoji="✅" label="Quests done" value={sum('done')} />
        <Stat emoji="⭐" label="XP earned" value={sum('xp')} />
        <Stat emoji="🪙" label="Coins earned" value={sum('coins')} />
      </View>
      <View style={styles.grid}>
        <Stat emoji="📅" label="Active days" value={`${rows.filter((r) => r.done > 0).length}/${range.days}`} />
        <Stat emoji="🏆" label="Best day" value={best && best.done > 0 ? best.done : '—'} />
        <Stat emoji="⚠️" label="Slips" value={sum('bad')} />
      </View>

      <View style={[styles.chart, { gap: period === 'week' ? space.sm : 2 }]}>
        {series.map((s) => (
          <View key={s.date.toISOString()} style={styles.barCol}>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
              <View style={{ height: `${(s.done / max) * 100}%`, backgroundColor: palette.mint, borderRadius: 6 }} />
            </View>
            {period === 'week' && (
              <AppText variant="caption" muted>
                {WEEKDAYS[s.date.getDay()]}
              </AppText>
            )}
          </View>
        ))}
      </View>

      {top.length > 0 && (
        <View style={{ gap: space.xs }}>
          <AppText variant="caption" muted upper>
            Top quests
          </AppText>
          {top.map((t, i) => (
            <View key={t.title} style={styles.topRow}>
              <AppText variant="label" style={{ width: 24 }}>
                {['🥇', '🥈', '🥉'][i]}
              </AppText>
              <AppText style={{ flex: 1 }} numberOfLines={1}>
                {t.title}
              </AppText>
              <AppText variant="caption" muted>
                {t.count}×
              </AppText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function History() {
  const sql = useSQLiteContext();
  const { today } = useGame();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayISO);
  const [period, setPeriod] = useState<Period>('week');
  const [totals, setTotals] = useState<Map<string, DayTotals>>(new Map());
  const [entries, setEntries] = useState<DayEntry[]>([]);

  useEffect(() => {
    const from = toISODate(month);
    const to = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    loadDayTotals(sql, from, to).then((rows) => setTotals(new Map(rows.map((r) => [r.date, r]))));
  }, [sql, month, today.length]);

  useEffect(() => {
    loadDayEntries(sql, selected).then(setEntries);
  }, [sql, selected, today.length]);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AppText variant="title">History</AppText>
        <Button3D title="Close" tone="ghost" small onPress={() => router.back()} />
      </View>
      <Heatmap month={month} totals={totals} selected={selected} onSelect={setSelected} onMonth={(d) => setMonth((m) => addMonths(m, d))} />
      <DayDetail date={selected} entries={entries} />
      <Stats period={period} onPeriod={setPeriod} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  day: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: space.xs },
  legendBox: { width: 14, height: 14, borderRadius: 4 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: 'center', padding: space.sm, gap: 0 },
  grid: { flexDirection: 'row', gap: space.sm },
  chart: { flexDirection: 'row', height: 110 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
