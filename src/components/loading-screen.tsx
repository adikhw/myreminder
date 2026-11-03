import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme';

export function LoadingScreen({ label = 'Menyiapkan data…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.mark, { backgroundColor: theme.colors.primary }]}>
        <AppText variant="title" style={{ color: theme.colors.onPrimary }}>
          m
        </AppText>
      </View>
      <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
      <AppText variant="small" color="textSecondary" style={{ marginTop: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
