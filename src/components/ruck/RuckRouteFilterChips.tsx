import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { RuckFilter } from '@/src/utils/ruckRouteUtils';
import { ROUTE_FILTERS } from '@/src/utils/ruckRouteUtils';

interface RuckRouteFilterChipsProps {
  activeFilter: RuckFilter;
  onFilterChange: (filter: RuckFilter) => void;
}

export function RuckRouteFilterChips({ activeFilter, onFilterChange }: RuckRouteFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {ROUTE_FILTERS.map((filter) => {
        const active = filter === activeFilter;
        return (
          <TouchableOpacity
            key={filter}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onFilterChange(filter)}
            accessibilityRole="button"
            accessibilityLabel={filter}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {filter.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(5,14,9,0.88)',
  },
  chipActive: {
    backgroundColor: '#163d22',
    borderColor: '#B5852C',
  },
  chipText: {
    color: '#8FAEC8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  chipTextActive: {
    color: '#B5852C',
  },
});
