import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { mapLayerOptions } from '../../utils/mapTiles';
import type { MapLayerKey } from '../../utils/mapTiles';

export interface MapLayerPickerProps {
  activeLayer: MapLayerKey;
  onSelect: (layer: MapLayerKey) => void;
}

export function MapLayerPicker({ activeLayer, onSelect }: MapLayerPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {mapLayerOptions.map(({ key, label }) => {
        const isActive = key === activeLayer;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onSelect(key)}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
            accessibilityRole="button"
            accessibilityLabel={`${label} map layer`}
            accessibilityState={{ selected: isActive }}
          >
            {isActive && <Text style={styles.activeTag}>●  </Text>}
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: 'rgba(0,80,40,0.5)',
    borderColor: '#235c32',
  },
  chipInactive: {
    backgroundColor: 'rgba(5,14,9,0.7)',
    borderColor: '#172c20',
  },
  activeTag: {
    color: '#91e6a3',
    fontSize: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  labelActive: { color: '#91e6a3' },
  labelInactive: { color: '#5a8c5c' },
});
