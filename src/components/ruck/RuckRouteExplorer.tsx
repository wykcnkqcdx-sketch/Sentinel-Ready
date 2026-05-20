import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { RuckFilter, RuckRoute } from '@/src/utils/ruckRouteUtils';
import { filterRoutes, MOCK_ROUTES, searchRoutes } from '@/src/utils/ruckRouteUtils';
import type { MapLayerKey } from '@/src/utils/mapTiles';
import { RuckMapView } from './RuckMapView';
import { RuckMapActionButtons } from './RuckMapActionButtons';
import { RuckRouteCard } from './RuckRouteCard';
import { RuckRouteFilterChips } from './RuckRouteFilterChips';
import { RuckRouteSearchBar } from './RuckRouteSearchBar';

const DEFAULT_LAYER: MapLayerKey = 'topo';

export function RuckRouteExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RuckFilter>('All Routes');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(MOCK_ROUTES[0].id);

  const visibleRoutes = filterRoutes(searchRoutes(MOCK_ROUTES, searchQuery), activeFilter);
  const displayedRoute: RuckRoute =
    visibleRoutes.find((r) => r.id === selectedRouteId) ?? visibleRoutes[0] ?? MOCK_ROUTES[0];

  const mockCurrentPosition = {
    latitude: displayedRoute.startPoint.latitude + 0.001,
    longitude: displayedRoute.startPoint.longitude + 0.001,
    altitude: null as null,
    accuracy: null as null,
    timestamp: 0,
  };

  function handleStartRuck(route: RuckRoute) {
    Alert.alert(
      'START RUCK',
      `Beginning route: ${route.name}\n\nSwitch to the Track tab to begin GPS tracking.`,
    );
  }

  function handleFilterChange(filter: RuckFilter) {
    setActiveFilter(filter);
    const filtered = filterRoutes(searchRoutes(MOCK_ROUTES, searchQuery), filter);
    if (filtered.length > 0 && !filtered.find((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(filtered[0].id);
    }
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
          onChangeText={setSearchQuery}
          onSavedRoutes={() => Alert.alert('SAVED ROUTES', 'Saved routes feature coming soon.')}
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
        onCreateRoute={() => Alert.alert('CREATE ROUTE', 'Route creation coming soon.')}
      />

      <RuckRouteCard route={displayedRoute} onStartRuck={handleStartRuck} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050e09',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
