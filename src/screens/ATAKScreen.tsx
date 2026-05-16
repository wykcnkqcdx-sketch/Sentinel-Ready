import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useTraining } from '@/src/screens/TrainingContext';
import {
  clearFTSConfig,
  CotObject,
  DEFAULT_FTS_CONFIG,
  exportSessionAsCoT,
  fetchCotObjects,
  FTSConfig,
  loadFTSConfig,
  pingFTSServer,
  saveFTSConfig,
  sendPositionCoT,
} from '@/src/services/atak';

// ── Team colour mapping ───────────────────────────────────────────────────────

const TEAM_COLOURS: Record<string, string> = {
  Cyan: '#00BCD4',
  Magenta: '#E91E63',
  Yellow: '#FFEB3B',
  Orange: '#FF9800',
  Purple: '#9C27B0',
  Blue: '#2196F3',
  Maroon: '#7B1FA2',
  Green: '#4CAF50',
  White: '#F5F5F5',
  Red: '#F44336',
  Teal: '#009688',
};

function teamColour(team: string): string {
  return TEAM_COLOURS[team] ?? '#91e6a3';
}

// ── Stale check ───────────────────────────────────────────────────────────────

function isStale(staleIso: string): boolean {
  if (!staleIso) return false;
  try {
    return new Date(staleIso).getTime() < Date.now();
  } catch {
    return false;
  }
}

// ── Status dot colour ─────────────────────────────────────────────────────────

function dotColour(status: FTSStatus): string {
  if (status === 'connected') return '#91e6a3';
  if (status === 'connecting') return '#ffb86b';
  if (status === 'error') return '#F44336';
  return '#4a5e4a';
}

type FTSStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ── Edit config form ──────────────────────────────────────────────────────────

