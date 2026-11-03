import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { Card } from '@/components/Card';
import { Hero } from '@/characters/Hero';
import { HeroCustomizer, PetPicker } from '@/components/CharacterPickers';
import { Chip, ChipRow } from '@/components/Chip';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function Settings() {
  const { profile, updateProfile, resetAll, pickStyle } = useGame();
  const [styleError, setStyleError] = useState<string | null>(null);
  const { preference, setPreference } = useTheme();
  const [name, setName] = useState(profile?.name ?? '');
  const [petName, setPetName] = useState(profile?.pet_name ?? '');
  if (!profile) return null;

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="heading">Hero</AppText>
          <AppText variant="label" color="#C98A00">
            🪙 {profile.coins}
          </AppText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Hero style={profile} size={80} />
        </View>
        <HeroCustomizer
          value={profile}
          owned={profile.owned}
          onGender={(gender) => updateProfile({ gender })}
          onSkin={(skin) => updateProfile({ skin })}
          onPick={async (kind, o) => setStyleError(await pickStyle(kind, o))}
        />
        {styleError && (
          <AppText variant="caption" color="#E23E53" center>
            {styleError}
          </AppText>
        )}
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

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" muted center>
          Everything is stored on this phone. Cloud backup is coming later.
        </AppText>
        <Button3D title="Reset all progress" tone="danger" onPress={confirmReset} />
      </View>
    </Screen>
  );
}
