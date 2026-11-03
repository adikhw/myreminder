import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';

import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue | null; size: number }) => (
    <Ionicons name={name} size={size} color={typeof color === 'string' ? color : undefined} />
  );
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
        },
        tabBarItemStyle: { paddingBottom: 2 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Tugas', tabBarIcon: tabIcon('checkmark-done-outline') }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: 'Jadwal', tabBarIcon: tabIcon('school-outline') }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Kalender', tabBarIcon: tabIcon('calendar-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Atur', tabBarIcon: tabIcon('options-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600' },
});
