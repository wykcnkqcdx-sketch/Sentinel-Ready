import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RuckTrackPanel, RuckSaveDraft, DEFAULT_RUCK_SAVE_DRAFT, RuckMissionDraft, DEFAULT_RUCK_MISSION_DRAFT } from '@/src/components/ruck/RuckTrackPanel';
import { RuckRouteExplorer } from '@/src/components/ruck/RuckRouteExplorer';
import { useRuckTracking } from '@/src/hooks/useRuckTracking';
import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { buildReadinessTrend, isFatigueWatch } from '@/src/utils/trainingLogUtils';
import { parseGeoJsonOverlay, parseKmlOverlay, extractKmlFromKmz } from '@/src/utils/fieldMapping';
import type { MapOverlay } from '@/src/utils/fieldMapping';



type RuckMetrics = {
  distance: number;
  load: number;
  minutes: number;
  pace: number;
};

const DISTANCE_REGEX = /(\d+(?:\.\d+)?)\s*km/i;
const LOAD_REGEX = /(\d+(?:\.\d+)?)\s*kg/i;
const COLON_TIME_REGEX = /(\d+):(\d+)/;
const HR_REGEX = /(\d+)\s*hr/i;
const MIN_REGEX = /(\d+)\s*min/i;
const NUM_REGEX = /(\d+)/;
const RUCK_MISSION_STORAGE_KEY = 'sentinel_ruck_mission_defaults';

function parseRuckMetrics(log: TrainingLog): RuckMetrics {
  if (log.ruck) {
    return {
      distance: log.ruck.distanceKm,
      load: log.ruck.packWeightKg,
      minutes: Math.round(log.ruck.durationSeconds / 60),
      pace: log.ruck.paceSecondsPerKm / 60,
    };
  }

  const distMatch = log.distanceLoad.match(DISTANCE_REGEX);
  const distance = distMatch ? parseFloat(distMatch[1]) : 0;

  const loadMatch = log.distanceLoad.match(LOAD_REGEX);
  const load = loadMatch ? parseFloat(loadMatch[1]) : 0;

  let minutes = 0;
  const colonMatch = log.duration.match(COLON_TIME_REGEX);
  if (colonMatch) {
    minutes = parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  } else {
    const hrMatch = log.duration.match(HR_REGEX);
    if (hrMatch) minutes += parseInt(hrMatch[1], 10) * 60;
    const minMatch = log.duration.match(MIN_REGEX);
    if (minMatch) minutes += parseInt(minMatch[1], 10);
    if (!hrMatch && !minMatch) {
      const numMatch = log.duration.match(NUM_REGEX);
      if (numMatch) minutes += parseInt(numMatch[1], 10);
    }
  }

  const pace = distance > 0 && minutes > 0 ? minutes / distance : 0;
  return { distance, load, minutes, pace };
}