type EditFormProps = {
  draft: FTSConfig;
  onChange: (key: keyof FTSConfig, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

const EditConfigForm = memo(function EditConfigForm({ draft, onChange, onSave, onCancel }: EditFormProps) {
  return (
    <View style={styles.editForm}>
      <Text style={styles.formLabel}>Host / IP</Text>
      <TextInput
        style={styles.input}
        value={draft.host}
        onChangeText={(v) => onChange('host', v)}
        placeholder="192.168.1.100"
        placeholderTextColor="#4a5e4a"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Server host or IP address"
      />

      <Text style={styles.formLabel}>Port</Text>
      <TextInput
        style={styles.input}
        value={String(draft.port)}
        onChangeText={(v) => onChange('port', v)}
        placeholder="19023"
        placeholderTextColor="#4a5e4a"
        keyboardType="numeric"
        accessibilityLabel="Server port number"
      />

      <Text style={styles.formLabel}>Username</Text>
      <TextInput
        style={styles.input}
        value={draft.username}
        onChangeText={(v) => onChange('username', v)}
        placeholder="user"
        placeholderTextColor="#4a5e4a"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="FTS username"
      />

      <Text style={styles.formLabel}>Password</Text>
      <TextInput
        style={styles.input}
        value={draft.password}
        onChangeText={(v) => onChange('password', v)}
        placeholder="password"
        placeholderTextColor="#4a5e4a"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        accessibilityLabel="FTS password"
      />

      <Text style={styles.formLabel}>Callsign</Text>
      <TextInput
        style={styles.input}
        value={draft.callsign}
        onChangeText={(v) => onChange('callsign', v.toUpperCase())}
        placeholder="SENTINEL"
        placeholderTextColor="#4a5e4a"
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="TAK callsign"
      />

      <Text style={styles.formLabel}>Team</Text>
      <TextInput
        style={styles.input}
        value={draft.team}
        onChangeText={(v) => onChange('team', v)}
        placeholder="Cyan"
        placeholderTextColor="#4a5e4a"
        autoCapitalize="words"
        accessibilityLabel="TAK team colour"
      />

      <View style={styles.formButtons}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel="Save server configuration"
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ── CotObject row ─────────────────────────────────────────────────────────────

const CotRow = memo(function CotRow({ obj }: { obj: CotObject }) {


  const staled = isStale(obj.stale);
  const tColour = teamColour(obj.team);

  return (
    <View style={styles.cotRow}>
      <View style={styles.cotRowHeader}>
        <Text style={styles.cotCallsign}>{obj.callsign || obj.uid}</Text>
        {obj.team ? (
          <View style={[styles.teamChip, { backgroundColor: tColour + '22', borderColor: tColour + '66' }]}>
            <Text style={[styles.teamChipText, { color: tColour }]}>{obj.team}</Text>
          </View>
        ) : null}
        {staled ? (
          <View style={styles.staleChip}>
            <Text style={styles.staleChipText}>stale</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cotCoords}>
        {obj.lat.toFixed(3)}, {obj.lon.toFixed(3)}
        {obj.speed > 0 ? `  ·  ${Math.round(obj.speed)} m/s` : ''}
      </Text>
    </View>
  );
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ATAKScreen() {

  const router = useRouter();
  const { logs } = useTraining();

  const [config, setConfig] = useState<FTSConfig>(DEFAULT_FTS_CONFIG);
  const [draft, setDraft] = useState<FTSConfig>(DEFAULT_FTS_CONFIG);
  const [status, setStatus] = useState<FTSStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState('');
  const [cotObjects, setCotObjects] = useState<CotObject[]>([]);
  const [exporting, setExporting] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [pingResult, setPingResult] = useState<'none' | 'ok' | 'fail'>('none');

  // Load saved config on mount
  useEffect(() => {
    loadFTSConfig().then((saved) => {
      if (saved) {
        setConfig(saved);
        setDraft(saved);
      }
    });
  }, []);

  const handleDraftChange = useCallback((key: keyof FTSConfig, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: key === 'port' ? Number(value) || prev.port : value,
    }));
  }, []);

  const handleSaveConfig = useCallback(async () => {
    await saveFTSConfig(draft);
    setConfig(draft);
    setEditingConfig(false);
    setStatus('disconnected');
    setPingResult('none');
    setStatusMessage('');
  }, [draft]);

  const handleCancelEdit = useCallback(() => {
    setDraft(config);
    setEditingConfig(false);
  }, [config]);

  const handlePing = useCallback(async () => {
    if (!config.host) {
      Alert.alert('No Host', 'Enter a FreeTAKServer host/IP in the config first.');
      return;
    }
    setStatus('connecting');
    setStatusMessage('Testing connection...');
    setPingResult('none');
    const ok = await pingFTSServer(config);
    if (ok) {
      setStatus('connected');
      setStatusMessage(`Connected to ${config.host}`);
      setPingResult('ok');
    } else {
      setStatus('error');
      setStatusMessage('Connection failed');
      setPingResult('fail');
    }
  }, [config]);

  const handleSendPosition = useCallback(async () => {
    if (!config.host) {
      Alert.alert('No Host', 'Configure the server first.');
      return;
    }
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') {
      Alert.alert('Location denied', 'Location permission is required to send position.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await sendPositionCoT(
        config,
        loc.coords.latitude,
        loc.coords.longitude,
        loc.coords.altitude ?? undefined,
        loc.coords.speed ?? undefined,
        loc.coords.heading ?? undefined,
      );
      Alert.alert('Position Sent', `CoT ping sent from ${config.callsign}.`);
    } catch (e) {
      Alert.alert('Send Failed', 'Could not send position to FreeTAKServer.');
    }
  }, [config]);

  const handleFetchTeam = useCallback(async () => {
    if (!config.host) {
      Alert.alert('No Host', 'Configure the server first.');
      return;
    }
    const objects = await fetchCotObjects(config);
    setCotObjects(objects);
    if (objects.length === 0) {
      Alert.alert('No Objects', 'No active CoT objects returned from server.');
    }
  }, [config]);

  const handleExportSession = useCallback(async () => {
    let ruckWithRoute: typeof logs[0] | undefined;
    for (const log of logs) {
      if (log.category === 'Ruck' && log.routePoints && log.routePoints.length > 0) {
        if (!ruckWithRoute || log.date > ruckWithRoute.date) ruckWithRoute = log;
      }
    }

    if (!ruckWithRoute || !ruckWithRoute.routePoints) {
      Alert.alert(
        'No GPS Session',
        'Track a ruck session with GPS first, then export it.',
      );
      return;
    }

    if (!config.host) {
      Alert.alert('No Host', 'Configure the server first.');
      return;
    }

    setExporting(true);
    try {
      const { sent, failed } = await exportSessionAsCoT(
        config,
        ruckWithRoute.routePoints,
        ruckWithRoute.notes,
      );
      Alert.alert(
        'Export Complete',
        `Sent ${sent} track points to FreeTAKServer.${failed > 0 ? ` ${failed} failed.` : ''}`,
      );
    } catch {
      Alert.alert('Export Failed', 'Could not export session to FreeTAKServer.');
    } finally {
      setExporting(false);
    }
  }, [logs, config]);

  // ── Status label ────────────────────────────────────────────────────────────

  function statusLabel(): string {
    if (status === 'connected') return `Connected to ${config.host}`;
    if (status === 'connecting') return 'Testing connection...';
    if (status === 'error') return 'Connection failed';
    return 'Not connected';
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>


      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>ATAK / FREETAKSERVER</Text>
        <Text style={styles.title}>Team Tracking</Text>
      </View>

      {/* Status card */}
      <View style={styles.card}>
        <Text style={styles.cardKicker}>CONNECTION STATUS</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: dotColour(status) }]} />
          <Text style={styles.statusText}>{statusLabel()}</Text>
        </View>
      </View>

      {/* Server config card */}
      <View style={styles.card}>
        <Text style={styles.cardKicker}>SERVER CONFIG</Text>

        {!editingConfig ? (
          <>
            <Text style={styles.configLine}>
              Host: <Text style={styles.configValue}>{config.host || '—'}</Text>
              {'  '}Port: <Text style={styles.configValue}>{config.port}</Text>
            </Text>
            <Text style={styles.configLine}>
              Callsign: <Text style={styles.configValue}>{config.callsign}</Text>
              {'  '}Team: <Text style={[styles.configValue, { color: teamColour(config.team) }]}>{config.team}</Text>
            </Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => { setDraft(config); setEditingConfig(true); }}
              accessibilityRole="button"
              accessibilityLabel="Edit server configuration"
            >
              <Text style={styles.editBtnText}>Edit Config</Text>
            </TouchableOpacity>
          </>
        ) : (
          <EditConfigForm
            draft={draft}
            onChange={handleDraftChange}
            onSave={handleSaveConfig}
            onCancel={handleCancelEdit}
          />
        )}
      </View>

      {/* Actions card */}
      <View style={styles.card}>
        <Text style={styles.cardKicker}>ACTIONS</Text>
        <View style={styles.actionGrid}>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePing}
            accessibilityRole="button"
            accessibilityLabel="Ping FreeTAKServer"
          >
            <Text style={styles.actionBtnTitle}>PING SERVER</Text>
            {pingResult !== 'none' ? (
              <Text style={pingResult === 'ok' ? styles.pingOk : styles.pingFail}>
                {pingResult === 'ok' ? '✓' : '✗'}
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSendPosition}
            accessibilityRole="button"
            accessibilityLabel="Send current GPS position as CoT"
          >
            <Text style={styles.actionBtnTitle}>SEND POSITION</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleFetchTeam}
            accessibilityRole="button"
            accessibilityLabel="Fetch active team CoT objects"
          >
            <Text style={styles.actionBtnTitle}>FETCH TEAM</Text>
            {cotObjects.length > 0 ? (
              <Text style={styles.actionBtnSub}>{cotObjects.length} objects</Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, exporting && styles.actionBtnDisabled]}
            onPress={handleExportSession}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Export latest GPS ruck session as CoT track"
          >
            <Text style={styles.actionBtnTitle}>
              {exporting ? 'EXPORTING...' : 'EXPORT SESSION'}
            </Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Team positions card */}
      {cotObjects.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.teamHeader}>
            <Text style={styles.cardKicker}>TEAM POSITIONS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{cotObjects.length}</Text>
            </View>
          </View>
          {cotObjects.map((obj) => (
            <CotRow key={obj.uid} obj={obj} />
          ))}
        </View>
      ) : null}

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>FreeTAKServer Setup</Text>
        <Text style={styles.infoText}>
          FreeTAKServer is a free, open-source TAK server. Download it from github.com/FreeTAKTeam/FreeTAKServer.
          {'\n\n'}
          Default REST API port: 19023. Default credentials: user / password.
          {'\n\n'}
          Your ATAK / WinTAK / iTAK / CivTAK device connects to FTS on port 8087 (TCP) or 8089 (SSL).
        </Text>
      </View>

    </ScrollView>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07110c',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },

  // Header
  header: {
    gap: 6,
  },
  backBtn: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  backText: {
    color: '#91e6a3',
    fontSize: 14,
    fontWeight: '900',
  },
  kicker: {
    color: '#8fbf8f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  title: {
    color: '#f2f5ef',
    fontSize: 30,
    fontWeight: '900',
  },

  // Card base
  card: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    gap: 10,
  },
  cardKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    color: '#f2f5ef',
    fontSize: 15,
    fontWeight: '800',
  },

  // Config display
  configLine: {
    color: '#aeb8aa',
    fontSize: 13,
    fontWeight: '700',
  },
  configValue: {
    color: '#f2f5ef',
    fontWeight: '900',
  },
  editBtn: {
    backgroundColor: '#102d1a',
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  editBtnText: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
  },

  // Edit form
  editForm: {
    gap: 8,
  },
  formLabel: {
    color: '#dfe8da',
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#07110c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#26382c',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#102d1a',
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#91e6a3',
    fontSize: 14,
    fontWeight: '900',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1a0f0f',
    borderWidth: 1,
    borderColor: '#5a2a2a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ffb86b',
    fontSize: 14,
    fontWeight: '900',
  },

  // Actions grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: '47%',
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    minHeight: 72,
    justifyContent: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnTitle: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  actionBtnSub: {
    color: '#aeb8aa',
    fontSize: 11,
    fontWeight: '700',
  },
  pingOk: {
    color: '#91e6a3',
    fontSize: 20,
    fontWeight: '900',
  },
  pingFail: {
    color: '#F44336',
    fontSize: 20,
    fontWeight: '900',
  },

  // Team positions
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countBadge: {
    backgroundColor: '#102d1a',
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },

  // CoT row
  cotRow: {
    backgroundColor: '#07110c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#213c2b',
    padding: 12,
    gap: 4,
  },
  cotRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cotCallsign: {
    color: '#f2f5ef',
    fontSize: 14,
    fontWeight: '900',
  },
  teamChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  teamChipText: {
    fontSize: 11,
    fontWeight: '900',
  },
  staleChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  staleChipText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '900',
  },
  cotCoords: {
    color: '#aeb8aa',
    fontSize: 12,
    fontWeight: '700',
  },

  // Info card
  infoCard: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#213c2b',
    gap: 8,
  },
  infoTitle: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoText: {
    color: '#aeb8aa',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});
