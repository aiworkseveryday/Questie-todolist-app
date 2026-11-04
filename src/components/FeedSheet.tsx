import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { FoodIcon } from '@/characters/FoodIcon';
import { useGame } from '@/data/store';
import { FOODS } from '@/game/shop';
import { useTheme } from '@/theme/ThemeProvider';
import { EASE_OUT, SLIDE_MS } from '@/theme/motion';
import { radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button3D } from './Button3D';

/** Bottom sheet listing the food you own; picking one feeds the pet. */
export function FeedSheet({ visible, onClose, onFed }: { visible: boolean; onClose: () => void; onFed: (foodId: string) => void }) {
  const { profile, feedPet } = useGame();
  const { colors } = useTheme();
  if (!profile) return null;
  const owned = FOODS.filter((f) => (profile.inventory[f.id] ?? 0) > 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View entering={FadeIn} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          entering={SlideInDown.duration(SLIDE_MS).easing(EASE_OUT)}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <AppText variant="title">Feed {profile.pet_name}</AppText>
          {owned.length === 0 ? (
            <View style={{ gap: space.md, alignItems: 'center', paddingVertical: space.lg }}>
              <AppText muted center>
                Your snack bag is empty. Buy treats in the shop with the coins you earn from quests.
              </AppText>
              <Button3D
                title="Go to shop"
                icon="shopping"
                onPress={() => {
                  onClose();
                  router.navigate('/shop');
                }}
                style={{ alignSelf: 'stretch' }}
              />
            </View>
          ) : (
            <View style={styles.grid}>
              {owned.map((f) => (
                <Pressable
                  key={f.id}
                  accessibilityLabel={`Feed ${f.name}`}
                  onPress={async () => {
                    if (!(await feedPet(f.id))) onFed(f.id);
                  }}
                  style={({ pressed }) => [
                    styles.food,
                    { borderColor: colors.border, backgroundColor: colors.surfaceAlt, transform: [{ scale: pressed ? 0.95 : 1 }] },
                  ]}>
                  <FoodIcon id={f.id} size={54} />
                  <AppText variant="caption" numberOfLines={1}>
                    {f.name}
                  </AppText>
                  <View style={[styles.count, { backgroundColor: colors.primary }]}>
                    <AppText variant="caption" color="#FFFFFF" style={{ fontSize: 11 }}>
                      ×{profile.inventory[f.id]}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,8,20,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    borderWidth: 2,
    padding: space.xl,
    paddingBottom: space.xxl + space.xl,
    gap: space.md,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  food: { width: '30%', flexGrow: 1, alignItems: 'center', gap: space.xs, padding: space.md, borderRadius: radius.lg, borderWidth: 2 },
  count: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, borderRadius: radius.pill },
});
