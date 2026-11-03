import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { AppText, Ionicons, type IconName } from './app-text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = (() => {
    switch (variant) {
      case 'secondary':
        return {
          background: theme.colors.surfaceAlt,
          foreground: theme.colors.text,
          border: theme.colors.border,
        };
      case 'ghost':
        return {
          background: 'transparent',
          foreground: theme.colors.primary,
          border: 'transparent',
        };
      case 'danger':
        return {
          background: theme.colors.dangerSoft,
          foreground: theme.colors.danger,
          border: theme.colors.dangerSoft,
        };
      default:
        return {
          background: theme.colors.primary,
          foreground: theme.colors.onPrimary,
          border: theme.colors.primary,
        };
    }
  })();

  const paddingVertical = size === 'sm' ? 9 : 14;
  const paddingHorizontal = size === 'sm' ? theme.spacing.md : theme.spacing.lg;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          paddingVertical,
          paddingHorizontal,
          borderRadius: theme.radius.md,
          opacity: isDisabled ? 0.5 : pressed ? 0.78 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.foreground} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={iconSize} color={palette.foreground} /> : null}
          <AppText
            variant={size === 'sm' ? 'label' : 'subheading'}
            style={{ color: palette.foreground }}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 40,
  color,
  filled = false,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: filled ? theme.colors.surface : 'transparent',
          borderColor: filled ? theme.colors.border : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <Ionicons name={icon} size={size * 0.5} color={color ?? theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
});
