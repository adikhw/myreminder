import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { ClassCard } from '@/components/class-card';
import { AppText, Ionicons } from '@/components/ui/app-text';
import { Card, SectionHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingActionButton } from '@/components/ui/fab';
import { PageHeader, Screen } from '@/components/ui/screen';
import { SwitchRow } from '@/components/ui/switch-row';
import { useDatabase } from '@/db/DatabaseProvider';
import { setItemEnabled } from '@/db/items';
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from '@/domain/constants';
import { groupClassesByWeekday } from '@/domain/schedule';
import { useItems } from '@/hooks/use-items';
import { rescheduleAll } from '@/notifications/scheduler';
import { useSettings } from '@/settings/SettingsProvider';
import { useTheme } from '@/theme';

export default function ScheduleScreen() {
  const theme = useTheme();
  const db = useDatabase();
  const { items, reload } = useItems('class');
  const { settings, updateHolidayMode } = useSettings();
  const groups = groupClassesByWeekday(items);
  const today = new Date().getDay();

  async function toggleClass(itemId: string, enabled: boolean) {
    try {
      await setItemEnabled(db, itemId, enabled);
      await rescheduleAll(db);
      await reload();
      Haptics.selectionAsync().catch(() => undefined);
    } catch {
      Alert.alert('Gagal menyimpan', 'Status mapel tidak bisa diubah. Coba lagi.');
    }
  }

  async function toggleHoliday(enabled: boolean) {
    await updateHolidayMode(enabled);
    Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <Screen
      scroll
      tabScreen
      floating={
        <FloatingActionButton
          accessibilityLabel="Tambah mapel"
          label="Mapel"
          onPress={() =>
            router.push({ pathname: '/item/[id]', params: { id: 'new', type: 'class' } })
          }
        />
      }>
      <PageHeader
        eyebrow="Jadwal mingguan"
        title="Jadwal Mapel"
        subtitle="Senin sampai Minggu, diurutkan sesuai jam mulai."
      />

      <Card
        style={{ marginBottom: theme.spacing.xl }}
        accent={settings.holidayMode ? theme.colors.warning : undefined}>
        <SwitchRow
          title="Mode libur"
          description="Jeda notifikasi semua mapel tanpa menghapus jadwal."
          icon="sunny-outline"
          value={settings.holidayMode}
          onValueChange={toggleHoliday}
        />
        {settings.holidayMode ? (
          <View
            style={[
              styles.holidayNote,
              { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
            ]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.warning} />
            <AppText variant="caption" style={{ color: theme.colors.warning, flex: 1 }}>
              Notifikasi mapel dijeda. Tugas dan acara tetap berjalan.
            </AppText>
          </View>
        ) : null}
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title="Belum ada mapel"
          description="Tambahkan mapel beserta hari dan jamnya. Pengingat malam sebelumnya dibuat otomatis."
          actionLabel="Tambah mapel"
          onAction={() =>
            router.push({ pathname: '/item/[id]', params: { id: 'new', type: 'class' } })
          }
        />
      ) : (
        WEEKDAY_ORDER.map((weekday) => {
          const dayItems = groups[weekday] ?? [];
          return (
            <View key={weekday} style={{ marginBottom: theme.spacing.lg }}>
              <SectionHeader
                title={WEEKDAY_LABELS[weekday]}
                actionLabel={weekday === today ? 'Hari ini' : `${dayItems.length} mapel`}
              />
              {dayItems.length === 0 ? (
                <View
                  style={[
                    styles.emptyDay,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: theme.radius.md,
                    },
                  ]}>
                  <AppText variant="caption" color="textMuted">
                    Tidak ada mapel
                  </AppText>
                </View>
              ) : (
                dayItems.map((item) => (
                  <ClassCard
                    key={item.id}
                    item={item}
                    onPress={() =>
                      router.push({ pathname: '/item/[id]', params: { id: item.id } })
                    }
                    onToggleEnabled={(enabled) => toggleClass(item.id, enabled)}
                  />
                ))
              )}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  holidayNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginTop: 10,
  },
  emptyDay: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
