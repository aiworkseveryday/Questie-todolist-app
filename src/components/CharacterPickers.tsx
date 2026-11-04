import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { HERO_LOOKS, Hero } from '@/characters/Hero';
import { PETS, Pet } from '@/characters/Pet';
import { PET_STAGES } from '@/game/engine';
import type { HeroGender, PetSpecies } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, tint } from '@/theme/tokens';
import { AppText } from './AppText';
import { Chip, ChipRow } from './Chip';

function Tile({ selected, onPress, children, label }: { selected: boolean; onPress: () => void; children: React.ReactNode; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.tile,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? tint(colors.primary, 0.1) : colors.surface,
        },
      ]}>
      {children}
      <AppText variant="caption" color={selected ? colors.primary : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function HeroPicker({
  gender,
  look,
  onChange,
}: {
  gender: HeroGender;
  look: number;
  onChange: (v: { gender: HeroGender; look: number }) => void;
}) {
  return (
    <View style={{ gap: space.lg }}>
      <ChipRow>
        <Chip label="Male" selected={gender === 'male'} onPress={() => onChange({ gender: 'male', look })} />
        <Chip label="Female" selected={gender === 'female'} onPress={() => onChange({ gender: 'female', look })} />
      </ChipRow>
      <View style={styles.row}>
        {HERO_LOOKS.map((l, i) => (
          <Tile key={l.name} label={l.name} selected={look === i} onPress={() => onChange({ gender, look: i })}>
            <Hero gender={gender} look={i} size={70} bounce={look === i} />
          </Tile>
        ))}
      </View>
    </View>
  );
}

export function PetPicker({ pet, onChange }: { pet: PetSpecies; onChange: (p: PetSpecies) => void }) {
  return (
    <View style={styles.row}>
      {PETS.map((p) => (
        <Tile key={p.id} label={p.name} selected={pet === p.id} onPress={() => onChange(p.id)}>
          <Pet species={p.id} size={70} mood={pet === p.id ? 'happy' : 'idle'} />
        </Tile>
      ))}
    </View>
  );
}

/**
 * Pick which of the forms the pet has reached it is shown in. Picking the newest one keeps
 * following evolution; an older one stays put even after the next evolution.
 */
export function PetFormPicker({
  pet,
  reached,
  form,
  accessory,
  onChange,
}: {
  pet: PetSpecies;
  /** Highest stage unlocked so far */
  reached: number;
  /** The picked form, null = newest */
  form: number | null;
  accessory: string | null;
  onChange: (form: number | null) => void;
}) {
  const shown = form == null ? reached : Math.min(form, reached);
  return (
    <View style={styles.wrap}>
      {PET_STAGES.map((s, i) => {
        const unlocked = i <= reached;
        return (
          <View key={s.name} style={styles.formCell}>
            <Tile
              label={unlocked ? s.name : `Lv ${s.level}`}
              selected={unlocked && shown === i}
              onPress={() => unlocked && onChange(i === reached ? null : i)}>
              <View style={{ opacity: unlocked ? 1 : 0.25 }}>
                <Pet species={pet} stage={i} size={52} mood="happy" accessory={accessory} animated={false} />
              </View>
            </Tile>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  formCell: { width: '30%', flexGrow: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
});
