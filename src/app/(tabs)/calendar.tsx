import {
  addMonths,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CalendarItemRow } from '@/components/calendar-item-row';
import { AppText } from '@/components/ui/app-text';
import { Card, SectionHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingActionButton } from '@/components/ui/fab';
import { IconButton } from '@/components/ui/button';
import { PageHeader, Screen } from '@/components/ui/screen';
import { daysWithItems, itemsForDay, monthGrid, type MonthCell } from '@/domain/calendar';
import { WEEKDAY_ORDER, WEEKDAY_SHORT_LABELS } from '@/domain/constants';
import { formatFullDate, formatMonthTitle, formatShortDate } from '@/domain/format';
import { useItems } from '@/hooks/use-items';
import { useTheme } from '@/theme';

export default function CalendarScreen() {
  const theme = useTheme();
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const { items } = useItems();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = monthGrid(year, month);
  const marks = daysWithItems(items, year, month);
  const dayItems = itemsForDay(items, selected);

  function moveMonth(delta: number) {
    const next = addMonths(cursor, delta);
    setCursor(startOfMonth(next));
    setSelected(isSameMonth(next, today) ? today : startOfMonth(next));
  }

  function goToday() {
    setCursor(startOfMonth(today));
    setSelected(today);
  }

  function addEvent() {
    router.push({
      pathname: '/item/[id]',
      params: { id: 'new', type: 'event', date: String(selected.getTime()) },
    });
  }

  return (
    <Screen
      scroll
      tabScreen
      floating={
        <FloatingActionButton accessibilityLabel="Tambah acara" label="Acara" onPress={addEvent} />
      }>
      <PageHeader
        eyebrow="Rencana bulanan"
        title="Kalender"
        subtitle="Ketuk tanggal untuk melihat dan menambah acara."
        right={
          <Pressable
            accessibilityRole="button"
            onPress={goToday}
            style={({ pressed }) => [
              styles.todayButton,
              {
                backgroundColor: theme.colors.primarySoft,
                borderRadius: theme.radius.pill,
                opacity: pressed ? 0.65 : 1,
              },
            ]}>
            <AppText variant="label" color="primary">
              Hari ini
            </AppText>
          </Pressable>
        }
      />

      <Card padding="md" style={{ marginBottom: theme.spacing.xl }}>
        <View style={styles.monthHeader}>
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Bulan sebelumnya"
            onPress={() => moveMonth(-1)}
          />
          <View style={styles.monthTitle}>
            <AppText variant="heading">{formatMonthTitle(year, month)}</AppText>
            <AppText variant="caption" color="textMuted">
              {marks.size} hari bertanda
            </AppText>
          </View>
          <IconButton
            icon="chevron-forward"
            accessibilityLabel="Bulan berikutnya"
            onPress={() => moveMonth(1)}
          />
        </View>

        <View style={styles.weekLabels}>
          {WEEKDAY_ORDER.map((weekday) => (
            <View key={weekday} style={styles.weekLabelCell}>
              <AppText variant="micro" color="textMuted">
                {WEEKDAY_SHORT_LABELS[weekday]}
              </AppText>
            </View>
          ))}
        </View>

        {weeks.map((week) => (
          <View key={week[0].key} style={styles.weekRow}>
            {week.map((cell) => (
              <DayCell
                key={cell.key}
                cell={cell}
                marked={marks.has(cell.key)}
                selected={isSameDay(cell.date, selected)}
                onPress={() => {
                  setSelected(cell.date);
                  if (!cell.inMonth) {
                    setCursor(startOfMonth(cell.date));
                  }
                }}
              />
            ))}
          </View>
        ))}
      </Card>

      <SectionHeader title="Item hari ini" actionLabel={formatShortDate(selected)} />
      {dayItems.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title="Hari ini masih kosong"
          description="Tambahkan acara atau tugas dengan tanggal ini agar muncul di kalender."
          actionLabel="Tambah acara"
          onAction={addEvent}
        />
      ) : (
        <View>
          {dayItems.map((item) => (
            <CalendarItemRow
              key={`${item.id}-${selected.toDateString()}`}
              item={item}
              onPress={() =>
                router.push({ pathname: '/item/[id]', params: { id: item.id } })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function DayCell({
  cell,
  marked,
  selected,
  onPress,
}: {
  cell: MonthCell;
  marked: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const foreground = selected
    ? theme.colors.onPrimary
    : cell.inMonth
      ? theme.colors.text
      : theme.colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatFullDate(cell.date)}${marked ? ', ada item' : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.dayCell}>
      <View
        style={[
          styles.dayCircle,
          {
            backgroundColor: selected ? theme.colors.primary : 'transparent',
            borderColor: cell.isToday && !selected ? theme.colors.primary : 'transparent',
            borderWidth: cell.isToday && !selected ? 1.4 : 0,
          },
        ]}>
        <AppText
          variant="small"
          style={{
            color: foreground,
            fontWeight: cell.isToday || selected ? '700' : '400',
          }}>
          {cell.date.getDate()}
        </AppText>
      </View>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: marked
              ? selected
                ? theme.colors.onPrimary
                : theme.colors.primary
              : 'transparent',
            opacity: cell.inMonth ? 1 : 0.4,
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  todayButton: { paddingVertical: 8, paddingHorizontal: 13, marginTop: 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { alignItems: 'center' },
  weekLabels: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  weekLabelCell: { flex: 1, alignItems: 'center' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
