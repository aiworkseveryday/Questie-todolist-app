import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { formatDay, fromISODate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { CalendarPicker } from './CalendarPicker';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Wed, 12 Nov 2026" */
function longDate(iso: string) {
  const d = fromISODate(iso);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${day}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * A date input: shows the chosen date with a calendar icon at the right end.
 * Tapping it opens a month calendar right below; picking a day closes it.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  min,
  max,
}: {
  label?: string;
  value: string | null;
  onChange: (iso: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const relative = value ? formatDay(fromISODate(value)) : null;

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <AppText variant="caption" muted upper>
          {label}
        </AppText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label ?? 'Date'}: ${longDate(value)}` : placeholder}
        onPress={() => {
          Haptics.selectionAsync();
          setOpen((o) => !o);
        }}
        style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: open ? colors.info : colors.border }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={value ? colors.text : colors.textMuted}>
            {value ? longDate(value) : placeholder}
          </AppText>
          {relative && !/\d/.test(relative) && (
            <AppText variant="caption" muted>
              {relative}
            </AppText>
          )}
        </View>
        <MaterialCommunityIcons name="calendar-month" size={24} color={open ? colors.info : colors.textMuted} />
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <CalendarPicker
            value={value}
            min={min}
            max={max}
            onChange={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 54,
  },
});
