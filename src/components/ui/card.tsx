import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

import { AppText } from './app-text';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: keyof Theme['spacing'];
  accent?: string;
  accessibilityLabel?: string;
}

export function Card({
  children,
  onPress,
  style,
  padding = 'lg',
  accent,
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[padding],
    shadowColor: theme.colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };

  const accentStyle: ViewStyle | null = accent
    ? { borderLeftWidth: 3, borderLeftColor: accent }
    : null;

  if (!onPress) {
    return <View style={[base, accentStyle, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        accentStyle,
        pressed && { backgroundColor: theme.colors.surfacePressed, transform: [{ scale: 0.995 }] },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionTitle}>
        <View style={[styles.sectionDot, { backgroundColor: theme.colors.primary }]} />
        <AppText variant="subheading">{title}</AppText>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <AppText variant="label" color="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : actionLabel ? (
        <AppText variant="caption" color="textMuted">
          {actionLabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
});
