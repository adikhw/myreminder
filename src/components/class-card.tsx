import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { AppText, Ionicons } from '@/components/ui/app-text';
import { formatMinutes } from '@/domain/format';
import type { Item } from '@/domain/types';
import { useTheme } from '@/theme';

interface ClassCardProps {
  item: Item;
  onPress: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}

export function ClassCard({ item, onPress, onToggleEnabled }: ClassCardProps) {
  const theme = useTheme();
  const schedule = item.schedule;
  if (!schedule) return null;

  return (
    <Card
      padding="md"
      accent={item.enabled ? theme.colors.success : theme.colors.borderStrong}
      style={[styles.card, !item.enabled && { opacity: 0.64 }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.title}`}
          onPress={onPress}
          style={styles.contentPressable}>
          <View style={styles.timeColumn}>
            <AppText variant="subheading" style={{ color: theme.colors.primary }}>
              {formatMinutes(schedule.startMinutes)}
            </AppText>
            <AppText variant="micro" color="textMuted">
              {formatMinutes(schedule.endMinutes)}
            </AppText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.content}>
            <AppText variant="subheading" numberOfLines={2}>
              {item.title}
            </AppText>
            <View style={styles.metaRow}>
              {item.room ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
                  <AppText variant="caption" color="textSecondary">
                    {item.room}
                  </AppText>
                </View>
              ) : null}
              {item.teacher ? (
                <View style={styles.metaItem}>
                  <Ionicons name="person-outline" size={13} color={theme.colors.textMuted} />
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {item.teacher}
                  </AppText>
                </View>
              ) : null}
            </View>
            {!item.enabled ? (
              <AppText variant="micro" color="warning" style={{ marginTop: 3 }}>
                Nonaktif — notifikasi dijeda
              </AppText>
            ) : null}
          </View>
        </Pressable>

        <Switch
          accessibilityLabel={`Aktifkan ${item.title}`}
          value={item.enabled}
          onValueChange={onToggleEnabled}
          trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.success }}
          thumbColor={item.enabled ? theme.colors.surface : theme.colors.surface}
          ios_backgroundColor={theme.colors.surfacePressed}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contentPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeColumn: { width: 46, alignItems: 'flex-start' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  content: { flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
