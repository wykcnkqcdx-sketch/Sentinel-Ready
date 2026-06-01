import { DS } from '@/constants/theme';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { PlannedRuckRoute, RuckFilter, RuckRoute } from '@/src/utils/ruckRouteUtils';
import { filterRoutes, MOCK_ROUTES, searchRoutes, toPlannedRuckRoute } from '@/src/utils/ruckRouteUtils';
import type { MapLayerKey } from '@/src/utils/mapTiles';
import { RuckMapView } from './RuckMapView';
import { RuckMapActionButtons } from './RuckMapActionButtons';
import { RuckRouteCard } from './RuckRouteCard';
import { RuckRouteFilterChips } from './RuckRouteFilterChips';
import { RuckRoutePlanner } from './RuckRoutePlanner';
import { RuckRouteSearchBar } from './RuckRouteSearchBar';

const DEFAULT_LAYER: MapLayerKey = 'topo';

interface RuckRouteExplorerProps {
  onNavigateToTrack?: () => void;
  onStartRoute?: (route: PlannedRuckRoute) => void;
}

export function RuckRouteExplorer({ onNavigateToTrack, onStartRoute }: RuckRouteExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RuckFilter>('All Routes');
  const [routeIndex, setRouteIndex] = useState(0);
  const [isPlanning, setIsPlanning] = useState(false);

  const visibleRoutes = filterRoutes(searchRoutes(MOCK_ROUTES, searchQuery), activeFilter);
  const safeIndex = Math.min(routeIndex, Math.max(0, visibleRoutes.length - 1));
  const displayedRoute: RuckRoute = visibleRoutes[safeIndex] ?? MOCK_ROUTES[0];

  const mockCurrentPosition = {
    latitude: displayedRoute.startPoint.latitude + 0.001,
    longitude: displayedRoute.startPoint.longitude + 0.001,
    altitude: null as null,
    accuracy: null as null,
    timestamp: 0,
  };

  const handleStartRuck = useCallback((route: RuckRoute) => {
    onStartRoute?.(toPlannedRuckRoute(route));
    if (onNavigateToTrack) {
      onNavigateToTrack();
    } else {
      Alert.alert('START RUCK', `Switch to the Mission tab to begin GPS tracking on ${route.name}.`);
    }
  }, [onNavigateToTrack, onStartRoute]);

  const handleStartPlan = useCallback((route: PlannedRuckRoute) => {
    onStartRoute?.(route);
    if (onNavigateToTrack) {
      onNavigateToTrack();
    } else {
      Alert.alert('START RUCK', `Switch to the Mission tab to begin GPS tracking on ${route.name}.`);
    }
  }, [onNavigateToTrack, onStartRoute]);

  const handleFilterChange = useCallback((filter: RuckFilter) => {
    setActiveFilter(filter);
    setRouteIndex(0);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setRouteIndex(0);
  }, []);

  const handlePrev = safeIndex > 0 ? () => setRouteIndex(safeIndex - 1) : undefined;
  const handleNext = safeIndex < visibleRoutes.length - 1 ? () => setRouteIndex(safeIndex + 1) : undefined;

  if (isPlanning) {
    return (
      <RuckRoutePlanner
        onCancel={() => setIsPlanning(false)}
        onStartPlan={handleStartPlan}
      />
    );
  }

  return (
    <View style={styles.container}>
      <RuckMapView
        routePoints={displayedRoute.points}
        currentPosition={mockCurrentPosition}
        layer={DEFAULT_LAYER}
        zoom={14}
        fullHeight={true}
        interactive={true}
        showGpsStatus={false}
      />

      <View style={styles.topOverlay} pointerEvents="box-none">
        <RuckRouteSearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSavedRoutes={() => Alert.alert('SAVED ROUTES', 'Saved routes coming soon.')}
        />
        <RuckRouteFilterChips
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </View>

      <RuckMapActionButtons
        onLayers={() => Alert.alert('LAYERS', 'Map layer selection coming soon.')}
        onLocate={() => Alert.alert('LOCATE', 'Centering on current position.')}
        onTerrain={() => Alert.alert('3D TERRAIN', '3D terrain view coming soon.')}
        onCreateRoute={() => setIsPlanning(true)}
      />

      <RuckRouteCard
        route={displayedRoute}
        onStartRuck={handleStartRuck}
        routeCount={visibleRoutes.length}
        routeIndex={safeIndex}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.bgPrimary,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
