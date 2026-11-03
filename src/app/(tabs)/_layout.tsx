import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon, type TabIconName } from '@/components/TabIcons';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, palette, tint } from '@/theme/tokens';

// Each tab lights up in its own colour when selected
const TABS: { name: string; title: string; icon: TabIconName; color: string }[] = [
  { name: 'index', title: 'Today', icon: 'today', color: palette.violet },
  { name: 'hero', title: 'Hero', icon: 'hero', color: palette.orange },
  { name: 'shop', title: 'Shop', icon: 'shop', color: palette.pink },
  { name: 'settings', title: 'Settings', icon: 'settings', color: palette.sky },
];

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          // Include the Android navigation bar inset, otherwise it squeezes the icons out
          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.heavy, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarActiveTintColor: t.color,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 3,
                  borderRadius: 14,
                  backgroundColor: focused ? tint(t.color, 0.18) : 'transparent',
                }}>
                <TabIcon name={t.icon} focused={focused} color={focused ? t.color : colors.tabInactive} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
