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
      {title ? (
        <>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <View style={styles.titleRule} />
        </>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderTopWidth: 2,
  },
  default: {
    backgroundColor: '#0c1008',
    borderColor: 'rgba(181,133,44,0.15)',
    borderTopColor: '#B5852C',
  },
  warning: {
    backgroundColor: 'rgba(255,170,68,0.06)',
    borderColor: 'rgba(255,170,68,0.25)',
    borderTopColor: '#ffaa44',
  },
  success: {
    backgroundColor: 'rgba(94,122,47,0.08)',
    borderColor: 'rgba(94,122,47,0.25)',
    borderTopColor: '#5E7A2F',
  },
  title: {
    color: '#b8c0b0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  titleRule: {
    height: 1,
    backgroundColor: 'rgba(181,133,44,0.35)',
    marginBottom: 12,
  },
  body: {
    gap: 8,
  },
});
