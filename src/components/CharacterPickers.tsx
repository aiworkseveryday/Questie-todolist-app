import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Hero } from '@/characters/Hero';
import { PETS, Pet } from '@/characters/Pet';
import type { PetSpecies } from '@/data/types';
import {
  HAIR_COLORS,
  hairHex,
  HAIR_STYLES,
  OUTFITS,
  SKIN_TONES,
  styleKey,
  type HeroStyle,
  type StyleOption,
} from '@/game/style';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, tint } from '@/theme/tokens';
import { AppText } from './AppText';
import { Chip, ChipRow } from './Chip';

function Tile({
  selected,
  onPress,
  children,
  label,
  price,
  width,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  label: string;
  /** Shown as a coin price when the option is still locked */
  price?: number;
  width?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={price ? `${label}, ${price} coins` : label}
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.tile,
        width ? { width } : { flex: 1 },
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? tint(colors.primary, 0.1) : colors.surface,
        },
      ]}>
      {children}
      <AppText variant="caption" color={selected ? colors.primary : colors.textMuted} numberOfLines={1}>
        {label}
      </AppText>
      {!!price && (
        <View style={[styles.price, { backgroundColor: colors.coin }]}>
          <MaterialCommunityIcons name="lock" size={10} color="#6B4A00" />
          <AppText variant="caption" color="#6B4A00" style={{ fontSize: 10, lineHeight: 13 }}>
            {price}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

type Kind = 'hair' | 'color' | 'outfit';

type CustomizerProps = {
  value: HeroStyle;
  /** Cosmetics already bought; omit during onboarding (only free options can be picked) */
  owned?: string[];
  onGender: (g: HeroStyle['gender']) => void;
  onSkin: (i: number) => void;
  onPick: (kind: Kind, option: StyleOption) => void;
};

/** Full hero editor: body, skin, hairstyle, hair colour and outfit, with live previews. */
export function HeroCustomizer({ value, owned, onGender, onSkin, onPick }: CustomizerProps) {
  const { colors } = useTheme();
  const locked = (kind: Kind, o: StyleOption) => (o.price > 0 && !(owned ?? []).includes(styleKey(kind, o.id)) ? o.price : 0);
  const pick = (kind: Kind, o: StyleOption) => {
    // During onboarding premium options stay locked until bought in the shop
    if (!owned && o.price > 0) return;
    onPick(kind, o);
  };
  const options = (kind: Kind, list: StyleOption[]) => (owned ? list : list.filter((o) => o.price === 0));

  const label = (text: string) => (
    <AppText variant="caption" muted upper>
      {text}
    </AppText>
  );

  return (
    <View style={{ gap: space.md }}>
      {label('Body')}
      <ChipRow>
        <Chip label="Male" selected={value.gender === 'male'} onPress={() => onGender('male')} />
        <Chip label="Female" selected={value.gender === 'female'} onPress={() => onGender('female')} />
      </ChipRow>

      {label('Skin tone')}
      <View style={styles.swatches}>
        {SKIN_TONES.map((hex, i) => (
          <Pressable
            key={hex}
            accessibilityLabel={`Skin tone ${i + 1}`}
            accessibilityState={{ selected: value.skin === i }}
            onPress={() => {
              Haptics.selectionAsync();
              onSkin(i);
            }}
            style={[styles.swatch, { backgroundColor: hex, borderColor: value.skin === i ? colors.primary : colors.border }]}
          />
        ))}
      </View>

      {label('Hairstyle')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {options('hair', HAIR_STYLES).map((h) => (
          <Tile key={h.id} width={92} label={h.name} price={locked('hair', h)} selected={value.hair === h.id} onPress={() => pick('hair', h)}>
            {/* Head-and-shoulders crop of the hero wearing this style */}
            <View style={styles.headCrop}>
              <Hero style={{ ...value, hair: h.id }} size={84} bounce={false} />
            </View>
          </Tile>
        ))}
      </ScrollView>

      {label('Hair colour')}
      <View style={styles.swatches}>
        {options('color', HAIR_COLORS).map((c) => {
          const price = locked('color', c);
          return (
            <Pressable
              key={c.id}
              accessibilityLabel={price ? `${c.name}, ${price} coins` : c.name}
              accessibilityState={{ selected: value.hair_color === c.id }}
              onPress={() => {
                Haptics.selectionAsync();
                pick('color', c);
              }}
              style={[
                styles.swatch,
                { backgroundColor: hairHex(c.id), borderColor: value.hair_color === c.id ? colors.primary : colors.border },
              ]}>
              {!!price && <MaterialCommunityIcons name="lock" size={14} color="#FFFFFF" />}
            </Pressable>
          );
        })}
      </View>

      {label('Outfit')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {options('outfit', OUTFITS).map((o) => (
          <Tile key={o.id} width={104} label={o.name} price={locked('outfit', o)} selected={value.outfit === o.id} onPress={() => pick('outfit', o)}>
            <Hero style={{ ...value, outfit: o.id }} size={60} bounce={false} />
          </Tile>
        ))}
      </ScrollView>
    </View>
  );
}

export function PetPicker({ pet, onChange, stage = 1 }: { pet: PetSpecies; onChange: (p: PetSpecies) => void; stage?: number }) {
  return (
    <View style={styles.row}>
      {PETS.map((p) => (
        <Tile key={p.id} label={p.name} selected={pet === p.id} onPress={() => onChange(p.id)}>
          <Pet species={p.id} size={70} stage={stage} mood={pet === p.id ? 'happy' : 'idle'} />
        </Tile>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  strip: { gap: space.sm, paddingRight: space.sm },
  tile: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  headCrop: { width: 84, height: 66, overflow: 'hidden', alignItems: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  price: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
});
