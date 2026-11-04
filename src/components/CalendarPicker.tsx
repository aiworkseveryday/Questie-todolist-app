import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addMonths, formatMonth, fromISODate, startOfMonth, toISODate, todayISO } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Month calendar. Days outside min…max (YYYY-MM-DD) are disabled; by default only past days are. */
export function CalendarPicker({
  value,
  onChange,
  min = todayISO(),
  max,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
}) {
  const { colors } = useTheme();
  const today = todayISO();
  const [month, setMonth] = useState(() => startOfMonth(value ? fromISODate(value) : new Date()));

  const first = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // Leading blanks so the 1st lands under its weekday, then pad to whole weeks
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const canGoBack = month > startOfMonth(fromISODate(min));
  const canGoForward = !max || month < startOfMonth(fromISODate(max));

  const nav = (icon: 'chevron-left' | 'chevron-right', delta: number, enabled: boolean) => (
    <Pressable
      accessibilityLabel={delta < 0 ? 'Previous month' : 'Next month'}
      disabled={!enabled}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        setMonth((m) => addMonths(m, delta));
      }}
      style={[styles.nav, { backgroundColor: colors.surfaceAlt, opacity: enabled ? 1 : 0.35 }]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        {nav('chevron-left', -1, canGoBack)}
        <AppText variant="heading">{formatMonth(month)}</AppText>
        {nav('chevron-right', 1, canGoForward)}
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
            const past = iso < min || (!!max && iso > max);
            const selected = iso === value;
            const isToday = iso === today;
            return (
              <Pressable
                key={i}
                disabled={past}
                accessibilityLabel={iso}
                accessibilityState={{ selected, disabled: past }}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange(iso);
                }}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    selected && { backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.primary },
                    !selected && isToday && { borderWidth: 2, borderColor: colors.primary },
                  ]}>
                  <AppText
                    variant="label"
                    color={selected ? '#FFFFFF' : past ? colors.border : isToday ? colors.primary : colors.text}>
                    {day}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  day: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
