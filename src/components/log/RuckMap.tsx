import { Colors } from '@/constants/theme';
import type { RouteData } from '@/src/utils/trainingLogUtils';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RuckMapProps {
  route: RouteData;
  colorScheme: 'light' | 'dark';
}

const RuckMap = memo(function RuckMap({ route, colorScheme }: RuckMapProps) {
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.mapBackground }]}>
      <Text style={{ color: theme.text }}>Map rendering is optimised for Web (PWA).</Text>
    </View>
  );
});

export default RuckMap;

const styles = StyleSheet.create({
  container: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});