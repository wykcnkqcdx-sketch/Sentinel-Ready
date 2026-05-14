import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AlertType = 'warning' | 'info' | 'alert';

interface AlertCardProps {
  type?: AlertType;
  title: string;
  description: string;
}

export default function AlertCard({ type = 'info', title, description }: AlertCardProps) {
  const cardStyles = [
    styles.card,
    type === 'warning' && styles.warningCard,
    type === 'alert' && styles.alertCard,
  ];

  return (
    <View style={cardStyles}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.text, type === 'alert' && styles.alertText]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#171509',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4b4523',
  },
  warningCard: {
    backgroundColor: '#12190a',
    borderColor: '#4b5423',
  },
  alertCard: {
    backgroundColor: '#12180d',
    borderColor: '#394323',
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  text: {
    color: '#d7dfc9',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  alertText: {
    color: '#b8bfae',
  },
});