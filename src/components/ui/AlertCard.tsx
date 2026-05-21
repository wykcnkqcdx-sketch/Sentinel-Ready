import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AlertType = 'warning' | 'info' | 'alert';

interface AlertCardProps {
  type?: AlertType;
  title: string;
  description: string;
}

export default function AlertCard({ type = 'info', title, description }: AlertCardProps) {
  const cardStyle =
    type === 'alert' ? styles.alertCard
    : type === 'warning' ? styles.warningCard
    : styles.card;

  const titleStyle =
    type === 'alert' ? styles.alertTitle
    : type === 'warning' ? styles.warningTitle
    : styles.title;

  const textStyle =
    type === 'alert' ? styles.alertText
    : type === 'warning' ? styles.warningText
    : styles.text;

  return (
    <View style={cardStyle}>
      <Text style={titleStyle}>{title}</Text>
      <Text style={textStyle}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(26,116,212,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(26,116,212,0.25)' },
  warningCard: { backgroundColor: 'rgba(212,160,26,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(212,160,26,0.25)' },
  alertCard: { backgroundColor: 'rgba(204,42,42,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(204,42,42,0.25)' },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  warningTitle: { color: '#D4A01A', fontSize: 15, fontWeight: '900' },
  alertTitle: { color: '#CC2A2A', fontSize: 15, fontWeight: '900' },
  text: { color: '#8FAEC8', fontSize: 13, lineHeight: 20, marginTop: 6 },
  warningText: { color: '#8FAEC8', fontSize: 13, lineHeight: 20, marginTop: 6 },
  alertText: { color: '#8FAEC8', fontSize: 13, lineHeight: 20, marginTop: 6 },
});
