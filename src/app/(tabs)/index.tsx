import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { TaskCard } from '@/components/task-card';
import { AppText, Ionicons } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingActionButton } from '@/components/ui/fab';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/db/DatabaseProvider';
import { setItemDone } from '@/db/items';
import { formatTodayTitle } from '@/domain/format';
import { isOverdue, sortTasks } from '@/domain/schedule';
import type { Item } from '@/domain/types';
import { useItems } from '@/hooks/use-items';
import { useNow } from '@/hooks/use-now';
import { useNotificationPermissions } from '@/hooks/use-notification-permissions';
import { rescheduleAll } from '@/notifications/scheduler';
import { useSettings } from '@/settings/SettingsProvider';
import { useTheme } from '@/theme';

type Filter = 'all' | 'active' | 'done';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'done', label: 'Selesai' },
];

export default function TasksScreen() {
  const theme = useTheme();
  const db = useDatabase();
  const now = useNow();
  const { items, reload } = useItems('task');
  const { settings, markGuideSeen } = useSettings();
  const notifications = useNotificationPermissions();
  const [filter, setFilter] = useState<Filter>('all');

  const sorted = sortTasks(items);
  const visible = sorted.filter((item) => {
    if (filter === 'active') return !item.done;
    if (filter === 'done') return item.done;
    return true;
  });

  const activeCount = items.filter((item) => !item.done).length;
  const overdueCount = items.filter((item) => isOverdue(item, now.getTime())).length;
  const todayCount = items.filter((item) => {
    if (item.done || item.dueAt === null) return false;
    const due = new Date(item.dueAt);
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    );
  }).length;
  const doneCount = items.filter((item) => item.done).length;

  async function toggleDone(item: Item) {
    try {
      await setItemDone(db, item.id, !item.done);
      await rescheduleAll(db);
      await reload();
      Haptics.notificationAsync(
        item.done
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    } catch {
      Alert.alert('Gagal menyimpan', 'Perubahan tugas tidak bisa disimpan. Coba lagi.');
    }
  }

  async function enableNotifications() {
    const granted = await notifications.request();
    if (granted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await rescheduleAll(db);
      if (!settings.setupGuideSeen) {
        await markGuideSeen();
        router.push('/guide');
      }
      return;
    }
    Alert.alert(
      'Izin notifikasi belum aktif',
      'Tanpa izin ini, pengingat tidak akan muncul. Kamu bisa mengaktifkannya dari pengaturan aplikasi.',
      [
        { text: 'Nanti', style: 'cancel' },
        {
          text: 'Buka pengaturan',
          onPress: () => {
            Linking.openSettings().catch(() => undefined);
          },
        },
      ],
    );
  }

  return (
    <Screen
      scroll
      tabScreen
      floating={
        <FloatingActionButton
          accessibilityLabel="Tambah tugas"
          label="Tugas"
          onPress={() =>
            router.push({ pathname: '/item/[id]', params: { id: 'new', type: 'task' } })
          }
        />
      }>
      <PageHeader
        eyebrow="myReminder"
        title="Tugas"
        subtitle={formatTodayTitle(now)}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tambah tugas"
            onPress={() =>
              router.push({ pathname: '/item/[id]', params: { id: 'new', type: 'task' } })
            }
            style={({ pressed }) => [
              styles.headerAction,
              {
                backgroundColor: theme.colors.primarySoft,
                opacity: pressed ? 0.65 : 1,
              },
            ]}>
            <Ionicons name="add" size={22} color={theme.colors.primary} />
          </Pressable>
        }
      />

      {notifications.granted === false ? (
        <Card style={{ marginBottom: theme.spacing.lg }} accent={theme.colors.warning}>
          <View style={styles.permissionRow}>
            <View
              style={[styles.permissionIcon, { backgroundColor: theme.colors.warningSoft }]}>
              <Ionicons name="notifications-off-outline" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.permissionText}>
              <AppText variant="subheading">Notifikasi belum aktif</AppText>
              <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                Aktifkan agar pengingat muncul tepat waktu.
              </AppText>
            </View>
          </View>
          <Button
            label="Aktifkan notifikasi"
            icon="notifications-outline"
            size="sm"
            onPress={enableNotifications}
            style={{ marginTop: theme.spacing.md }}
          />
        </Card>
      ) : null}

      <Card padding="sm" style={styles.heroCard}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroGradient, { borderRadius: theme.radius.lg - 2 }]}>
          <View
            style={[
              styles.heroCircle,
              { backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.12)' },
            ]}
          />
          <View
            style={[
              styles.heroCircleSmall,
              { backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)' },
            ]}
          />
          <AppText
            variant="micro"
            style={[styles.heroEyebrow, { color: theme.colors.onPrimary }]}>
            RINGKASAN HARI INI
          </AppText>
          <View style={styles.heroCountRow}>
            <AppText variant="display" style={{ color: theme.colors.onPrimary }}>
              {activeCount}
            </AppText>
            <AppText
              variant="small"
              style={{ color: theme.colors.onPrimary, marginLeft: 8, marginBottom: 5, opacity: 0.8 }}>
              tugas aktif
            </AppText>
          </View>
          <View style={styles.heroStats}>
            <HeroStat label="Hari ini" value={todayCount} />
            <HeroStat label="Terlambat" value={overdueCount} />
            <HeroStat label="Selesai" value={doneCount} />
          </View>
        </LinearGradient>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={{ marginTop: theme.spacing.xl }}>
        {FILTERS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={filter === option.value}
            onPress={() => setFilter(option.value)}
          />
        ))}
      </ScrollView>

      <View style={{ marginTop: theme.spacing.lg }}>
        {visible.length === 0 ? (
          <EmptyState
            icon={filter === 'done' ? 'checkmark-circle-outline' : 'sparkles-outline'}
            title={
              filter === 'done'
                ? 'Belum ada yang selesai'
                : filter === 'active'
                  ? 'Tidak ada tugas aktif'
                  : 'Belum ada tugas'
            }
            description={
              filter === 'done'
                ? 'Tugas yang kamu centang akan muncul di sini.'
                : 'Tambahkan tugas pertama, lalu atur pengingatnya sesuai kebutuhanmu.'
            }
            actionLabel={filter === 'done' ? undefined : 'Tambah tugas'}
            onAction={
              filter === 'done'
                ? undefined
                : () =>
                    router.push({
                      pathname: '/item/[id]',
                      params: { id: 'new', type: 'task' },
                    })
            }
          />
        ) : (
          visible.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              now={now}
              onPress={() =>
                router.push({ pathname: '/item/[id]', params: { id: item.id } })
              }
              onToggleDone={() => toggleDone(item)}
            />
          ))
        )}
      </View>

    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.heroStat,
        {
          backgroundColor:
            theme.mode === 'dark' ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.14)',
          borderRadius: theme.radius.sm,
        },
      ]}>
      <AppText variant="heading" style={{ color: theme.colors.onPrimary }}>
        {value}
      </AppText>
      <AppText variant="micro" style={{ color: theme.colors.onPrimary, opacity: 0.76 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  permissionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  permissionText: { flex: 1 },
  heroCard: { overflow: 'hidden' },
  heroGradient: { padding: 18, overflow: 'hidden' },
  heroEyebrow: { letterSpacing: 1.1, opacity: 0.78 },
  heroCountRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroStat: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
  heroCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -46,
    top: -58,
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    right: 58,
    bottom: -30,
  },
  filters: { gap: 8, paddingRight: 20 },
});
