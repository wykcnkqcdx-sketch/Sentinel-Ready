import { TrainingCategory, TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type TrainingFilter = 'All' | TrainingCategory;
type SortMode = 'Newest' | 'Oldest' | 'Highest Readiness' | 'Lowest Readiness';

const filters: TrainingFilter[] = ['All', 'Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];
const sortModes: SortMode[] = ['Newest', 'Oldest', 'Highest Readiness', 'Lowest Readiness'];

function getReadinessNumber(readiness: string) {
  const score = Number(readiness);
  return Number.isNaN(score) ? 0 : score;
}

function isFatigueWatch(readiness: string) {
  const score = Number(readiness);
  return !Number.isNaN(score) && score <= 5;
}

function getReadinessLabel(readiness: string) {
  const score = Number(readiness);

  if (Number.isNaN(score)) {
    return 'Unknown';
  }

  if (score <= 3) {
    return 'Low';
  }

  if (score <= 5) {
    return 'Fatigue Watch';
  }

  if (score <= 7) {
    return 'Moderate';
  }

  return 'High';
}

function getDateValue(date: string) {
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}


function getNotesQualityMessage(notes: string) {
  const cleanNotes = notes.trim().toLowerCase();

  if (cleanNotes.length === 0) {
    return 'Missing notes';
  }

  const weakNotes = ['ok', 'okay', 'good', 'fine', 'grand', 'easy', 'hard', 'done', 'completed'];

  if (weakNotes.includes(cleanNotes)) {
    return 'Notes too brief';
  }

  if (cleanNotes.length < 15) {
    return 'Notes need more detail';
  }

  return '';
}

function getWeakLogReasons(log: TrainingLog) {
  const reasons: string[] = [];

  if (!log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
    reasons.push('date');
  }

  if (!log.type || log.type.trim().length < 3) {
    reasons.push('session type');
  }

  if (!log.duration || log.duration.trim().length < 3) {
    reasons.push('duration');
  }

  if (!log.distanceLoad || log.distanceLoad.trim().length < 5) {
    reasons.push('distance/load');
  }

  const notesIssue = getNotesQualityMessage(log.notes);
  if (notesIssue) {
    reasons.push(notesIssue.toLowerCase());
  }

  const readinessNumber = Number(log.readiness);
  if (Number.isNaN(readinessNumber) || readinessNumber < 1 || readinessNumber > 10) {
    reasons.push('readiness score');
  }

  return reasons;
}

function logNeedsImprovement(log: TrainingLog) {
  return getWeakLogReasons(log).length > 0;
}

function buildSummary(logs: TrainingLog[]) {
  const readinessScores = logs
    .map((log) => getReadinessNumber(log.readiness))
    .filter((score) => score > 0);

  const averageReadiness =
    readinessScores.length > 0
      ? (readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length).toFixed(1)
      : '0.0';

  return {
    total: logs.length,
    averageReadiness,
    ruck: logs.filter((log) => log.category === 'Ruck').length,
    strength: logs.filter((log) => log.category === 'Strength').length,
    run: logs.filter((log) => log.category === 'Run').length,
    recovery: logs.filter((log) => log.category === 'Recovery').length,
    fatigueWatch: logs.filter((log) => isFatigueWatch(log.readiness)).length,
    weakLogs: logs.filter((log) => logNeedsImprovement(log)).length,
  };
}


function calculateTrainingLogHealthScore(logs: TrainingLog[]) {
  if (logs.length === 0) {
    return 0;
  }

  const weakLogs = logs.filter((log) => logNeedsImprovement(log)).length;
  const fatigueLogs = logs.filter((log) => isFatigueWatch(log.readiness)).length;

  const readinessScores = logs
    .map((log) => getReadinessNumber(log.readiness))
    .filter((score) => score > 0);

  const averageReadiness =
    readinessScores.length > 0
      ? readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length
      : 0;

  const readinessScore = Math.round(averageReadiness * 10);
  const weakPenalty = Math.round((weakLogs / logs.length) * 35);
  const fatiguePenalty = Math.round((fatigueLogs / logs.length) * 15);

  const finalScore = readinessScore - weakPenalty - fatiguePenalty;

  if (finalScore > 100) {
    return 100;
  }

  if (finalScore < 0) {
    return 0;
  }

  return finalScore;
}

function getTrainingLogHealthLabel(score: number) {
  if (score >= 85) {
    return 'Excellent';
  }

  if (score >= 70) {
    return 'Healthy';
  }

  if (score >= 50) {
    return 'Needs Work';
  }

  return 'Poor Data';
}

function getTrainingLogHealthMessage(score: number) {
  if (score >= 85) {
    return 'Training data is strong. The app has enough detail for useful readiness and recovery review.';
  }

  if (score >= 70) {
    return 'Training data is usable. Improve weak notes and missing details to make analysis sharper.';
  }

  if (score >= 50) {
    return 'Training data needs work. Fix weak logs so the app can give better feedback.';
  }

  return 'Training data is too weak for reliable analysis. Add clearer notes, duration, load and readiness scores.';
}

function filterAndSortLogs(
  logs: TrainingLog[],
  activeFilter: TrainingFilter,
  searchQuery: string,
  sortMode: SortMode
) {
  const query = searchQuery.trim().toLowerCase();

  const filtered = logs.filter((log) => {
    const matchesFilter = activeFilter === 'All' || log.category === activeFilter;

    const searchableText = [
      log.date,
      log.category,
      log.type,
      log.duration,
      log.distanceLoad,
      log.readiness,
      log.notes,
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch = query.length === 0 || searchableText.includes(query);

    return matchesFilter && matchesSearch;
  });

  const weakFiltered = filtered.filter((log) => !showWeakLogsOnly || logNeedsImprovement(log));

  return weakFiltered.sort((a, b) => {
    if (sortMode === 'Oldest') {
      return getDateValue(a.date) - getDateValue(b.date) || a.id - b.id;
    }

    if (sortMode === 'Highest Readiness') {
      return getReadinessNumber(b.readiness) - getReadinessNumber(a.readiness) || b.id - a.id;
    }

    if (sortMode === 'Lowest Readiness') {
      return getReadinessNumber(a.readiness) - getReadinessNumber(b.readiness) || b.id - a.id;
    }

    return getDateValue(b.date) - getDateValue(a.date) || b.id - a.id;
  });
}

export default function LogScreen() {
  const { logs, isLoading, deleteLog } = useTraining();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<TrainingFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWeakLogsOnly, setShowWeakLogsOnly] = useState(false);

  const summary = buildSummary(logs);
  const trainingLogHealthScore = calculateTrainingLogHealthScore(logs);
  const trainingLogHealthLabel = getTrainingLogHealthLabel(trainingLogHealthScore);
  const trainingLogHealthMessage = getTrainingLogHealthMessage(trainingLogHealthScore);

  const visibleLogs = useMemo(
    () => filterAndSortLogs(logs, activeFilter, searchQuery, sortMode),
    [logs, activeFilter, searchQuery, sortMode, showWeakLogsOnly]
  );

  function clearSearchAndFilters() {
    setActiveFilter('All');
    setSortMode('Newest');
    setSearchQuery('');
    setShowWeakLogsOnly(false);
  }

  function confirmDeleteLog(log: TrainingLog) {
    Alert.alert(
      'Delete Training Log',
      `Delete this ${log.category} log from ${log.date}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLog(log.id),
        },
      ]
    );
  }

  const renderLogItem = ({ item }: { item: TrainingLog }) => {
    const fatigueWatch = isFatigueWatch(item.readiness);
    const weakLog = logNeedsImprovement(item);
    const weakReasons = getWeakLogReasons(item);

    return (
      <View style={fatigueWatch ? styles.logCardWarning : styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.logHeaderText}>
            <Text style={styles.logCategory}>{item.category}</Text>
            <Text style={styles.logTitle}>{item.type}</Text>
          </View>

          <View style={fatigueWatch ? styles.readinessBadgeWarning : styles.readinessBadge}>
            <Text style={fatigueWatch ? styles.readinessTextWarning : styles.readinessText}>
              {item.readiness}/10
            </Text>
          </View>
        </View>

        <View style={styles.logMetaRow}>
          <Text style={styles.logMeta}>{item.date}</Text>
          <Text style={styles.logMeta}>{item.duration}</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Distance / Load</Text>
          <Text style={styles.detailText}>{item.distanceLoad}</Text>
        </View>

        <Text style={styles.logNotes}>{item.notes}</Text>

        {weakLog ? (
          <View style={styles.weakLogBox}>
            <Text style={styles.weakLogTitle}>Weak Log</Text>
            <Text style={styles.weakLogText}>
              Improve: {weakReasons.join(', ')}
            </Text>
          </View>
        ) : null}

        <View style={styles.statusRow}>
          <Text style={fatigueWatch ? styles.statusWarning : styles.status}>
            {getReadinessLabel(item.readiness)}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editButton} onPress={() => router.push(`/edit-log/${item.id}`)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteLog(item)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading training logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleLogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>SENTINEL READY</Text>
            <Text style={styles.title}>Training Log</Text>
            <Text style={styles.subtitle}>
              Review saved sessions, readiness, fatigue watch and operational training balance.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/add-log')}>
              <Text style={styles.primaryButtonText}>Add Training Log</Text>
            </TouchableOpacity>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{summary.total}</Text>
                <Text style={styles.summaryLabel}>Total Logs</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{summary.averageReadiness}</Text>
                <Text style={styles.summaryLabel}>Avg Readiness</Text>
              </View>

              <View style={summary.fatigueWatch > 0 ? styles.summaryCardWarning : styles.summaryCard}>
                <Text style={summary.fatigueWatch > 0 ? styles.summaryNumberWarning : styles.summaryNumber}>
                  {summary.fatigueWatch}
                </Text>
                <Text style={summary.fatigueWatch > 0 ? styles.summaryLabelWarning : styles.summaryLabel}>
                  Fatigue Watch
                </Text>
              </View>
            </View>

            <View style={summary.weakLogs > 0 ? styles.weakSummaryCardWarning : styles.weakSummaryCard}>
              <View>
                <Text style={summary.weakLogs > 0 ? styles.weakSummaryNumberWarning : styles.weakSummaryNumber}>
                  {summary.weakLogs}
                </Text>
                <Text style={summary.weakLogs > 0 ? styles.weakSummaryLabelWarning : styles.weakSummaryLabel}>
                  Weak Logs Detected
                </Text>
              </View>

              <TouchableOpacity
                style={showWeakLogsOnly ? styles.weakFilterButtonActive : styles.weakFilterButton}
                onPress={() => setShowWeakLogsOnly((current) => !current)}
              >
                <Text style={showWeakLogsOnly ? styles.weakFilterButtonTextActive : styles.weakFilterButtonText}>
                  {showWeakLogsOnly ? 'Showing Weak' : 'Show Weak'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={trainingLogHealthScore < 60 ? styles.healthCardWarning : styles.healthCard}>
              <View style={styles.healthHeader}>
                <View>
                  <Text style={styles.healthKicker}>TRAINING LOG HEALTH</Text>
                  <Text style={trainingLogHealthScore < 60 ? styles.healthScoreWarning : styles.healthScore}>
                    {trainingLogHealthScore}/100
                  </Text>
                </View>

                <View style={trainingLogHealthScore < 60 ? styles.healthPillWarning : styles.healthPill}>
                  <Text style={trainingLogHealthScore < 60 ? styles.healthPillTextWarning : styles.healthPillText}>
                    {trainingLogHealthLabel}
                  </Text>
                </View>
              </View>

              <Text style={trainingLogHealthScore < 60 ? styles.healthMessageWarning : styles.healthMessage}>
                {trainingLogHealthMessage}
              </Text>
            </View>
