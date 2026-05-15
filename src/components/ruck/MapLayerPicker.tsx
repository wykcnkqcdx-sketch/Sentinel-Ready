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
            style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
            accessibilityRole="button"
            accessibilityLabel={`${label} map layer`}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillActive: {
    backgroundColor: '#3B82F6',
  },
  pillInactive: {
    backgroundColor: '#1e1e2e',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#ffffff',
  },
  labelInactive: {
    color: '#9ca3af',
  },
});
