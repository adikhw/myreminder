import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText, Ionicons, type IconName } from './app-text';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', icon, style }: BadgeProps) {
  const theme = useTheme();
  const palette = {
    neutral: { bg: theme.colors.surfaceAlt, fg: theme.colors.textSecondary },
    primary: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
    success: { bg: theme.colors.successSoft, fg: theme.colors.success },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          borderRadius: theme.radius.pill,
          paddingVertical: 4,
          paddingHorizontal: 9,
        },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={12} color={palette.fg} /> : null}
      <AppText variant="micro" style={{ color: palette.fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, icon, style }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.pill,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? theme.colors.onPrimary : theme.colors.textSecondary}
        />
      ) : null}
      <AppText
        variant="label"
        numberOfLines={1}
        style={{ color: selected ? theme.colors.onPrimary : theme.colors.textSecondary }}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
      ]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: selected ? theme.colors.surface : 'transparent',
                borderRadius: theme.radius.sm,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={16}
                color={selected ? theme.colors.primary : theme.colors.textMuted}
              />
            ) : null}
            <AppText
              variant="label"
              style={{ color: selected ? theme.colors.text : theme.colors.textSecondary }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  segmented: { flexDirection: 'row', padding: 4, gap: 4 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
});
