import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { AppText, Ionicons } from './app-text';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  tabScreen?: boolean;
  floating?: ReactNode;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  contentContainerStyle,
  style,
  tabScreen = false,
  floating,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const horizontal = padded ? theme.spacing.lg : 0;
  const bottom = tabScreen ? theme.spacing.xl : Math.max(insets.bottom, theme.spacing.lg);

  if (scroll) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.flex, { backgroundColor: theme.colors.background }, style]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            {
              paddingHorizontal: horizontal,
              paddingBottom: bottom + theme.spacing.xxxl,
            },
            contentContainerStyle,
          ]}>
          {children}
        </ScrollView>
        {floating}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: theme.colors.background }, style]}>
      <View
        style={[
          styles.flex,
          { paddingHorizontal: horizontal, paddingBottom: bottom },
          contentContainerStyle,
        ]}>
        {children}
      </View>
      {floating}
    </SafeAreaView>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, back = false, right, eyebrow }: PageHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.header, { paddingTop: theme.spacing.md }]}>
      <View style={styles.headerTop}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}>
            <Ionicons name="chevron-back" size={21} color={theme.colors.text} />
          </Pressable>
        ) : null}

        <View style={styles.headerText}>
          {eyebrow ? (
            <AppText variant="micro" color="textMuted" style={styles.eyebrow}>
              {eyebrow.toUpperCase()}
            </AppText>
          ) : null}
          <AppText variant="title" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  headerRight: { marginLeft: 12, paddingTop: 2 },
  eyebrow: { letterSpacing: 1.1, marginBottom: 6 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
});
