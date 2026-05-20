import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RuckMapActionButtonsProps {
  onLayers: () => void;
  onLocate: () => void;
  onTerrain: () => void;
  onCreateRoute: () => void;
}

export function RuckMapActionButtons({
  onLayers,
  onLocate,
  onTerrain,
  onCreateRoute,
}: RuckMapActionButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={onLayers}
        accessibilityRole="button"
        accessibilityLabel="Map layers"
      >
        <Text style={styles.buttonIcon}>⊞</Text>
        <Text style={styles.buttonLabel}>LAYERS</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={onLocate}
        accessibilityRole="button"
        accessibilityLabel="Locate current position"
      >
        <Text style={styles.buttonIcon}>◎</Text>
        <Text style={styles.buttonLabel}>LOCATE</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={onTerrain}
        accessibilityRole="button"
        accessibilityLabel="3D terrain view"
      >
        <Text style={styles.buttonIcon}>△</Text>
        <Text style={styles.buttonLabel}>3D</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.createButton]}
        onPress={onCreateRoute}
        accessibilityRole="button"
        accessibilityLabel="Create new route"
      >
        <Text style={styles.createIcon}>+</Text>
        <Text style={styles.createLabel}>CREATE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    top: '35%',
    gap: 6,
  },
  button: {
    width: 46,
    height: 46,
    backgroundColor: 'rgba(5,14,9,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  buttonIcon: {
    color: '#FC4C02',
    fontSize: 14,
    lineHeight: 16,
  },
  buttonLabel: {
    color: '#A7ADB8',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  createButton: {
    borderColor: '#FC4C02',
    backgroundColor: '#163d22',
    marginTop: 6,
  },
  createIcon: {
    color: '#FC4C02',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  createLabel: {
    color: '#FC4C02',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
