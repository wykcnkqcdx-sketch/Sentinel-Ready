import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RuckRoute } from '@/src/utils/ruckRouteUtils';
import {
  formatEstimatedTime,
  formatRouteDistance,
  formatRouteElevation,
  getDifficultyColor,
  getRiskColor,
} from '@/src/utils/ruckRouteUtils';

interface RuckRouteCardProps {
  route: RuckRoute;
  onStartRuck: (route: RuckRoute) => void;
}

export function RuckRouteCard({ route, onStartRuck }: RuckRouteCardProps) {
  const difficultyColor = getDifficultyColor(route.difficulty);
  const riskColor = getRiskColor(route.ruckRisk);

  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: difficultyColor }]} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.routeName}>{route.name}</Text>
            <View style={[styles.difficultyBadge, { borderColor: difficultyColor }]}>
              <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                {route.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => onStartRuck(route)}
            accessibilityRole="button"
            accessibilityLabel={`Start ruck on ${route.name}`}
          >
            <Text style={styles.startButtonText}>START RUCK</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatRouteDistance(route.distanceKm)}</Text>
            <Text style={styles.statLabel}>DISTANCE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatRouteElevation(route.elevationGainMeters)}</Text>
            <Text style={styles.statLabel}>ELEVATION</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatEstimatedTime(route.estimatedMinutes)}</Text>
            <Text style={styles.statLabel}>EST TIME</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{route.surface}</Text>
            <Text style={styles.statLabel}>SURFACE</Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagLabel}>RUCK RISK</Text>
            <Text style={[styles.tagValue, { color: riskColor }]}>{route.ruckRisk}</Text>
          </View>
          <View style={styles.tagDivider} />
          <View style={styles.tag}>
            <Text style={styles.tagLabel}>LOAD SUITABILITY</Text>
            <Text style={styles.tagValue}>{route.loadSuitability}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(7,17,12,0.96)',
    borderWidth: 1,
    borderColor: '#203529',
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  routeName: {
    color: '#f2f5ef',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  startButton: {
    backgroundColor: '#163d22',
    borderWidth: 1,
    borderColor: '#91e6a3',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  startButtonText: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#172c20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 3,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  statLabel: {
    color: '#8fbf8f',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#172c20',
  },
  tagRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#172c20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tag: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 3,
  },
  tagDivider: {
    width: 1,
    backgroundColor: '#172c20',
  },
  tagLabel: {
    color: '#8fbf8f',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
});
