import { Modal, StyleSheet, View } from 'react-native';

import { Pet } from '@/characters/Pet';
import { shownPetStage } from '@/game/engine';
import { useGame } from '@/data/store';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button3D } from './Button3D';
import { Confetti } from './Confetti';

/** Full-screen pop for level-ups, new streak days and earned freeze tokens. */
export function Celebration() {
  const { reward, dismissReward, profile } = useGame();
  const { colors } = useTheme();
  if (!profile) return null;

  let emoji = '🔥';
  let title = `${reward?.patch.streak} day streak!`;
  let body = `${profile.pet_name} is so proud of you. Come back tomorrow to keep it going!`;
  let accent = colors.streak;
  if (reward?.levelUp) {
    emoji = '⭐';
    title = `Level ${reward.newLevel}!`;
    body = 'Your hero grew stronger. New unlocks are on the way.';
    accent = palette.violet;
  } else if (reward?.tokenEarned) {
    emoji = '🧊';
    title = 'Streak freeze earned!';
    body = 'If you miss a day, a freeze saves your streak automatically.';
    accent = palette.sky;
  } else if (reward?.freezesUsed) {
    body = `A streak freeze kept your streak alive. ${body}`;
  }

  return (
    <Modal visible={!!reward} transparent animationType="fade" onRequestClose={dismissReward}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pet
            species={profile.pet}
            mood="celebrate"
            stage={shownPetStage(profile)}
            accessory={profile.pet_accessory}
            size={120}
          />
          <AppText style={{ fontSize: 52, lineHeight: 60 }}>{emoji}</AppText>
          <AppText variant="title" center color={accent}>
            {title}
          </AppText>
          <AppText muted center>
            {body}
          </AppText>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: colors.xp }]}>
              <AppText variant="label" color="#6B4A00">
                +{reward?.xp} XP
              </AppText>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
              <AppText variant="label">🪙 +{reward?.coins}</AppText>
            </View>
          </View>
          <Button3D title="Continue" onPress={dismissReward} style={{ alignSelf: 'stretch' }} />
        </View>
        {reward && <Confetti key={String(reward.patch.last_active_on) + reward.xp + reward.newLevel} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,8,20,0.55)', justifyContent: 'center', padding: space.xl },
  sheet: { borderRadius: radius.lg, borderWidth: 2, padding: space.xl, alignItems: 'center', gap: space.sm },
  pills: { flexDirection: 'row', gap: space.sm, marginVertical: space.sm },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill },
});
