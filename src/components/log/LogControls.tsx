import { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TrainingFilter, SortMode, filters, sortModes } from '@/src/utils/trainingLogUtils';

type Props = {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  activeFilter: TrainingFilter;
  onFilterChange: (filter: TrainingFilter) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onClear: () => void;
  visibleCount: number;
  totalCount: number;
  showWeakLogsOnly: boolean;
};

const LogControls = memo(function LogControls({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  sortMode,
  onSortChange,
  onClear,
  visibleCount,
  totalCount,
  showWeakLogsOnly,
}: Props) {
  const isDirty = searchQuery !== '' || activeFilter !== 'All' || sortMode !== 'Newest' || showWeakLogsOnly;

  return (
    <View style={styles.controlsCard}>
      <View style={styles.controlsHeader}>
        <View>
          <Text style={styles.controlsKicker}>MANAGE LOGS</Text>
          <Text style={styles.controlsTitle}>Search, Filter and Sort</Text>
        </View>

        {isDirty ? (
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder="Search date, ruck, run, notes, load..."
        placeholderTextColor="#6f7d70"
      />

      <Text style={styles.controlLabel}>Filter</Text>
      <View style={styles.chipRow}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={activeFilter === filter ? styles.chipActive : styles.chip}
            onPress={() => onFilterChange(filter)}
          >
            <Text style={activeFilter === filter ? styles.chipTextActive : styles.chipText}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.controlLabel}>Sort</Text>
      <View style={styles.chipRow}>
        {sortModes.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={sortMode === mode ? styles.sortChipActive : styles.sortChip}
            onPress={() => onSortChange(mode)}
          >
            <Text style={sortMode === mode ? styles.sortChipTextActive : styles.sortChipText}>
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.resultCount}>
        Showing {visibleCount} of {totalCount} logs {showWeakLogsOnly ? '· Weak logs only' : ''}
      </Text>
    </View>
  );
});

export default LogControls;

const styles = StyleSheet.create({
  controlsCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 10 },
  controlsHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  controlsKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  controlsTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginTop: 3 },
  clearButton: { borderWidth: 1, borderColor: 'rgba(181,133,44,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  clearButtonText: { color: '#c8f7d0', fontSize: 12, fontWeight: '900' },
  searchInput: { backgroundColor: '#080c05', borderWidth: 1, borderColor: 'rgba(181,133,44,0.18)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 11, color: '#ffffff', fontSize: 14 },
  controlLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: 'rgba(181,133,44,0.18)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  chipActive: { backgroundColor: '#B5852C', borderWidth: 1, borderColor: '#B5852C', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#080c05', fontSize: 12, fontWeight: '900' },
  sortChip: { borderWidth: 1, borderColor: 'rgba(181,133,44,0.18)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  sortChipActive: { backgroundColor: '#1e3a27', borderWidth: 1, borderColor: '#B5852C', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  sortChipText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  sortChipTextActive: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  resultCount: { color: '#b8c0b0', fontSize: 12, fontWeight: '800' },
});
