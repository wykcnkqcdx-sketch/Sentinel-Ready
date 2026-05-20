import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SentinelCardProps = {
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
};

export default function SentinelCard({
  title,
  children,
  variant = 'default',
}: SentinelCardProps) {
  return (
    <View style={[styles.card, styles[variant]]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  default: {
    backgroundColor: '#00253D',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  warning: {
    backgroundColor: 'rgba(212,160,26,0.08)',
    borderColor: 'rgba(212,160,26,0.25)',
  },
  success: {
    backgroundColor: 'rgba(94,122,47,0.08)',
    borderColor: 'rgba(94,122,47,0.25)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  body: {
    gap: 8,
  },
});
