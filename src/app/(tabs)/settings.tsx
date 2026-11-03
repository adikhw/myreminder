import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { AppText, Ionicons } from '@/components/ui/app-text';
import { Badge, Chip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { PageHeader, Screen } from '@/components/ui/screen';
import { SettingRow, SwitchRow } from '@/components/ui/switch-row';
import { Divider } from '@/components/ui/text-field';
import { SNOOZE_MINUTES_OPTIONS } from '@/domain/constants';
import { useDatabase } from '@/db/DatabaseProvider';
import { useNotificationPermissions } from '@/hooks/use-notification-permissions';
import { rescheduleAll, scheduleTestNotification } from '@/notifications/scheduler';
import { useSettings } from '@/settings/SettingsProvider';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const db = useDatabase();
  const { settings, updateSnoozeMinutes, updateHolidayMode, markGuideSeen } = useSettings();
  const permissions = useNotificationPermissions();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function requestNotificationAccess() {
    const granted = await permissions.request();
    if (granted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await rescheduleAll(db);
      if (!settings.setupGuideSeen) {
        await markGuideSeen();
        router.push('/guide');
      }
      return;
    }
    openNotificationHelp();
  }

  async function requestExactAccess() {
    const granted = await permissions.requestExact();
    if (!granted) {
      Alert.alert(
        'Izin alarm presisi',
        'Buka pengaturan sistem, lalu izinkan "Alarm & pengingat" untuk myReminder agar notifikasi tidak meleset.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Buka pengaturan', onPress: () => Linking.openSettings().catch(() => undefined) },
        ],
      );
      return;
    }
    await rescheduleAll(db);
  }

  async function sendTest() {
    const id = await scheduleTestNotification(10);
    if (!id) {
      openNotificationHelp();
      return;
    }
    Alert.alert(
      'Tes dijadwalkan',
      'Notifikasi akan muncul sekitar 10 detik lagi. Kunci HP sebentar untuk memastikan notifikasi tampil.',
    );
  }

  async function selectSnooze(minutes: number) {
    await updateSnoozeMinutes(minutes);
    Haptics.selectionAsync().catch(() => undefined);
  }

  async function toggleHoliday(enabled: boolean) {
    await updateHolidayMode(enabled);
    Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <Screen scroll tabScreen>
      <PageHeader
        eyebrow="Preferensi"
        title="Pengaturan"
        subtitle="Atur pengingat, izin Android, dan panduan baterai."
      />

      <SectionHeader title="Notifikasi" />
      <Card style={{ marginBottom: theme.spacing.xl }}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
            ]}>
            <Ionicons name="notifications-outline" size={19} color={theme.colors.primary} />
          </View>
          <View style={styles.statusText}>
            <AppText variant="subheading">Izin notifikasi</AppText>
            <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
              {permissions.granted
                ? 'Pengingat boleh muncul di HP ini.'
                : 'Diperlukan agar pengingat bisa tampil.'}
            </AppText>
          </View>
          <Badge
            label={permissions.granted ? 'Aktif' : 'Belum'}
            tone={permissions.granted ? 'success' : 'warning'}
          />
        </View>

        {!permissions.granted && !permissions.loading ? (
          <Button
            label="Aktifkan notifikasi"
            icon="notifications-outline"
            size="sm"
            onPress={requestNotificationAccess}
            style={{ marginTop: theme.spacing.md }}
          />
        ) : null}

        {Platform.OS === 'android' ? (
          <>
            <Divider style={{ marginVertical: theme.spacing.md }} />
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor: permissions.exactAlarm
                      ? theme.colors.successSoft
                      : theme.colors.warningSoft,
                    borderRadius: theme.radius.md,
                  },
                ]}>
                <Ionicons
                  name="alarm-outline"
                  size={19}
                  color={permissions.exactAlarm ? theme.colors.success : theme.colors.warning}
                />
              </View>
              <View style={styles.statusText}>
                <AppText variant="subheading">Alarm presisi</AppText>
                <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  {permissions.exactAlarm
                    ? 'Notifikasi dijadwalkan tepat waktu.'
                    : 'Android bisa menunda notifikasi beberapa menit.'}
                </AppText>
              </View>
              <Badge
                label={permissions.exactAlarm ? 'Aktif' : 'Terbatas'}
                tone={permissions.exactAlarm ? 'success' : 'warning'}
              />
            </View>
            {!permissions.exactAlarm ? (
              <Button
                label="Izinkan alarm presisi"
                icon="alarm-outline"
                size="sm"
                variant="secondary"
                onPress={requestExactAccess}
                style={{ marginTop: theme.spacing.md }}
              />
            ) : null}
          </>
        ) : null}

        <Divider style={{ marginVertical: theme.spacing.md }} />
        <Button
          label="Kirim notifikasi tes (10 detik)"
          icon="paper-plane-outline"
          size="sm"
          variant="secondary"
          onPress={sendTest}
        />
      </Card>

      <SectionHeader title="Pengingat" />
      <Card style={{ marginBottom: theme.spacing.xl }}>
        <AppText variant="subheading">Durasi tunda</AppText>
        <AppText variant="caption" color="textSecondary" style={{ marginTop: 3 }}>
          Dipakai tombol “Tunda” pada notifikasi.
        </AppText>
        <View style={styles.chips}>
          {SNOOZE_MINUTES_OPTIONS.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} menit`}
              selected={settings.snoozeMinutes === minutes}
              onPress={() => selectSnooze(minutes)}
            />
          ))}
        </View>

        <Divider style={{ marginVertical: theme.spacing.md }} />
        <SwitchRow
          title="Mode libur"
          description="Jeda semua notifikasi mapel tanpa menghapus jadwal."
          icon="sunny-outline"
          value={settings.holidayMode}
          onValueChange={toggleHoliday}
        />
      </Card>

      <SectionHeader title="Bantuan" />
      <Card style={{ marginBottom: theme.spacing.xl }} padding="sm">
        <SettingRow
          title="Panduan pengaturan HP"
          description="Baterai, autostart, dan notifikasi Realme/Android."
          icon="book-outline"
          onPress={() => router.push('/guide')}
        />
        <Divider style={{ marginHorizontal: theme.spacing.md }} />
        <SettingRow
          title="Diagnostik"
          description="Cek izin, channel, dan jadwal notifikasi."
          icon="bug-outline"
          onPress={() => router.push('/debug')}
        />
      </Card>

      <SectionHeader title="Tentang" />
      <Card>
        <AboutRow label="Versi aplikasi" value={version} />
        <Divider style={{ marginVertical: theme.spacing.sm }} />
        <AboutRow label="Penyimpanan" value="Lokal (SQLite)" />
        <Divider style={{ marginVertical: theme.spacing.sm }} />
        <AboutRow label="Koneksi" value="100% offline" />
        <View
          style={[
            styles.privacyNote,
            { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
          ]}>
          <Ionicons name="shield-checkmark-outline" size={17} color={theme.colors.success} />
          <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
            Tidak ada akun, server, atau data yang dikirim keluar dari HP ini.
          </AppText>
        </View>
      </Card>

      <AppText
        variant="micro"
        color="textMuted"
        style={{ textAlign: 'center', marginTop: theme.spacing.xl }}>
        myReminder · dibuat untuk dipakai sendiri
      </AppText>
    </Screen>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.aboutRow}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="label" numberOfLines={1} style={{ maxWidth: 180 }}>
        {value}
      </AppText>
    </View>
  );
}

function openNotificationHelp() {
  Alert.alert(
    'Izin notifikasi belum aktif',
    'Aktifkan izin notifikasi untuk myReminder dari pengaturan sistem. Tanpa izin ini, pengingat tidak akan muncul.',
    [
      { text: 'Nanti', style: 'cancel' },
      { text: 'Buka pengaturan', onPress: () => Linking.openSettings().catch(() => undefined) },
    ],
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  statusText: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    marginTop: 14,
  },
});
