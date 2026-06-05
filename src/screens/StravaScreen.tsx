import { DS } from '@/constants/theme';
import { useTraining } from '@/src/screens/TrainingContext';
import {
  StravaActivity,
  StravaTokens,
  authorizeStrava,
  clearStravaTokens,
  exchangeStravaCode,
  fetchStravaActivities,
  loadStravaTokens,
  refreshStravaTokenIfNeeded,
  saveStravaTokens,
  stravaActivityToLog,
} from '@/src/services/strava';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Activity card
// ---------------------------------------------------------------------------

type ActivityCardProps = {
  activity: StravaActivity;
  imported: boolean;
  onImport: (activity: StravaActivity) => void;
};

const ActivityCard = memo(function ActivityCard({ activity, imported, onImport }: ActivityCardProps) {
  const km = (activity.distance / 1000).toFixed(2);
  const mins = Math.round(activity.moving_time / 60);
  const elev = Math.round(activity.total_elevation_gain);
  const dateLabel = activity.start_date.slice(0, 10).replace(/-/g, '/');

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityMain}>
        <View style={styles.activityInfo}>
          <Text style={styles.activityName} numberOfLines={1}>
            {activity.name}
          </Text>
          <View style={styles.activityMeta}>
            <Text style={styles.activityDate}>{dateLabel}</Text>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{activity.sport_type}</Text>
            </View>
          </View>
          <View style={styles.activityStats}>
            <Text style={styles.statText}>{km} km</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>{mins} min</Text>
            {elev > 0 ? (
              <>
                <Text style={styles.statDot}>·</Text>
                <Text style={styles.statText}>{elev}m elev</Text>
              </>
            ) : null}
            {activity.average_heartrate ? (
              <>
                <Text style={styles.statDot}>·</Text>
                <Text style={styles.statText}>
                  {Math.round(activity.average_heartrate)} bpm
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {imported ? (
          <View style={styles.importedBadge}>
            <Text style={styles.importedText}>IMPORTED</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => onImport(activity)}
            accessibilityRole="button"
            accessibilityLabel={`Import ${activity.name}`}
          >
            <Text style={styles.importButtonText}>IMPORT</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function StravaScreen() {
  const router = useRouter();
  const { addLog } = useTraining();

  const [tokens, setTokens] = useState<StravaTokens | null>(null);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStravaTokens().then((t) => {
      if (t) {
        setTokens(t);
        loadActivities(t);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActivities = useCallback(async (t: StravaTokens) => {
    setLoading(true);
    setError(null);
    try {
      const refreshed = await refreshStravaTokenIfNeeded(t);
      if (refreshed !== t) {
        await saveStravaTokens(refreshed);
        setTokens(refreshed);
      }
      const acts = await fetchStravaActivities(refreshed);
      setActivities(acts);
    } catch {
      setError('Failed to load activities. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const code = await authorizeStrava();
      if (!code) {
        setSyncing(false);
        return;
      }
      const t = await exchangeStravaCode(code);
      await saveStravaTokens(t);
      setTokens(t);
      await loadActivities(t);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Connection failed. Check your Strava connection settings.',
      );
    } finally {
      setSyncing(false);
    }
  }, [loadActivities]);

  const handleDisconnect = useCallback(async () => {
    await clearStravaTokens();
    setTokens(null);
    setActivities([]);
    setImportedIds(new Set());
  }, []);

  const handleImport = useCallback((activity: StravaActivity) => {
    const entry = stravaActivityToLog(activity);
    addLog(entry);
    setImportedIds((prev) => new Set(prev).add(activity.id));
  }, [addLog]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backChevron}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>STRAVA</Text>
          <Text style={styles.title}>Activity Sync</Text>
        </View>
      </View>

      {/* Error banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Not connected */}
      {!tokens ? (
        <View style={styles.connectCard}>
          <View style={styles.stravaLogoRow}>
            <View style={styles.stravaDot} />
            <Text style={styles.connectHeading}>Connect Strava</Text>
          </View>
          <Text style={styles.connectSubtext}>
            Import runs, hikes and strength sessions directly into your training
            log.
          </Text>
          <TouchableOpacity
            style={[styles.connectButton, syncing && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={syncing}
            accessibilityRole="button"
          >
            <Text style={styles.connectButtonText}>
              {syncing ? 'Connecting...' : 'CONNECT'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.credentialNote}>
            Configure EXPO_PUBLIC_STRAVA_CLIENT_ID and{'\n'}
            EXPO_PUBLIC_STRAVA_TOKEN_PROXY_URL
          </Text>
        </View>
      ) : (
        /* Connected */
        <>
          {/* Athlete badge + refresh */}
          <View style={styles.connectedRow}>
            <View style={styles.athleteBadge}>
              <View style={styles.stravaDotSmall} />
              <Text style={styles.athleteText}>
                Connected · {tokens.athleteName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => loadActivities(tokens)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Refresh activities"
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Loading state */}
          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Loading activities...</Text>
            </View>
          ) : (
            /* Activity list */
            <View style={styles.activityList}>
              {activities.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    No recent activities found on Strava.
                  </Text>
                </View>
              ) : (
                activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    imported={importedIds.has(activity.id)}
                    onImport={handleImport}
                  />
                ))
              )}
            </View>
          )}

          {/* Disconnect */}
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
            accessibilityRole="button"
          >
            <Text style={styles.disconnectText}>Disconnect Strava</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080c05' },
  content: { padding: 20, gap: 18, paddingBottom: 60 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  backButton: { padding: 8 },
  backChevron: { color: DS.gold, fontSize: 24, fontWeight: '900' },
  headerText: { gap: 2 },
  kicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  title: { color: DS.textPrimary, fontSize: 28, fontWeight: '900' },

  // Error
  errorBanner: {
    backgroundColor: DS.bgWarn,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.borderWarn,
    padding: 14,
  },
  errorText: { color: DS.warning, fontSize: 13, fontWeight: '800', lineHeight: 20 },

  // Connect card
  connectCard: {
    backgroundColor: DS.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    padding: 20,
    gap: 14,
  },
  stravaLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stravaDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DS.gold,
  },
  connectHeading: { color: DS.textPrimary, fontSize: 22, fontWeight: '900' },
  connectSubtext: {
    color: DS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: DS.gold,
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  connectButtonDisabled: { opacity: 0.6 },
  connectButtonText: {
    color: DS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  credentialNote: {
    color: '#4a5a44',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Connected state
  connectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  athleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DS.bgCardAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DS.borderHighlight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 1,
  },
  stravaDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DS.gold,
  },
  athleteText: { color: DS.gold, fontSize: 13, fontWeight: '800' },
  refreshButton: {
    backgroundColor: DS.bgCard,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refreshText: { color: DS.textSecondary, fontSize: 13, fontWeight: '800' },

  // Loading
  loadingBox: {
    backgroundColor: DS.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    padding: 20,
    alignItems: 'center',
  },
  loadingText: { color: DS.textSecondary, fontSize: 14, fontWeight: '700' },

  // Activity list
  activityList: { gap: 10 },

  // Empty
  emptyBox: {
    backgroundColor: DS.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: DS.textSecondary, fontSize: 14, fontWeight: '700' },

  // Activity card
  activityCard: {
    backgroundColor: DS.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    padding: 14,
  },
  activityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityInfo: { flex: 1, gap: 5 },
  activityName: {
    color: DS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityDate: { color: DS.textSecondary, fontSize: 12, fontWeight: '700' },
  typeChip: {
    backgroundColor: '#080c05',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeChipText: { color: DS.textSecondary, fontSize: 11, fontWeight: '800' },
  activityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  statText: { color: DS.textSecondary, fontSize: 12, fontWeight: '700' },
  statDot: { color: '#3d5240', fontSize: 12 },

  // Import button
  importButton: {
    backgroundColor: DS.borderHighlight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 76,
  },
  importButtonText: {
    color: DS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  importedBadge: {
    backgroundColor: '#080c05',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DS.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 76,
  },
  importedText: {
    color: '#4a7a50',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Disconnect
  disconnectButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  disconnectText: {
    color: '#4a7a50',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
