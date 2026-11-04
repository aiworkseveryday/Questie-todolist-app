import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { FoodIcon } from '@/characters/FoodIcon';
import { Pet } from '@/characters/Pet';
import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useGame } from '@/data/store';
import { MAX_FREEZES, shownPetStage } from '@/game/engine';
import { ACCESSORIES, BOOSTS, FOODS, FREE_PER_DAY, freebieFor, freebiesLeft, type ShopItem } from '@/game/shop';
import { todayISO } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { EASE_OUT, SLIDE_MS } from '@/theme/motion';
import { radius, space } from '@/theme/tokens';

function ItemCard({
  item,
  owned,
  onBuy,
  disabled,
  label,
}: {
  item: ShopItem;
  owned: number;
  onBuy: () => void;
  disabled: boolean;
  /** Button text; the price by default */
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.item}>
      <FoodIcon id={item.id} size={60} />
      <AppText variant="label" center numberOfLines={1}>
        {item.name}
      </AppText>
      <AppText variant="caption" muted center numberOfLines={2} style={{ minHeight: 36 }}>
        {item.blurb}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        Owned: {owned}
      </AppText>
      <Button3D title={label ?? `🪙 ${item.price}`} small color={item.price ? colors.coin : colors.success} disabled={disabled} onPress={onBuy} style={{ alignSelf: 'stretch' }} />
    </Card>
  );
}

export default function Shop() {
  const { profile, buyItem, updateProfile } = useGame();
  const { colors } = useTheme();
  const [toast, setToast] = useState<{ key: number; text: string; ok: boolean } | null>(null);
  const toastSeq = useRef(0);
  if (!profile) return null;
  const stage = shownPetStage(profile);
  const freebie = freebieFor(profile.pet);
  const freeLeft = freebiesLeft(profile, todayISO());

  const purchase = async (item: ShopItem) => {
    const err = await buyItem(item.id);
    toastSeq.current += 1;
    setToast({ key: toastSeq.current, text: err ?? (item.price ? `Bought ${item.name}!` : `Got a free ${item.name.toLowerCase()}!`), ok: !err });
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <AppText variant="title">Shop</AppText>
          <View style={[styles.wallet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label" color="#C98A00">
              🪙 {profile.coins}
            </AppText>
          </View>
        </View>

        <Card style={styles.banner} fill={colors.primarySoft} edge={colors.border}>
          <Pet
            species={profile.pet}
            mood="happy"
            stage={stage}
            accessory={profile.pet_accessory}
            size={70}
          />
          <AppText style={{ flex: 1 }}>
            Earn coins by finishing quests. Treat {profile.pet_name} to keep them happy, even on tough days!
          </AppText>
        </Card>

        <AppText variant="caption" muted upper>
          Free treat · {FREE_PER_DAY} a day
        </AppText>
        <View style={styles.grid}>
          <ItemCard
            item={freebie}
            owned={profile.inventory[freebie.id] ?? 0}
            disabled={freeLeft <= 0}
            label={freeLeft > 0 ? `Free · ${freeLeft} left` : 'All gone today'}
            onBuy={() => purchase(freebie)}
          />
          {/* keeps the free card half width, like the others */}
          <View style={styles.item} />
        </View>

        <AppText variant="caption" muted upper>
          Pet food
        </AppText>
        <View style={styles.grid}>
          {FOODS.map((f) => (
            <ItemCard
              key={f.id}
              item={f}
              owned={profile.inventory[f.id] ?? 0}
              disabled={profile.coins < f.price}
              onBuy={() => purchase(f)}
            />
          ))}
        </View>

        <AppText variant="caption" muted upper>
          Pet accessories
        </AppText>
        <View style={styles.grid}>
          {ACCESSORIES.map((a) => {
            const owned = profile.owned.includes(a.id);
            const wearing = profile.pet_accessory === a.id;
            return (
              <Card key={a.id} style={styles.item}>
                <Pet species={profile.pet} stage={stage} accessory={a.id} mood="happy" size={64} animated={false} />
                <AppText variant="label" center numberOfLines={1}>
                  {a.name}
                </AppText>
                <AppText variant="caption" muted center numberOfLines={2} style={{ minHeight: 36 }}>
                  {a.blurb}
                </AppText>
                {owned ? (
                  <Button3D
                    title={wearing ? 'Take off' : 'Wear'}
                    small
                    tone={wearing ? 'outline' : 'primary'}
                    onPress={() => updateProfile({ pet_accessory: wearing ? null : a.id })}
                    style={{ alignSelf: 'stretch' }}
                  />
                ) : (
                  <Button3D
                    title={`🪙 ${a.price}`}
                    small
                    color={colors.coin}
                    disabled={profile.coins < a.price}
                    onPress={() => purchase(a)}
                    style={{ alignSelf: 'stretch' }}
                  />
                )}
              </Card>
            );
          })}
        </View>

        <AppText variant="caption" muted upper>
          Boosts
        </AppText>
        <View style={styles.grid}>
          {BOOSTS.map((b) => (
            <ItemCard
              key={b.id}
              item={b}
              owned={profile.freeze_tokens}
              disabled={profile.coins < b.price || profile.freeze_tokens >= MAX_FREEZES}
              onBuy={() => purchase(b)}
            />
          ))}
        </View>
      </Screen>

      {toast && (
        <Animated.View
          key={toast.key}
          entering={FadeInDown.duration(SLIDE_MS).easing(EASE_OUT)}
          exiting={FadeOut}
          style={[styles.toast, { backgroundColor: toast.ok ? colors.success : colors.danger }]}
          onLayout={() => setTimeout(() => setToast((t) => (t?.key === toast.key ? null : t)), 1800)}>
          <AppText variant="label" color="#FFFFFF" center>
            {toast.text}
          </AppText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wallet: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  item: { width: '47%', flexGrow: 1, alignItems: 'center', gap: space.xs, padding: space.md },
  toast: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, padding: space.md, borderRadius: radius.md },
});
