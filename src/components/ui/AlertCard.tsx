import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AlertType = 'warning' | 'info' | 'alert';

interface AlertCardProps {
  type?: AlertType;
  title: string;
  description: string;
}

const CONFIG = {
  alert: { bg: '#140a06', border: '#6b2c14', bar: '#e05050', tag: 'ALERT', tagColor: '#e05050' },
  warning: { bg: '#12100600', border: '#5a3a10', bar: '#ffaa44', tag: 'WARN', tagColor: '#ffaa44' },
  info: { bg: '#070e0a', border: '#1c3828', bar: '#91e6a3', tag: 'INFO', tagColor: '#91e6a3' },
};

export default function AlertCard({ type = 'info', title, description }: AlertCardProps) {
  const cfg = CONFIG[type];
  return (
    <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.accentBar, { backgroundColor: cfg.bar }]} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.tag, { color: cfg.tagColor, borderColor: cfg.tagColor + '44' }]}>
            {cfg.tag}
          </Text>
          <Text style={[styles.title, { color: cfg.tagColor }]}>{title}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
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
  content: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  description: {
    color: '#7a9480',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
