import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { AppText, Ionicons, type IconName } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Divider } from '@/components/ui/text-field';
import { useDatabase } from '@/db/DatabaseProvider';
import { useNotificationPermissions } from '@/hooks/use-notification-permissions';
import { rescheduleAll, scheduleTestNotification } from '@/notifications/scheduler';
import { useTheme } from '@/theme';

interface Step {
  icon: IconName;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: 'notifications-outline',
    title: 'Izinkan notifikasi',
    body: 'Saat diminta, pilih “Izinkan”. Kalau pernah ditolak, buka pengaturan aplikasi dan aktifkan Notifikasi.',
  },
  {
    icon: 'alarm-outline',
    title: 'Izinkan alarm & pengingat',
    body: 'Di Android 12 ke atas, buka “Alarm & pengingat” lalu izinkan myReminder. Tanpa ini, notifikasi bisa terlambat.',
  },
  {
    icon: 'battery-half-outline',
    title: 'Jangan batasi baterai',
    body: 'Buka Info aplikasi → Baterai → pilih “Tidak dibatasi” atau “Izinkan aktivitas latar belakang”.',
  },
  {
    icon: 'rocket-outline',
    title: 'Aktifkan autostart',
    body: 'Di Realme/ColorOS: Pengaturan → Baterai → Peluncuran aplikasi → myReminder. Aktifkan autostart dan izinkan aktivitas latar belakang.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Kunci aplikasi di recent apps',
    body: 'Buka daftar aplikasi terakhir, tarik kartu myReminder ke bawah atau ketuk ikon kunci. Ini membantu ColorOS tidak menutup aplikasi.',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'Tampilkan di layar kunci',
    body: 'Buka Pengaturan → Notifikasi → myReminder → Layar kunci, lalu pilih “Tampilkan isi”. Tanpa ini notifikasi bisa masuk tetapi tidak terlihat selama HP masih terkunci.',
  },
  {
    icon: 'refresh-outline',
    title: 'Setelah HP restart',
    body: 'Alarm dipulihkan setelah HP pertama kali dibuka kunci, bukan saat masih di layar kunci. Kalau ada pengingat yang terlewat, buka myReminder sekali agar jadwal dibangun ulang dari database.',
  },
];

export default function GuideScreen() {
  const theme = useTheme();
  const db = useDatabase();
  const permissions = useNotificationPermissions();

  async function requestNotificationAccess(): Promise<boolean> {
    const granted = await permissions.request();
    if (!granted) {
      Alert.alert(
        'Izin belum aktif',
        'Aktifkan notifikasi dari pengaturan sistem agar pengingat bisa muncul.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Buka pengaturan', onPress: () => Linking.openSettings().catch(() => undefined) },
        ],
      );
      return false;
    }
    await rescheduleAll(db);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  }

  async function requestExactAccess() {
    const granted = await permissions.requestExact();
    if (!granted) {
      Alert.alert(
        'Alarm presisi belum aktif',
        'Buka pengaturan sistem dan izinkan Alarm & pengingat untuk myReminder.',
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
    try {
      const id = await scheduleTestNotification(10);
      if (!id) {
        const granted = await requestNotificationAccess();
        if (!granted) return;
        const retryId = await scheduleTestNotification(10);
        if (!retryId) return;
      }
      Alert.alert(
        'Tes dijadwalkan',
        'Kunci HP sekarang. Notifikasi tes akan muncul sekitar 10 detik lagi.',
      );
    } catch {
      Alert.alert('Gagal menjadwalkan tes', 'Coba periksa izin notifikasi lalu ulangi.');
    }
  }

  return (
    <Screen scroll>
      <PageHeader
        back
        eyebrow="Panduan"
        title="Agar pengingat tidak telat"
        subtitle="Android bisa menunda notifikasi kalau aplikasi dibatasi. Ikuti langkah berikut sekali saja."
      />

      <Card style={{ marginBottom: theme.spacing.xl }}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <AppText variant="micro" color="textMuted">
              NOTIFIKASI
            </AppText>
            <Badge
              label={permissions.granted ? 'Aktif' : 'Belum aktif'}
              tone={permissions.granted ? 'success' : 'warning'}
              style={{ marginTop: 6 }}
            />
          </View>
          {Platform.OS === 'android' ? (
            <View style={styles.statusItem}>
              <AppText variant="micro" color="textMuted">
                ALARM PRESISI
              </AppText>
              <Badge
                label={permissions.exactAlarm ? 'Aktif' : 'Terbatas'}
                tone={permissions.exactAlarm ? 'success' : 'warning'}
                style={{ marginTop: 6 }}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.statusActions}>
          {!permissions.granted ? (
            <Button
              label="Izinkan notifikasi"
              icon="notifications-outline"
              size="sm"
              onPress={requestNotificationAccess}
            />
          ) : null}
          {Platform.OS === 'android' && !permissions.exactAlarm ? (
            <Button
              label="Izinkan alarm"
              icon="alarm-outline"
              size="sm"
              variant="secondary"
              onPress={requestExactAccess}
            />
          ) : null}
        </View>
      </Card>

      <Card padding="sm">
        {STEPS.map((step, index) => (
          <View key={step.title}>
            <View style={styles.step}>
              <View
                style={[
                  styles.stepIcon,
                  { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
                ]}>
                <Ionicons name={step.icon} size={19} color={theme.colors.primary} />
              </View>
              <View style={styles.stepText}>
                <View style={styles.stepTitleRow}>
                  <AppText variant="micro" color="primary">
                    LANGKAH {index + 1}
                  </AppText>
                  <AppText variant="subheading" style={{ marginTop: 2 }}>
                    {step.title}
                  </AppText>
                </View>
                <AppText variant="small" color="textSecondary" style={{ marginTop: 5 }}>
                  {step.body}
                </AppText>
              </View>
            </View>
            {index < STEPS.length - 1 ? (
              <Divider style={{ marginLeft: 50, marginVertical: theme.spacing.sm }} />
            ) : null}
          </View>
        ))}
      </Card>

      <View
        style={[
          styles.honestNote,
          { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
        ]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning} />
        <AppText variant="caption" style={{ color: theme.colors.warning, flex: 1 }}>
          Tidak ada aplikasi yang bisa menjamin notifikasi 100% jika Android mematikan aplikasi.
          Pengaturan di atas adalah cara paling andal untuk HP pribadi.
        </AppText>
      </View>

      <Button
        label="Kirim notifikasi tes"
        icon="paper-plane-outline"
        onPress={sendTest}
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
      />
      <Button
        label="Buka pengaturan aplikasi"
        icon="settings-outline"
        variant="secondary"
        onPress={() => Linking.openSettings().catch(() => undefined)}
        fullWidth
        style={{ marginTop: theme.spacing.sm }}
      />
      <Button
        label="Lihat diagnostik"
        icon="bug-outline"
        variant="ghost"
        onPress={() => router.push('/debug')}
        fullWidth
        style={{ marginTop: theme.spacing.sm }}
      />
      <Button
        label="Selesai"
        onPress={() => router.back()}
        variant="ghost"
        fullWidth
        style={{ marginTop: theme.spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', gap: 28 },
  statusItem: { flex: 1 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 6 },
  stepIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1 },
  stepTitleRow: { flex: 1 },
  honestNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    marginTop: 16,
  },
});
