import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type RuckDisplayMode = 'simple' | 'mission' | 'map';

const OPTIONS: { key: RuckDisplayMode; label: string }[] = [
  { key: 'simple', label: 'Simple' },
  { key: 'mission', label: 'Mission' },
  { key: 'map', label: 'Map' },
];

export function RuckDisplayModeToggle({
  mode,
  onChange,
}: {
  mode: RuckDisplayMode;
  onChange: (mode: RuckDisplayMode) => void;
}) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const active = option.key === mode;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.button, active && styles.buttonActive]}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} ruck display mode`}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(7,17,12,0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 4,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  buttonActive: {
    backgroundColor: '#FC4C02',
  },
  label: {
    color: '#A7ADB8',
    fontSize: 11,
    fontWeight: '900',
  },
  labelActive: {
    color: '#0F1115',
  },
});
