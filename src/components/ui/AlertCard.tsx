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
  card: { backgroundColor: '#171509', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#4b4523' },
  warningCard: { backgroundColor: '#1a1608', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#6b5020' },
  alertCard: { backgroundColor: '#1a0f09', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#7a3a1f' },
  title: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  warningTitle: { color: '#f0c070', fontSize: 17, fontWeight: '900' },
  alertTitle: { color: '#ffb86b', fontSize: 17, fontWeight: '900' },
  text: { color: '#d7dfc9', fontSize: 14, lineHeight: 21, marginTop: 8 },
  warningText: { color: '#c8a070', fontSize: 14, lineHeight: 21, marginTop: 8 },
  alertText: { color: '#c8a070', fontSize: 14, lineHeight: 21, marginTop: 8 },
});