import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Ionicons, type IconName } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { formatItemSubtitle } from '@/domain/format';
import type { Item } from '@/domain/types';
import { useTheme } from '@/theme';

const typeMeta: Record<Item['type'], { icon: IconName; label: string }> = {
  task: { icon: 'checkbox-outline', label: 'Tugas' },
  event: { icon: 'calendar-outline', label: 'Acara' },
  class: { icon: 'school-outline', label: 'Mapel' },
};

export function CalendarItemRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const theme = useTheme();
  const meta = typeMeta[item.type];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${item.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          opacity: item.done ? 0.65 : 1,
        },
      ]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor:
              item.type === 'event'
                ? theme.colors.warningSoft
                : item.type === 'class'
                  ? theme.colors.successSoft
                  : theme.colors.primarySoft,
          },
        ]}>
        <Ionicons
          name={meta.icon}
          size={18}
          color={
            item.type === 'event'
              ? theme.colors.warning
              : item.type === 'class'
                ? theme.colors.success
                : theme.colors.primary
          }
        />
      </View>

      <View style={styles.content}>
        <AppText
          variant="subheading"
          numberOfLines={2}
          style={item.done ? styles.doneText : undefined}>
          {item.title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
          {formatItemSubtitle(item)}
        </AppText>
      </View>

      <Badge label={meta.label} tone="neutral" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  doneText: { textDecorationLine: 'line-through' },
});
