import { DS } from '@/constants/theme';
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
  routeCount?: number;
  routeIndex?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function RuckRouteCard({
  route,
  onStartRuck,
  routeCount = 1,
  routeIndex = 0,
  onPrev,
  onNext,
}: RuckRouteCardProps) {
  const difficultyColor = getDifficultyColor(route.difficulty);
  const riskColor = getRiskColor(route.ruckRisk);

  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: difficultyColor }]} />
      <View style={styles.content}>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {route.recommended ? (
              <Text style={styles.recommendedBadge}>[ RECOMMENDED ROUTE ]</Text>
            ) : null}
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
            <Text style={[styles.tagValue, { color: riskColor }]}>{route.ruckRisk.toUpperCase()}</Text>
          </View>
          <View style={styles.tagDivider} />
          <View style={styles.tag}>
            <Text style={styles.tagLabel}>LOAD SUITABILITY</Text>
            <Text style={styles.tagValue}>{route.loadSuitability}</Text>
          </View>
        </View>

        {route.description ? (
          <Text style={styles.description}>{route.description}</Text>
        ) : null}

        {routeCount > 1 ? (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navButton, !onPrev && styles.navButtonDisabled]}
              onPress={onPrev}
              disabled={!onPrev}
              accessibilityRole="button"
              accessibilityLabel="Previous route"
            >
              <Text style={[styles.navArrow, !onPrev && styles.navArrowDisabled]}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.navCount}>{routeIndex + 1} / {routeCount}</Text>
            <TouchableOpacity
              style={[styles.navButton, !onNext && styles.navButtonDisabled]}
              onPress={onNext}
              disabled={!onNext}
              accessibilityRole="button"
              accessibilityLabel="Next route"
            >
              <Text style={[styles.navArrow, !onNext && styles.navArrowDisabled]}>▶</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
    backgroundColor: 'rgba(7,17,12,0.97)',
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: { width: 3 },
  content: { flex: 1, padding: 14, gap: 10 },
  recommendedBadge: {
    color: DS.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerLeft: { flex: 1, gap: 5 },
  routeName: {
    color: DS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  difficultyText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  startButton: {
    backgroundColor: DS.bgCardAlt,
    borderWidth: 1,
    borderColor: DS.gold,
    borderRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  startButtonText: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 7, gap: 2 },
  statValue: { color: DS.textPrimary, fontSize: 12, fontWeight: '900' },
  statLabel: { color: DS.textSecondary, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: DS.border },
  tagRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tag: { flex: 1, paddingVertical: 6, paddingHorizontal: 10, gap: 3 },
  tagDivider: { width: 1, backgroundColor: DS.border },
  tagLabel: { color: DS.textSecondary, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  tagValue: { color: DS.textPrimary, fontSize: 11, fontWeight: '900' },
  description: { color: DS.textSecondary, fontSize: 11, lineHeight: 16 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 2,
  },
  navButton: { paddingHorizontal: 10, paddingVertical: 4 },
  navButtonDisabled: { opacity: 0.3 },
  navArrow: { color: DS.gold, fontSize: 12, fontWeight: '900' },
  navArrowDisabled: { color: DS.textSecondary },
  navCount: { color: DS.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
