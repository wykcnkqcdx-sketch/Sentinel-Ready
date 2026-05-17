import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type RuckDisplayMode = 'simple' | 'mission' | 'map';

const OPTIONS: { key: RuckDisplayMode; label: string }[] = [
  { key: 'simple', label: 'SIMPLE' },
  { key: 'mission', label: 'MISSION' },
  { key: 'map', label: 'MAP' },
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
            accessibilityLabel={`${option.label} display mode`}
            accessibilityState={{ selected: active }}
          >
            {active && <View style={styles.activeBar} />}
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
    backgroundColor: 'rgba(5,14,9,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#172c20',
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  buttonActive: {},
  activeBar: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#91e6a3',
    borderRadius: 1,
  },
  label: {
    color: '#3a6b46',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  labelActive: {
    color: '#91e6a3',
  },
});
