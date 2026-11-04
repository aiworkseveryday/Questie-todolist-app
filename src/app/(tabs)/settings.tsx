import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { Card } from '@/components/Card';
import { HeroPicker, PetPicker } from '@/components/CharacterPickers';
import { Chip, ChipRow } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import { exportHistoryCsv } from '@/lib/csv';
import { addDays, formatDay, fromISODate, toISODate, todayISO } from '@/lib/dates';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function Settings() {
  const { profile, updateProfile, resetAll, deleteHistoryBefore } = useGame();
  const sql = useSQLiteContext();
  const { preference, setPreference } = useTheme();
  const [name, setName] = useState(profile?.name ?? '');
  const [petName, setPetName] = useState(profile?.pet_name ?? '');
  const [exporting, setExporting] = useState(false);
  // Export range: the last 30 days by default
  const [from, setFrom] = useState(() => toISODate(addDays(new Date(), -30)));
  const [to, setTo] = useState(todayISO);
  // Default cut-off: keep the last 30 days
  const [cutoff, setCutoff] = useState(() => toISODate(addDays(new Date(), -30)));
  if (!profile) return null;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const n = await exportHistoryCsv(sql, from, to);
      if (n === 0) Alert.alert('Nothing to export', `No quests were completed between ${formatDay(fromISODate(from))} and ${formatDay(fromISODate(to))}.`);
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExporting(false);
    }
  };

  const confirmCleanup = () =>
    Alert.alert(
      'Delete old history?',
      `Everything logged before ${formatDay(fromISODate(cutoff))} will be removed from history and stats. Your XP, coins, level and streak stay.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const n = await deleteHistoryBefore(cutoff);
            Alert.alert('Done', n ? `Removed ${n} entr${n === 1 ? 'y' : 'ies'}.` : 'There was no history before that date.');
          },
        },
      ],
    );

  const confirmReset = () =>
    Alert.alert('Start over?', 'This deletes your hero, pet, quests and all progress on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: resetAll },
    ]);

  return (
    <Screen>
      <AppText variant="title">Settings</AppText>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Names</AppText>
        <Input
          label="Your name"
          value={name}
          onChangeText={setName}
          onBlur={() => name.trim() && updateProfile({ name: name.trim() })}
          maxLength={24}
        />
        <Input
          label="Pet name"
          value={petName}
          onChangeText={setPetName}
          onBlur={() => petName.trim() && updateProfile({ pet_name: petName.trim() })}
          maxLength={16}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Hero</AppText>
        <HeroPicker gender={profile.gender} look={profile.look} onChange={(v) => updateProfile(v)} />
      </Card>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Companion</AppText>
        <PetPicker pet={profile.pet} onChange={(pet) => updateProfile({ pet })} />
      </Card>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Appearance</AppText>
        <ChipRow>
          {THEMES.map((t) => (
            <Chip key={t.id} label={t.label} selected={preference === t.id} onPress={() => setPreference(t.id)} />
          ))}
        </ChipRow>
      </Card>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">History</AppText>
        <AppText muted>Save what you completed between two dates as a spreadsheet file (CSV).</AppText>
        <DateField
          label="From"
          value={from}
          onChange={(d) => {
            setFrom(d);
            if (d > to) setTo(d);
          }}
          min="2000-01-01"
          max={todayISO()}
        />
        <DateField label="To" value={to} onChange={setTo} min={from} max={todayISO()} />
        <Button3D title="Export history (CSV)" icon="file-delimited" tone="outline" loading={exporting} onPress={exportCsv} />
        <View style={{ height: 1, backgroundColor: '#00000010' }} />
        <DateField label="Delete history older than" value={cutoff} onChange={setCutoff} min="2000-01-01" max={todayISO()} />
        <Button3D title="Delete older history" icon="delete-clock" tone="danger" onPress={confirmCleanup} />
      </Card>

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" muted center>
          Everything is stored on this phone. Cloud backup is coming later.
        </AppText>
        <Button3D title="Reset all progress" tone="danger" onPress={confirmReset} />
      </View>
    </Screen>
  );
}
