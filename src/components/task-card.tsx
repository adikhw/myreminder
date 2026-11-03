import { Pressable, StyleSheet, View } from 'react-native';
import { isToday } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppText, Ionicons } from '@/components/ui/app-text';
import { useTheme } from '@/theme';
import { formatDue } from '@/domain/format';
import { isOverdue } from '@/domain/schedule';
import type { Item, Priority } from '@/domain/types';

const priorityMeta: Record<
  Priority,
  { label: string; tone: 'danger' | 'primary' | 'neutral' }
> = {
  high: { label: 'Tinggi', tone: 'danger' },
  normal: { label: 'Normal', tone: 'primary' },
  low: { label: 'Rendah', tone: 'neutral' },
};

interface TaskCardProps {
  item: Item;
  now: Date;
  onPress: () => void;
  onToggleDone: () => void;
}

export function TaskCard({ item, now, onPress, onToggleDone }: TaskCardProps) {
  const theme = useTheme();
  const meta = priorityMeta[item.priority];
  const overdue = isOverdue(item, now.getTime());
  const dueToday = item.dueAt !== null && isToday(new Date(item.dueAt)) && !item.done;

  const accent = item.done
    ? theme.colors.borderStrong
    : item.priority === 'high'
      ? theme.colors.danger
      : theme.colors.primary;

  return (
    <Card
      onPress={onPress}
      accent={accent}
      padding="md"
      accessibilityLabel={`${item.title}. ${formatDue(item.dueAt, item.allDay)}`}
      style={[styles.card, item.done && { opacity: 0.62 }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.done }}
          accessibilityLabel={item.done ? 'Tandai belum selesai' : 'Tandai selesai'}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onToggleDone();
          }}
          style={[
            styles.checkbox,
            {
              borderColor: item.done ? theme.colors.success : theme.colors.borderStrong,
              backgroundColor: item.done ? theme.colors.success : 'transparent',
            },
          ]}>
          {item.done ? (
            <Ionicons name="checkmark" size={17} color={theme.colors.textInverse} />
          ) : null}
        </Pressable>

        <View style={styles.content}>
          <AppText
            variant="subheading"
            numberOfLines={2}
            style={item.done ? styles.doneTitle : undefined}>
            {item.title}
          </AppText>

          <View style={styles.metaRow}>
            <View style={styles.dueRow}>
              <Ionicons
                name={overdue ? 'alert-circle' : dueToday ? 'today-outline' : 'time-outline'}
                size={13}
                color={
                  overdue
                    ? theme.colors.danger
                    : dueToday
                      ? theme.colors.primary
                      : theme.colors.textMuted
                }
              />
              <AppText
                variant="caption"
                color={overdue ? 'danger' : dueToday ? 'primary' : 'textSecondary'}
                numberOfLines={1}>
                {overdue ? 'Terlambat · ' : ''}
                {formatDue(item.dueAt, item.allDay)}
              </AppText>
            </View>
          </View>

          <View style={styles.badges}>
            {!item.done ? <Badge label={meta.label} tone={meta.tone} /> : null}
            {item.rules.length > 0 ? (
              <Badge
                label={`${item.rules.length} pengingat`}
                tone="neutral"
                icon="notifications-outline"
              />
            ) : null}
            {item.note ? <Badge label="Catatan" tone="neutral" icon="document-text-outline" /> : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={17} color={theme.colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  content: { flex: 1, gap: 6 },
  doneTitle: { textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
