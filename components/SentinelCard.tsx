import { SentinelTheme } from '@/constants/sentinel-theme';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

type SentinelCardProps = ViewProps & {
  children: React.ReactNode;
};

export function SentinelCard({ children, style, ...props }: SentinelCardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SentinelTheme.colours.card,
    borderColor: SentinelTheme.colours.border,
    borderWidth: 1,
    borderRadius: SentinelTheme.radius.lg,
    padding: SentinelTheme.spacing.lg,
    marginBottom: SentinelTheme.spacing.md,
  },
});