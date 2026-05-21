import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AlertType = 'warning' | 'info' | 'alert';

interface AlertCardProps {
  type?: AlertType;
  title: string;
  description: string;
}

export default function AlertCard({ type = 'info', title, description }: AlertCardProps) {
  const accentColor =
    type === 'alert' ? '#e05050'
    : type === 'warning' ? '#ffaa44'
    : '#1A74D4';

  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
      <Text style={styles.text}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c1008',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.15)',
    borderLeftWidth: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  text: {
    color: '#b8c0b0',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
});
