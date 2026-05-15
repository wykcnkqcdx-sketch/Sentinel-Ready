import { Colors } from '@/constants/theme';
import type { RouteData } from '@/src/utils/trainingLogUtils';
import React from 'react';
import { Text, View } from 'react-native';

interface RuckMapProps {
  route: RouteData;
  colorScheme: 'light' | 'dark';
}

export default function RuckMap({ route, colorScheme }: RuckMapProps) {
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ height: 300, backgroundColor: theme.mapBackground, justifyContent: 'center', alignItems: 'center', borderRadius: 12 }}>
      <Text style={{ color: theme.text }}>Map rendering is optimised for Web (PWA).</Text>
    </View>
  );
}