function formatPace(pace: number): string {
  if (!pace) return '--';
  let mins = Math.floor(pace);
  let secs = Math.round((pace - mins) * 60);
  if (secs === 60) {
    mins += 1;
    secs = 0;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDuration(minutes: number): string {
  if (!minutes) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatDurationFromSeconds(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  return formatDuration(totalMinutes);
}

function getNumberInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isMissionDraft(value: unknown): value is RuckMissionDraft {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.targetDistanceKm === 'string' &&
    typeof draft.targetMinutes === 'string' &&
    typeof draft.packWeightKg === 'string' &&
    typeof draft.checkpointIntervalKm === 'string'
  );
}

function getThisWeekKm(ruckLogs: TrainingLog[], metrics: RuckMetrics[]): { sessions: number; km: number } {
  const today = new Date();
  const day = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  weekStart.setHours(0, 0, 0, 0);

  let sessions = 0;
  let km = 0;
  ruckLogs.forEach((log, i) => {
    const logDate = new Date(log.date + 'T00:00:00');
    if (logDate >= weekStart) {
      sessions++;
      km += metrics[i]?.distance ?? 0;
    }
  });
  return { sessions, km };
}

function getNextSessionAdvice(
  latestMetrics: RuckMetrics | null,
  distanceDelta: number | null,
  loadDelta: number | null,
  readinessGood: boolean
): string {
  if (!readinessGood) {
    return 'Readiness is low. Hold distance and load at current level. Focus on completion and recovery before progressing.';
  }
  if (!latestMetrics || latestMetrics.distance === 0) {
    return 'Start with 6–8 km at 10–15 kg at a steady tactical pace. Posture checks every 10 minutes.';
  }
  if (loadDelta !== null && loadDelta > 0) {
    const nextDist = latestMetrics.distance < 12
      ? ` Consider adding ${(latestMetrics.distance + 1).toFixed(0)} km.`
      : ' Hold distance.';
    return `Load increased last session. Keep load at ${latestMetrics.load} kg.${nextDist} Progress one variable per session.`;
  }
  if (distanceDelta !== null && distanceDelta > 0) {
    if (latestMetrics.load > 0) {
      return `Distance increased last session. Hold distance at ${latestMetrics.distance} km. If pace felt comfortable, consider adding 1–2 kg load.`;
    }
    return `Distance increased last session. Hold at ${latestMetrics.distance} km. Add 5–10 kg load to build strength endurance.`;
  }
  const nextDist = (latestMetrics.distance + 1).toFixed(0);
  const loadStr = latestMetrics.load > 0 ? ` at ${latestMetrics.load} kg` : '';
  return `Aim for ${nextDist} km${loadStr}. Steady pace — log notes on foot condition and breathing rhythm.`;
}

const RuckSessionCard = memo(function RuckSessionCard({ log, metrics, paceVsPb, onReview }: {
  log: TrainingLog;
  metrics: RuckMetrics;
  paceVsPb: number | null;
  onReview?: (id: number) => void;
}) {
  const fatigue = isFatigueWatch(log.readiness);
  return (
    <TouchableOpacity
      style={fatigue ? styles.sessionCardWarn : styles.sessionCard}
      onPress={() => onReview?.(log.id)}
      disabled={!onReview}
      accessibilityRole={onReview ? 'button' : undefined}
      accessibilityLabel={onReview ? `Review ${log.type} from ${log.date}` : undefined}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionHeaderLeft}>
          <Text style={styles.sessionDate}>{log.date}</Text>
          <Text style={styles.sessionType}>{log.type}</Text>
        </View>
        <View style={fatigue ? styles.readinessBadgeWarn : styles.readinessBadge}>
          <Text style={fatigue ? styles.readinessTextWarn : styles.readinessText}>
            {log.readiness}/10
          </Text>
        </View>
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.sessionStat}>
          <Text style={styles.sessionStatNumber}>{metrics.distance > 0 ? `${metrics.distance}` : '--'}</Text>
          <Text style={styles.sessionStatLabel}>km</Text>
        </View>
        <View style={styles.sessionStatDivider} />
        <View style={styles.sessionStat}>
          <Text style={styles.sessionStatNumber}>{metrics.load > 0 ? `${metrics.load}` : '--'}</Text>
          <Text style={styles.sessionStatLabel}>kg</Text>
        </View>
        <View style={styles.sessionStatDivider} />
        <View style={styles.sessionStat}>
          <Text style={styles.sessionStatNumber}>{formatDuration(metrics.minutes)}</Text>
          <Text style={styles.sessionStatLabel}>time</Text>
        </View>
        <View style={styles.sessionStatDivider} />
        <View style={styles.sessionStat}>
          <Text style={styles.sessionStatNumber}>{metrics.pace > 0 ? formatPace(metrics.pace) : '--'}</Text>
          <Text style={styles.sessionStatLabel}>pace</Text>
          {paceVsPb !== null ? (
            <Text style={paceVsPb <= 0 ? styles.deltaGood : styles.deltaWarn}>
              {(() => {
                const absDelta = Math.abs(paceVsPb);
                const mins = Math.floor(absDelta);
                const secs = Math.round((absDelta % 1) * 60);
                return `${paceVsPb > 0 ? '+' : ''}${mins}:${secs.toString().padStart(2, '0')} vs PB`;
              })()}
            </Text>
          ) : null}
        </View>
      </View>

      {log.notes ? (
        <Text style={styles.sessionNotes} numberOfLines={2}>{log.notes}</Text>
      ) : null}
    </TouchableOpacity>
  );
});

