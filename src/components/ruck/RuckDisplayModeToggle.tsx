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
    backgroundColor: 'rgba(15,17,21,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#18231c',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#172c20',
    backgroundColor: 'rgba(5,14,9,0.72)',
    position: 'relative',
  },
  buttonActive: {
    borderColor: '#FC4C02',
    backgroundColor: 'rgba(252,76,2,0.18)',
  },
  activeBar: {
    display: 'none',
    height: 0,
    backgroundColor: '#FC4C02',
  },
  label: {
    color: '#5a8c5c',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  labelActive: {
    color: '#FC4C02',
  },
});
