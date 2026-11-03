import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Ionicons } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Divider } from '@/components/ui/text-field';
import { useDatabase } from '@/db/DatabaseProvider';
import { countItemsByType, seedDemoData } from '@/db/items';
import { resetDatabase } from '@/db/database';
import { formatShortDate, formatTime } from '@/domain/format';
import type { ItemType } from '@/domain/types';
import { useNotificationPermissions } from '@/hooks/use-notification-permissions';
import {
  cancelAllNotifications,
  listScheduledNotifications,
  rescheduleAll,
  scheduleTestNotification,
  type ScheduledNotificationSummary,
} from '@/notifications/scheduler';
import { CHANNEL_ID } from '@/notifications/constants';
import { useTheme } from '@/theme';

interface DebugState {
  counts: Record<ItemType, number>;
  scheduled: ScheduledNotificationSummary[];
  channelName: string | null;
  channelImportance: number | null;
  schemaVersion: number | null;
}

const EMPTY_STATE: DebugState = {
  counts: { task: 0, event: 0, class: 0 },
  scheduled: [],
  channelName: null,
  channelImportance: null,
  schemaVersion: null,
};

export default function DebugScreen() {
  const theme = useTheme();
  const db = useDatabase();
  const permissions = useNotificationPermissions();
  const [state, setState] = useState<DebugState>(EMPTY_STATE);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [counts, scheduled, channel, version] = await Promise.all([
      countItemsByType(db),
      listScheduledNotifications(),
      Notifications.getNotificationChannelAsync(CHANNEL_ID).catch(() => null),
      db.getFirstAsync<{ user_version: number }>('PRAGMA user_version').catch(() => null),
    ]);
    setState({
      counts,
      scheduled,
      channelName: channel?.name ?? null,
      channelImportance: channel?.importance ?? null,
      schemaVersion: version?.user_version ?? null,
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  async function rebuild() {
    setBusy(true);
    try {
      const result = await rescheduleAll(db);
      await refresh();
      Alert.alert(
        'Jadwal dibangun ulang',
        result.hasPermission
          ? `${result.scheduled} notifikasi dijadwalkan, ${result.skipped} dilewati karena batas, ${result.failed} gagal.`
          : 'Izin notifikasi belum aktif, jadi belum ada yang dijadwalkan.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function testNotification() {
    const id = await scheduleTestNotification(10);
    await refresh();
    Alert.alert(
      id ? 'Tes dijadwalkan' : 'Izin belum aktif',
      id
        ? 'Notifikasi tes akan muncul sekitar 10 detik lagi.'
        : 'Aktifkan izin notifikasi terlebih dahulu dari Pengaturan.',
    );
  }

  async function addDemo() {
    setBusy(true);
    try {
      const count = await seedDemoData(db);
      await rescheduleAll(db);
      await refresh();
      Alert.alert('Data contoh dimuat', `${count} item contoh ditambahkan atau diperbarui.`);
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteAll() {
    Alert.alert(
      'Hapus semua data?',
      'Semua tugas, acara, mapel, dan pengaturan akan dihapus dari HP ini. Tindakan ini tidak bisa dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus semua',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await resetDatabase(db);
              await rescheduleAll(db);
              await refresh();
              Alert.alert('Data dihapus', 'Database sudah kosong dan pengaturan kembali ke awal.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  function confirmCancelAll() {
    Alert.alert('Batalkan semua jadwal?', 'Notifikasi yang sudah dijadwalkan akan dihapus sampai kamu membangun ulang.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Batalkan',
        style: 'destructive',
        onPress: async () => {
          await cancelAllNotifications();
          await refresh();
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <PageHeader
        back
        eyebrow="Diagnostik"
        title="Status aplikasi"
        subtitle="Halaman ini hanya untuk memeriksa data dan penjadwalan lokal."
      />

      <SectionHeader title="Izin & channel" />
      <Card style={{ marginBottom: theme.spacing.xl }}>
        <StatusLine
          icon="notifications-outline"
          label="Izin notifikasi"
          value={permissions.granted ? 'Aktif' : 'Belum aktif'}
          tone={permissions.granted ? 'success' : 'warning'}
        />
        <Divider style={{ marginVertical: 10 }} />
        <StatusLine
          icon="alarm-outline"
          label="Alarm presisi"
          value={permissions.exactAlarm ? 'Aktif' : 'Terbatas'}
          tone={permissions.exactAlarm ? 'success' : 'warning'}
        />
        <Divider style={{ marginVertical: 10 }} />
        <StatusLine
          icon="radio-outline"
          label="Channel"
          value={
            state.channelName
              ? `${state.channelName} · penting ${state.channelImportance ?? '?'}`
              : 'Belum dibuat'
          }
          tone={state.channelName ? 'success' : 'neutral'}
        />
        <Divider style={{ marginVertical: 10 }} />
        <StatusLine
          icon="server-outline"
          label="Skema database"
          value={`v${state.schemaVersion ?? '?'}`}
          tone="neutral"
        />
        <Button
          label={permissions.granted ? 'Buka pengaturan sistem' : 'Aktifkan izin'}
          icon="settings-outline"
          size="sm"
          variant="secondary"
          onPress={() => router.push('/guide')}
          style={{ marginTop: 12 }}
        />
      </Card>

      <SectionHeader title="Data lokal" />
      <Card style={{ marginBottom: theme.spacing.xl }}>
        <View style={styles.countRow}>
          <Count label="Tugas" value={state.counts.task} />
          <Count label="Acara" value={state.counts.event} />
          <Count label="Mapel" value={state.counts.class} />
        </View>
        <Divider style={{ marginVertical: 12 }} />
        <Button
          label="Muat data contoh"
          icon="flask-outline"
          size="sm"
          variant="secondary"
          onPress={addDemo}
          disabled={busy}
        />
        <Button
          label="Hapus semua data"
          icon="trash-outline"
          size="sm"
          variant="danger"
          onPress={confirmDeleteAll}
          disabled={busy}
          style={{ marginTop: 8 }}
        />
      </Card>

      <SectionHeader title={`Jadwal aktif (${state.scheduled.length})`} />
      <Card style={{ marginBottom: theme.spacing.xl }} padding="sm">
        {state.scheduled.length === 0 ? (
          <View style={styles.emptyScheduled}>
            <Ionicons name="notifications-off-outline" size={22} color={theme.colors.textMuted} />
            <AppText variant="small" color="textSecondary" style={{ marginTop: 8 }}>
              Tidak ada notifikasi terjadwal.
            </AppText>
          </View>
        ) : (
          state.scheduled.slice(0, 30).map((item, index) => (
            <View key={item.id}>
              <View style={styles.scheduledRow}>
                <View style={styles.scheduledText}>
                  <AppText variant="label" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {item.body}
                  </AppText>
                </View>
                <AppText variant="micro" color="textMuted">
                  {item.at ? `${formatShortDate(item.at)} · ${formatTime(item.at)}` : '—'}
                </AppText>
              </View>
              {index < Math.min(state.scheduled.length, 30) - 1 ? (
                <Divider style={{ marginVertical: 8 }} />
              ) : null}
            </View>
          ))
        )}
        {state.scheduled.length > 30 ? (
          <AppText variant="caption" color="textMuted" style={{ marginTop: 10 }}>
            Menampilkan 30 dari {state.scheduled.length} jadwal.
          </AppText>
        ) : null}
        <Divider style={{ marginVertical: 12 }} />
        <View style={styles.actions}>
          <Button
            label="Bangun ulang"
            icon="refresh-outline"
            size="sm"
            onPress={rebuild}
            disabled={busy}
          />
          <Button
            label="Tes 10 detik"
            icon="paper-plane-outline"
            size="sm"
            variant="secondary"
            onPress={testNotification}
            disabled={busy}
          />
          <Button
            label="Batalkan semua"
            icon="close-circle-outline"
            size="sm"
            variant="danger"
            onPress={confirmCancelAll}
            disabled={busy}
          />
        </View>
      </Card>

      <Card>
        <AppText variant="subheading">Cara membaca halaman ini</AppText>
        <AppText variant="small" color="textSecondary" style={{ marginTop: 6 }}>
          Jadwal hanya berisi 7 hari ke depan. Kalau daftar kosong padahal ada item, periksa izin
          notifikasi lalu tekan “Bangun ulang”. Mode libur juga menyembunyikan notifikasi mapel.
        </AppText>
      </Card>

      <Button
        label="Kembali ke pengaturan"
        variant="ghost"
        onPress={() => router.back()}
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
      />
    </Screen>
  );
}

function StatusLine({
  icon,
  label,
  value,
  tone,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const theme = useTheme();
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Ionicons name={icon} size={17} color={theme.colors.textSecondary} />
      </View>
      <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Badge label={value} tone={tone} />
    </View>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.countCard, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="micro" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countRow: { flexDirection: 'row', gap: 8 },
  countCard: { flex: 1, padding: 10, alignItems: 'center' },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduledText: { flex: 1 },
  emptyScheduled: { alignItems: 'center', paddingVertical: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