export default function RuckScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stats' | 'track' | 'routes'>('track');
  const [saveDraft, setSaveDraft] = useState<RuckSaveDraft>(DEFAULT_RUCK_SAVE_DRAFT);
  const [missionDraft, setMissionDraft] = useState<RuckMissionDraft>(DEFAULT_RUCK_MISSION_DRAFT);
  const tracking = useRuckTracking();
  const { logs, isLoading, addLog } = useTraining();
  const [overlays, setOverlays] = useState<MapOverlay[]>([]);
  const [loadingOverlay, setLoadingOverlay] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(RUCK_MISSION_STORAGE_KEY).then((raw) => {
      if (!isMounted || !raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isMissionDraft(parsed)) return;
        setMissionDraft(parsed);
        setSaveDraft((prev) => ({ ...prev, packWeightKg: parsed.packWeightKg }));
      } catch {
        // Ignore invalid saved mission defaults.
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveSession = useCallback(async () => {
    if (tracking.distanceKm < 0.1) {
      Alert.alert('Too Short', 'Route must be at least 100m to save.');
      return;
    }
    const packWeightKg = Math.max(0, getNumberInput(saveDraft.packWeightKg || missionDraft.packWeightKg, 0));
    const readiness = Math.max(1, Math.min(10, Math.round(getNumberInput(saveDraft.readiness, 6))));
    const rpe = Math.max(1, Math.min(10, Math.round(getNumberInput(saveDraft.rpe, 6))));
    const durationSeconds = tracking.sessionResult?.elapsedSeconds ?? tracking.elapsedSeconds;
    const distanceKm = tracking.sessionResult?.distanceKm ?? tracking.distanceKm;
    const routePoints = tracking.sessionResult?.routePoints ?? tracking.routePoints;
    const paceSecondsPerKm = distanceKm > 0 ? durationSeconds / distanceKm : 0;
    const notes = saveDraft.notes.trim();
    const targetDistanceKm = Math.max(0, getNumberInput(missionDraft.targetDistanceKm, 0));
    const targetMinutes = Math.max(0, getNumberInput(missionDraft.targetMinutes, 0));
    const checkpointIntervalKm = Math.max(0, getNumberInput(missionDraft.checkpointIntervalKm, 0));

    const savedLog = await addLog({
      date: new Date().toISOString().slice(0, 10),
      category: 'Ruck',
      type: saveDraft.sessionType.trim() || 'GPS Tracked Ruck',
      duration: formatDurationFromSeconds(durationSeconds),
      distanceLoad: `${distanceKm.toFixed(2)} km - ${packWeightKg} kg`,
      readiness: String(readiness),
      notes: notes || `GPS tracked session. RPE ${rpe}/10.`,
      routePoints,
      route: {
        distanceKm,
        elevationGainMeters: 0,
        packWeightKg,
        polyline: ''
      },
      ruck: {
        distanceKm,
        durationSeconds,
        packWeightKg,
        paceSecondsPerKm,
        rpe,
        elevationGainMeters: 0,
        splits: tracking.sessionResult?.splits ?? tracking.splits,
        routeConfidence: tracking.sessionResult?.routeConfidence ?? tracking.routeConfidence,
        rejectedPointCount: tracking.sessionResult?.rejectedPointCount ?? tracking.rejectedPointCount,
        averageAccuracyMeters: tracking.sessionResult?.averageAccuracyMeters ?? tracking.averageAccuracyMeters ?? undefined,
        mission: {
          targetDistanceKm,
          targetMinutes,
          checkpointIntervalKm,
        },
      },
    });
    tracking.resetSession();
    setSaveDraft(DEFAULT_RUCK_SAVE_DRAFT);
    setActiveTab('stats');
    router.push({ pathname: '/ruck-review/[id]', params: { id: String(savedLog.id) } });
  }, [tracking, saveDraft, missionDraft, addLog, router]);

  const handleDiscardDraft = useCallback(() => setSaveDraft(DEFAULT_RUCK_SAVE_DRAFT), []);
  const handleMissionDraftChange = useCallback((draft: RuckMissionDraft) => {
    setMissionDraft(draft);
    setSaveDraft((prev) => ({ ...prev, packWeightKg: draft.packWeightKg }));
    AsyncStorage.setItem(RUCK_MISSION_STORAGE_KEY, JSON.stringify(draft)).catch((error) =>
      console.error('Failed to save ruck mission defaults', error)
    );
  }, []);
  const handleReviewRuck = useCallback((id: number) => {
    router.push({ pathname: '/ruck-review/[id]', params: { id: String(id) } });
  }, [router]);

  async function handleImportOverlay() {
    setLoadingOverlay(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.google-earth.kml+xml', 'application/vnd.google-earth.kmz',
               'application/json', 'application/geo+json', 'text/xml', 'application/xml', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const name = asset.name ?? 'overlay';
      const lowerName = name.toLowerCase();
      const OVERLAY_COLOURS = ['#CC2A2A','#4ECDC4','#FFE66D','#A8E6CF','#FF8B94','#B5EAD7'];
      const color = OVERLAY_COLOURS[overlays.length % OVERLAY_COLOURS.length];

      let overlay: MapOverlay;
      if (lowerName.endsWith('.kmz')) {
        const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        const kmlContent = extractKmlFromKmz(b64);
        overlay = parseKmlOverlay(kmlContent, name, color, 'kmz');
      } else if (lowerName.endsWith('.kml')) {
        const content = await FileSystem.readAsStringAsync(asset.uri);
        overlay = parseKmlOverlay(content, name, color, 'kml');
      } else {
        const content = await FileSystem.readAsStringAsync(asset.uri);
        overlay = parseGeoJsonOverlay(content, name, color);
      }
      setOverlays(prev => [...prev, overlay]);
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Could not read file');
    } finally {
      setLoadingOverlay(false);
    }
  }

  function handleRemoveOverlay(id: string) {
    setOverlays(prev => prev.filter(o => o.id !== id));
  }

  function handleToggleOverlay(id: string) {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, visible: !o.visible } : o));
  }

  const ruckLogs = useMemo(
    () => 
      logs.filter((l) => l.category === 'Ruck').sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.id - a.id;
      }),
    [logs]
  );

  const ruckMetrics = useMemo(() => ruckLogs.map((log) => parseRuckMetrics(log)), [ruckLogs]);

  const totalSessions = useMemo(() => ruckLogs.length, [ruckLogs]);
  const totalDistance = useMemo(() => ruckMetrics.reduce((sum, m) => sum + m.distance, 0), [ruckMetrics]);
  const longestRuck = useMemo(() => Math.max(0, ...ruckMetrics.map((m) => m.distance)), [ruckMetrics]);
  const heaviestLoad = useMemo(() => Math.max(0, ...ruckMetrics.map((m) => m.load)), [ruckMetrics]);
  const bestPace = useMemo(
    () => ruckMetrics.filter((m) => m.pace > 0).reduce((best, m) => (m.pace < best ? m.pace : best), Infinity),
    [ruckMetrics]
  );

  const latest = useMemo(() => ruckLogs[0] ?? null, [ruckLogs]);
  const latestMetrics = useMemo(() => ruckMetrics[0] ?? null, [ruckMetrics]);
  const previousMetrics = useMemo(() => ruckMetrics[1] ?? null, [ruckMetrics]);

  const distanceDelta = useMemo(
    () =>
      latestMetrics && previousMetrics && latestMetrics.distance > 0 && previousMetrics.distance > 0
        ? latestMetrics.distance - previousMetrics.distance
        : null,
    [latestMetrics, previousMetrics]
  );

  const loadDelta = useMemo(
    () =>
      latestMetrics && previousMetrics && latestMetrics.load > 0 && previousMetrics.load > 0
        ? latestMetrics.load - previousMetrics.load
        : null,
    [latestMetrics, previousMetrics]
  );

  const trend = useMemo(() => buildReadinessTrend(ruckLogs), [ruckLogs]);
  const recentFatigue = useMemo(
    () => ruckLogs.slice(0, 5).filter((l) => isFatigueWatch(l.readiness)).length,
    [ruckLogs]
  );
  const readinessGood = useMemo(
    () => trend.status !== 'warning' && recentFatigue < 2,
    [trend, recentFatigue]
  );

  const weekStats = useMemo(() => getThisWeekKm(ruckLogs, ruckMetrics), [ruckLogs, ruckMetrics]);
  const nextSessionAdvice = useMemo(
    () => getNextSessionAdvice(latestMetrics, distanceDelta, loadDelta, readinessGood),
    [latestMetrics, distanceDelta, loadDelta, readinessGood]
  );

  const recentHistory = useMemo(() => ruckLogs.slice(0, 5), [ruckLogs]);
  const recentMetricsSlice = useMemo(() => ruckMetrics.slice(0, 5), [ruckMetrics]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      {/* Header row */}
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>LOAD CARRIAGE</Text>
        <Text style={styles.title}>Ruck Performance</Text>
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'stats' && styles.tabPillActive]}
          onPress={() => setActiveTab('stats')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'stats' }}
        >
          <Text style={[styles.tabPillText, activeTab === 'stats' && styles.tabPillTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'track' && styles.tabPillActive]}
          onPress={() => setActiveTab('track')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'track' }}
        >
          <Text style={[styles.tabPillText, activeTab === 'track' && styles.tabPillTextActive]}>
            Track
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'routes' && styles.tabPillActive]}
          onPress={() => setActiveTab('routes')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'routes' }}
        >
          <Text style={[styles.tabPillText, activeTab === 'routes' && styles.tabPillTextActive]}>
            Routes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Routes tab */}
      {activeTab === 'routes' ? (
        <RuckRouteExplorer />
      ) : activeTab === 'stats' ? (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>
            Distance, load, pace and progression tracked from your logged ruck sessions.
          </Text>

      {ruckLogs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No ruck sessions logged</Text>
          <Text style={styles.emptyText}>
            {'Log a ruck session with category "Ruck" and include distance in km and load in kg to start tracking performance.'}
          </Text>
          <Text style={styles.emptyHint}>{'Example: "12 km - 18 kg"'}</Text>
        </View>
      ) : (
        <>
          <View style={styles.volumeCard}>
            <View style={styles.volumeRow}>
              <View style={styles.volumeStat}>
                <Text style={styles.volumeNumber}>{totalSessions}</Text>
                <Text style={styles.volumeLabel}>Sessions</Text>
              </View>
              <View style={styles.volumeDivider} />
              <View style={styles.volumeStat}>
                <Text style={styles.volumeNumber}>{totalDistance > 0 ? `${totalDistance.toFixed(1)}` : '--'}</Text>
                <Text style={styles.volumeLabel}>Total km</Text>
              </View>
              <View style={styles.volumeDivider} />
              <View style={styles.volumeStat}>
                <Text style={styles.volumeNumber}>{longestRuck > 0 ? `${longestRuck}` : '--'}</Text>
                <Text style={styles.volumeLabel}>Longest km</Text>
              </View>
              <View style={styles.volumeDivider} />
              <View style={styles.volumeStat}>
                <Text style={styles.volumeNumber}>{heaviestLoad > 0 ? `${heaviestLoad}` : '--'}</Text>
                <Text style={styles.volumeLabel}>Max kg</Text>
              </View>
            </View>

            {weekStats.sessions > 0 ? (
              <View style={styles.weekRow}>
                <Text style={styles.weekText}>
                  This week: {weekStats.sessions} {weekStats.sessions === 1 ? 'session' : 'sessions'}
                  {weekStats.km > 0 ? ` · ${weekStats.km.toFixed(1)} km` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.pbRow}>
            <View style={styles.pbCard}>
              <Text style={styles.pbKicker}>BEST PACE</Text>
              <Text style={styles.pbValue}>
                {bestPace !== Infinity ? formatPace(bestPace) : '--'}
              </Text>
              {latestMetrics && latestMetrics.pace > 0 && bestPace !== Infinity && latestMetrics.pace !== bestPace ? (
                <Text style={latestMetrics.pace <= bestPace ? styles.pbDeltaGood : styles.pbDeltaNeutral}>
                  Last: {formatPace(latestMetrics.pace)}
                </Text>
              ) : null}
            </View>
            <View style={styles.pbCard}>
              <Text style={styles.pbKicker}>TREND</Text>
              <Text style={
                trend.status === 'warning' ? styles.pbValueWarn
                : trend.status === 'good' ? styles.pbValueGood
                : styles.pbValue
              }>
                {ruckLogs.length > 1 ? trend.label : 'Baseline'}
              </Text>
              {trend.status !== 'neutral' && ruckLogs.length > 1 ? (
                <Text style={trend.status === 'warning' ? styles.pbDeltaWarn : styles.pbDeltaGood}>
                  {trend.latest}/10 vs {trend.previous}/10
                </Text>
              ) : null}
            </View>
          </View>

          {latest && latestMetrics ? (
            <View style={styles.latestCard}>
              <View style={styles.latestHeader}>
                <Text style={styles.latestKicker}>LAST RUCK — {latest.date}</Text>
                <View style={isFatigueWatch(latest.readiness) ? styles.readinessBadgeWarn : styles.readinessBadge}>
                  <Text style={isFatigueWatch(latest.readiness) ? styles.readinessTextWarn : styles.readinessText}>
                    {latest.readiness}/10
                  </Text>
                </View>
              </View>

              <View style={styles.latestStats}>
                <View style={styles.latestStat}>
                  <Text style={styles.latestStatNumber}>
                    {latestMetrics.distance > 0 ? `${latestMetrics.distance} km` : '--'}
                  </Text>
                  <Text style={styles.latestStatLabel}>Distance</Text>
                  {distanceDelta !== null ? (
                    <Text style={distanceDelta >= 0 ? styles.deltaGood : styles.deltaWarn}>
                      {distanceDelta > 0 ? '+' : ''}{distanceDelta.toFixed(1)} km
                    </Text>
                  ) : null}
                </View>

                <View style={styles.latestStat}>
                  <Text style={styles.latestStatNumber}>
                    {latestMetrics.load > 0 ? `${latestMetrics.load} kg` : '--'}
                  </Text>
                  <Text style={styles.latestStatLabel}>Load</Text>
                  {loadDelta !== null ? (
                    <Text style={loadDelta >= 0 ? styles.deltaGood : styles.deltaWarn}>
                      {loadDelta > 0 ? '+' : ''}{loadDelta.toFixed(1)} kg
                    </Text>
                  ) : null}
                </View>

                <View style={styles.latestStat}>
                  <Text style={styles.latestStatNumber}>{formatDuration(latestMetrics.minutes)}</Text>
                  <Text style={styles.latestStatLabel}>Duration</Text>
                </View>

                <View style={styles.latestStat}>
                  <Text style={styles.latestStatNumber}>
                    {latestMetrics.pace > 0 ? formatPace(latestMetrics.pace) : '--'}
                  </Text>
                  <Text style={styles.latestStatLabel}>Pace</Text>
                  {latestMetrics.pace > 0 && bestPace !== Infinity && latestMetrics.pace !== bestPace ? (
                    <Text style={latestMetrics.pace <= bestPace ? styles.deltaGood : styles.deltaWarn}>
                      {latestMetrics.pace <= bestPace ? 'PB' : `+${formatPace(latestMetrics.pace - bestPace).replace('/km', '')} vs PB`}
                    </Text>
                  ) : latestMetrics.pace > 0 && bestPace !== Infinity && latestMetrics.pace === bestPace ? (
                    <Text style={styles.deltaGood}>PB</Text>
                  ) : null}
                </View>
              </View>

              {latest.ruck ? (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => handleReviewRuck(latest.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Open latest ruck review"
                >
                  <Text style={styles.reviewButtonText}>Open Review</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={readinessGood ? styles.nextCard : styles.nextCardWarn}>
            <Text style={styles.nextKicker}>NEXT SESSION</Text>
            <Text style={styles.nextText}>{nextSessionAdvice}</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <Text style={styles.sectionTag}>{totalSessions} TOTAL</Text>
          </View>

          {recentHistory.map((log, i) => {
            const m = recentMetricsSlice[i];
            const paceVsPb = m?.pace > 0 && bestPace !== Infinity ? m.pace - bestPace : null;
            return (
              <RuckSessionCard
                key={log.id}
                log={log}
                metrics={m}
                paceVsPb={paceVsPb}
                onReview={log.ruck ? handleReviewRuck : undefined}
              />
            );
          })}
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ruck Builder</Text>
        <Text style={styles.sectionTag}>SESSIONS</Text>
      </View>

      <View style={styles.builderCard}>
        <Text style={styles.builderTitle}>Base Ruck</Text>
        <Text style={styles.builderDetail}>6–8 km · 10–15 kg · Easy pace</Text>
        <Text style={styles.builderText}>
          Steady tactical pace. Posture check every 10 minutes. No running under load. Focus on foot care and breathing rhythm.
        </Text>
      </View>

      <View style={styles.builderCard}>
        <Text style={styles.builderTitle}>Interval Ruck</Text>
        <Text style={styles.builderDetail}>5 × 4 min strong / 2 min easy</Text>
        <Text style={styles.builderText}>
          Builds work capacity without full aerobic load. Keep load moderate. Monitor lower-leg response after the session.
        </Text>
      </View>

      <View style={styles.builderCard}>
        <Text style={styles.builderTitle}>Long Ruck</Text>
        <Text style={styles.builderDetail}>10–15 km · Match last session load</Text>
        <Text style={styles.builderText}>
          Extend distance only. Hold load constant. Increase either load or distance — never both in the same week.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Field Notes</Text>
        <Text style={styles.sectionTag}>CHECKLIST</Text>
      </View>

      <View style={styles.fieldCard}>
        <Text style={styles.fieldLabel}>BEFORE</Text>
        <Text style={styles.fieldText}>
          Check boots, socks, blister kit, hydration, route, weather and pack fit before stepping off.
        </Text>
      </View>

      <View style={styles.fieldCard}>
        <Text style={styles.fieldLabel}>DURING</Text>
        <Text style={styles.fieldText}>
          Keep shoulders relaxed. Shorten stride on inclines. Avoid running under heavy load. Hydrate every 20–30 minutes.
        </Text>
      </View>

          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>AFTER</Text>
            <Text style={styles.fieldText}>
              Log distance, load, pace, readiness and any hot spots, blisters or lower-leg pain immediately after the session.
            </Text>
          </View>
        </ScrollView>
      ) : (
        /* Track tab */
        <RuckTrackPanel
          tracking={tracking}
          overlays={overlays}
          loadingOverlay={loadingOverlay}
          missionDraft={missionDraft}
          saveDraft={saveDraft}
          onMissionDraftChange={handleMissionDraftChange}
          onSaveDraftChange={setSaveDraft}
          onImportOverlay={handleImportOverlay}
          onToggleOverlay={handleToggleOverlay}
          onRemoveOverlay={handleRemoveOverlay}
          onSaveSession={handleSaveSession}
          onDiscardDraft={handleDiscardDraft}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000D1A' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  kicker: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#8FAEC8', fontSize: 15, lineHeight: 22 },

  headerBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: '#00253D', borderRadius: 12, padding: 4, marginHorizontal: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tabPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  tabPillActive: { backgroundColor: 'rgba(181,133,44,0.3)' },
  tabPillText: { color: '#8FAEC8', fontSize: 13, fontWeight: '900' },
  tabPillTextActive: { color: '#ffffff' },

  volumeCard: { backgroundColor: '#00253D', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 12 },
  volumeRow: { flexDirection: 'row', alignItems: 'center' },
  volumeStat: { flex: 1, alignItems: 'center', gap: 4 },
  volumeNumber: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  volumeLabel: { color: '#8FAEC8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' },
  volumeDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  weekRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 10 },
  weekText: { color: '#B5852C', fontSize: 12, fontWeight: '900', textAlign: 'center' },

  pbRow: { flexDirection: 'row', gap: 10 },
  pbCard: { flex: 1, backgroundColor: '#00253D', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 4 },
  pbKicker: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  pbValue: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  pbValueGood: { color: '#B5852C', fontSize: 20, fontWeight: '900' },
  pbValueWarn: { color: '#D4A01A', fontSize: 20, fontWeight: '900' },
  pbDeltaGood: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  pbDeltaWarn: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
  pbDeltaNeutral: { color: '#8FAEC8', fontSize: 11, fontWeight: '800' },

  latestCard: { backgroundColor: '#003050', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 14 },
  latestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  latestKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  latestStats: { flexDirection: 'row', gap: 8 },
  latestStat: { flex: 1, gap: 3 },
  latestStatNumber: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  latestStatLabel: { color: '#8FAEC8', fontSize: 10, fontWeight: '800' },
  deltaGood: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  deltaWarn: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
  reviewButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#B5852C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  reviewButtonText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },

  readinessBadge: { backgroundColor: '#003050', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  readinessBadgeWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  readinessText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  readinessTextWarn: { color: '#D4A01A', fontSize: 12, fontWeight: '900' },

  nextCard: { backgroundColor: '#00253D', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 },
  nextCardWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', gap: 6 },
  nextKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  nextText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },

  emptyCard: { backgroundColor: '#00253D', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  emptyText: { color: '#8FAEC8', fontSize: 14, lineHeight: 21 },
  emptyHint: { color: '#B5852C', fontSize: 12, fontWeight: '900' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  sectionTag: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderColor: '#274b32', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },

  sessionCard: { backgroundColor: '#00253D', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  sessionCardWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', gap: 12 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  sessionHeaderLeft: { gap: 3 },
  sessionDate: { color: '#8FAEC8', fontSize: 12, fontWeight: '800' },
  sessionType: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  sessionStats: { flexDirection: 'row', alignItems: 'center' },
  sessionStat: { flex: 1, alignItems: 'center', gap: 3 },
  sessionStatNumber: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  sessionStatLabel: { color: '#8FAEC8', fontSize: 10, fontWeight: '800' },
  sessionStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  sessionNotes: { color: '#8FAEC8', fontSize: 12, lineHeight: 18 },

  builderCard: { backgroundColor: '#00253D', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 },
  builderTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  builderDetail: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  builderText: { color: '#8FAEC8', fontSize: 13, lineHeight: 20 },

  fieldCard: { backgroundColor: '#00253D', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 },
  fieldLabel: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  fieldText: { color: '#8FAEC8', fontSize: 13, lineHeight: 20 },
});
