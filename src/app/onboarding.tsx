import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Hero } from '@/characters/Hero';
import { Pet } from '@/characters/Pet';
import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { HeroCustomizer, PetPicker } from '@/components/CharacterPickers';
import { Input } from '@/components/Input';
import { ProgressBar } from '@/components/Progress';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import { PROFILE_DEFAULTS } from '@/data/db';
import type { PetSpecies } from '@/data/types';
import type { HeroStyle } from '@/game/style';
import { space } from '@/theme/tokens';

const STEPS = 4;

export default function Onboarding() {
  const { createProfile } = useGame();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [hero, setHero] = useState<HeroStyle>({
    gender: 'female',
    hair: 'ponytail',
    hair_color: PROFILE_DEFAULTS.hair_color,
    skin: PROFILE_DEFAULTS.skin,
    outfit: PROFILE_DEFAULTS.outfit,
  });
  const [pet, setPet] = useState<PetSpecies>('cat');
  const [petName, setPetName] = useState('');
  const [saving, setSaving] = useState(false);

  const canNext = step === 1 ? name.trim().length > 0 : step === 3 ? petName.trim().length > 0 : true;

  const next = async () => {
    if (step < STEPS - 1) return setStep(step + 1);
    setSaving(true);
    await createProfile({ name: name.trim(), ...hero, look: 0, pet, pet_name: petName.trim() });
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {step > 0 && <Button3D title="Back" tone="outline" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
          <Button3D
            title={step === 0 ? "Let's go" : step === STEPS - 1 ? 'Start my quest' : 'Next'}
            disabled={!canNext}
            loading={saving}
            onPress={next}
            style={{ flex: 2 }}
          />
        </View>
      }>
      <ProgressBar progress={(step + 1) / STEPS} height={12} />
      <Animated.View key={step} entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(150)} style={styles.step}>
        {step === 0 && (
          <View style={styles.center}>
            <View style={styles.pair}>
              <Hero style={hero} size={90} />
              <Pet species="cat" size={80} />
            </View>
            <AppText variant="hero" center>
              Questie
            </AppText>
            <AppText muted center>
              Turn your habits into a quest. Level up your hero, keep your streak alive and grow a little buddy along
              the way.
            </AppText>
          </View>
        )}
        {step === 1 && (
          <>
            <AppText variant="title">What should we call you?</AppText>
            <Input label="Your name" value={name} onChangeText={setName} placeholder="Adventurer" autoFocus maxLength={24} />
          </>
        )}
        {step === 2 && (
          <>
            <AppText variant="title">Choose your hero</AppText>
            <View style={styles.center}>
              <Hero style={hero} size={110} />
            </View>
            <HeroCustomizer
              value={hero}
              onGender={(gender) => setHero((h) => ({ ...h, gender }))}
              onSkin={(skin) => setHero((h) => ({ ...h, skin }))}
              onPick={(kind, o) =>
                setHero((h) => ({ ...h, ...(kind === 'hair' ? { hair: o.id } : kind === 'color' ? { hair_color: o.id } : { outfit: o.id }) }))
              }
            />
          </>
        )}
        {step === 3 && (
          <>
            <AppText variant="title">Pick a companion</AppText>
            <AppText muted>Your pet is happy when you keep your streak, and gets sad when you skip days.</AppText>
            <PetPicker pet={pet} onChange={setPet} />
            <Input label="Pet name" value={petName} onChangeText={setPetName} placeholder="Mochi" maxLength={16} />
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { gap: space.lg },
  center: { alignItems: 'center', gap: space.md, paddingTop: space.lg },
  pair: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  footer: { flexDirection: 'row', gap: space.md },
});
