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
  card: { backgroundColor: 'rgba(74,158,255,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(74,158,255,0.25)' },
  warningCard: { backgroundColor: 'rgba(245,166,35,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)' },
  alertCard: { backgroundColor: 'rgba(255,69,58,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,69,58,0.25)' },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  warningTitle: { color: '#F5A623', fontSize: 15, fontWeight: '900' },
  alertTitle: { color: '#FF453A', fontSize: 15, fontWeight: '900' },
  text: { color: '#A7ADB8', fontSize: 13, lineHeight: 20, marginTop: 6 },
  warningText: { color: '#A7ADB8', fontSize: 13, lineHeight: 20, marginTop: 6 },
  alertText: { color: '#A7ADB8', fontSize: 13, lineHeight: 20, marginTop: 6 },
});
