import { tokens as T } from '@/src/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SentinelCardProps = {
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
};

const ACCENT: Record<string, string> = {
  default: T.textAccent,
  warning: T.accentWarnBright,
  success: '#3fc8e4',
};

export default function SentinelCard({ title, children, variant = 'default' }: SentinelCardProps) {
  const accent = ACCENT[variant];
  return (
    <View style={[styles.card, cardVariant[variant]]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.inner}>
        {title ? (
          <>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title.toUpperCase()}</Text>
              <View style={[styles.cornerBracket, { borderColor: accent }]} />
            </View>
            <View style={[styles.divider, { backgroundColor: accent + '22' }]} />
          </>
        ) : null}
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    flexShrink: 0,
  },
  inner: {
    flex: 1,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: T.textPrimaryDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cornerBracket: {
    width: 14,
    height: 14,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderRadius: 0,
    opacity: 0.6,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  body: { gap: 8 },
});

const cardVariant = StyleSheet.create({
  default: { backgroundColor: T.bgPanelAlt, borderColor: T.borderDim },
  warning: { backgroundColor: '#160e08', borderColor: T.borderWarnMedium },
  success: { backgroundColor: '#08141a', borderColor: '#1a3d50' },
});
