import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText, Ionicons, type IconName } from './app-text';

interface SwitchRowProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function SwitchRow({
  title,
  description,
  value,
  onValueChange,
  icon,
  style,
}: SwitchRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, style]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="subheading">{title}</AppText>
        {description ? (
          <AppText variant="caption" color="textSecondary" style={{ marginTop: 3 }}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.primary }}
        thumbColor={value ? theme.colors.onPrimary : theme.colors.surface}
        ios_backgroundColor={theme.colors.surfacePressed}
      />
    </View>
  );
}

interface SettingRowProps {
  title: string;
  description?: string;
  value?: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SettingRow({
  title,
  description,
  value,
  icon,
  onPress,
  danger = false,
  style,
}: SettingRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }, style]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? theme.colors.danger : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.text}>
        <AppText variant="subheading" color={danger ? 'danger' : 'text'}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" color="textSecondary" style={{ marginTop: 3 }}>
            {description}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ maxWidth: 120 }}>
          {value}
        </AppText>
      ) : null}
      <Ionicons name="chevron-forward" size={17} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
});
