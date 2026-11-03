import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText, Ionicons, type IconName } from './app-text';

interface FloatingActionButtonProps {
  onPress: () => void;
  label?: string;
  icon?: IconName;
  accessibilityLabel: string;
}

export function FloatingActionButton({
  onPress,
  label,
  icon = 'add',
  accessibilityLabel,
}: FloatingActionButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.shadow,
          opacity: pressed ? 0.85 : 1,
          paddingHorizontal: label ? theme.spacing.lg : 0,
          width: label ? undefined : 58,
          height: 58,
          borderRadius: label ? theme.radius.pill : 29,
        },
      ]}>
      <View style={styles.content}>
        <Ionicons name={icon} size={25} color={theme.colors.onPrimary} />
        {label ? (
          <AppText variant="subheading" style={{ color: theme.colors.onPrimary }}>
            {label}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
