import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RuckRouteSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSavedRoutes: () => void;
}

export function RuckRouteSearchBar({ value, onChangeText, onSavedRoutes }: RuckRouteSearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>◈</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="SEARCH ROUTES"
          placeholderTextColor="#4a5a44"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search routes"
        />
        <TouchableOpacity
          style={styles.savedButton}
          onPress={onSavedRoutes}
          accessibilityRole="button"
          accessibilityLabel="Saved routes"
        >
          <Text style={styles.savedButtonText}>SAVED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12,16,8,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.3)',
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    width: 20,
    alignItems: 'center',
  },
  searchIconText: {
    color: '#B5852C',
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    height: 44,
    padding: 0,
  },
  savedButton: {
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.35)',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  savedButtonText: {
    color: '#B5852C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
});
