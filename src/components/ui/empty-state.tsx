import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText, Ionicons, type IconName } from './app-text';
import { Button } from './button';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={theme.colors.primary} />
      </View>
      <AppText variant="heading" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText
        variant="small"
        color="textSecondary"
        style={{ marginTop: theme.spacing.sm, textAlign: 'center', maxWidth: 300 }}>
        {description}
      </AppText>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          icon="add"
          style={{ marginTop: theme.spacing.xl }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 16 },
  iconWrap: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
});
