import { DS } from '@/constants/theme';
import { tokens as T } from '@/src/theme/tokens';
import { useTraining } from '@/src/screens/TrainingContext';
import { CATEGORY_COLORS } from '@/src/utils/adaptivePlanUtils';
import { buildCalendarMonth, getInitialYearMonth, nextMonth, prevMonth, type CalendarDay } from '@/src/utils/calendarUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DOW_LABELS = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MAX_LOAD = 7;

function DayCell({
  day,
  selected,
  onPress,
}: {
  day: CalendarDay;
  selected: boolean;
  onPress: () => void;
}) {
  const dots = day.logs.slice(0, 3);
  const overflow = Math.max(0, day.logs.length - 3);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.dayCell,
        day.isToday && styles.dayCellToday,
        selected && styles.dayCellSelected,
      ]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${day.date}, ${day.logs.length} sessions`}
      accessibilityState={{ selected }}
    >
      <Text style={[
        styles.dayNum,
        !day.isCurrentMonth && styles.dayNumGhost,
        day.isToday && styles.dayNumToday,
        selected && styles.dayNumSelected,
      ]}>
        {day.dayNum}
      </Text>
      {day.logs.length > 0 && (
        <View style={styles.dotRow}>
          {dots.map((log, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: CATEGORY_COLORS[log.category] ?? T.textAccent }]}
            />
          ))}
          {overflow > 0 && <Text style={styles.dotOverflow}>+{overflow}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { logs, isLoading } = useTraining();
  const init = getInitialYearMonth();
  const [year, setYear] = useState(init.year);
  const [month, setMonth] = useState(init.month);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calMonth = useMemo(() => buildCalendarMonth(logs, year, month), [logs, year, month]);

  const selectedLogs = useMemo(
    () => (selectedDate ? (logs.filter((l) => l.date === selectedDate)) : []),
    [selectedDate, logs],
  );

  function goBack() {
    const p = prevMonth(year, month);
    setYear(p.year);
    setMonth(p.month);
    setSelectedDate(null);
  }

  function goForward() {
    const n = nextMonth(year, month);
    setYear(n.year);
    setMonth(n.month);
    setSelectedDate(null);
  }

  if (isLoading) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={cal.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backBtnText}>[ ← BACK ]</Text>
            </TouchableOpacity>
            <View style={cal.calBadge}>
              <Text style={cal.calBadgeText}>[ OPS LOG ]</Text>
            </View>
          </View>
          <Text style={cal.kicker}>[ OPERATIONS CENTRE ]</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>OPS CALENDAR</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{calMonth.totalSessions}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={goBack} accessibilityRole="button" accessibilityLabel="Previous month">
            <Text style={styles.navBtnText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_NAMES[month - 1]} {year}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={goForward} accessibilityRole="button" accessibilityLabel="Next month">
            <Text style={styles.navBtnText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.dowRow}>
          {DOW_LABELS.map((d, i) => (
            <Text key={i} style={[styles.dowLabel, i >= 5 && styles.dowLabelWeekend]}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {calMonth.weeks.map((week, wi) => {
            const loadPct = Math.min(week.totalSessions / MAX_LOAD, 1);
            const loadColor = loadPct >= 0.8 ? DS.danger : loadPct >= 0.5 ? DS.warning : T.textAccent;
            return (
              <View key={wi}>
                <View style={styles.weekRow}>
                  {week.days.map((day, di) => (
                    <DayCell
                      key={di}
                      day={day}
                      selected={selectedDate === day.date}
                      onPress={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
                    />
                  ))}
                </View>
                {/* Week load bar */}
                <View style={styles.loadBarTrack}>
                  <View style={[styles.loadBarFill, { width: `${loadPct * 100}%` as any, backgroundColor: loadColor }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Selected day detail */}
        {selectedDate && (
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <View style={styles.detailLine} />
              <Text style={styles.detailLabel}>{selectedDate}</Text>
              <View style={styles.detailLine} />
            </View>

            {selectedLogs.length === 0 ? (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyDayText}>NO SESSIONS</Text>
              </View>
            ) : (
              selectedLogs.map((log) => {
                const catColor = CATEGORY_COLORS[log.category] ?? T.textAccent;
                return (
                  <View key={log.id} style={styles.sessionRow}>
                    <View style={[styles.sessionAccent, { backgroundColor: catColor }]} />
                    <View style={styles.sessionContent}>
                      <View style={styles.sessionTitleRow}>
                        <Text style={styles.sessionType}>{log.type}</Text>
                        <View style={[styles.sessionCatBadge, { borderColor: catColor + '55' }]}>
                          <Text style={[styles.sessionCatText, { color: catColor }]}>{log.category.toUpperCase()}</Text>
                        </View>
                      </View>
                      {log.distanceLoad ? (
                        <Text style={styles.sessionMeta}>{log.distanceLoad}</Text>
                      ) : null}
                      <View style={styles.sessionChips}>
                        {Number(log.readiness) > 0 && (
                          <View style={styles.chip}>
                            <Text style={styles.chipLabel}>READ</Text>
                            <Text style={styles.chipValue}>{log.readiness}/10</Text>
                          </View>
                        )}
                        {log.duration ? (
                          <View style={styles.chip}>
                            <Text style={styles.chipLabel}>DUR</Text>
                            <Text style={styles.chipValue}>{log.duration}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const cal = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kicker: { color: DS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  calBadge: { borderWidth: 1, borderColor: 'rgba(94,122,47,0.5)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  calBadgeText: { color: '#5E7A2F', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark },
  content: { paddingBottom: 60 },

  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4, marginBottom: 8 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  backBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: { backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: T.textAccent, fontSize: 12, fontWeight: '900' },
  divider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { borderWidth: 1, borderColor: T.borderDim, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8 },
  navBtnText: { color: T.textHintDark, fontSize: 12, fontWeight: '900' },
  monthLabel: { color: T.textPrimaryDark, fontSize: 14, fontWeight: '900', letterSpacing: 2 },

  dowRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  dowLabel: { flex: 1, textAlign: 'center', color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  dowLabelWeekend: { color: '#2e5038' },

  grid: { paddingHorizontal: 12, gap: 2 },
  weekRow: { flexDirection: 'row' },
  loadBarTrack: { height: 2, marginHorizontal: 2, marginBottom: 6, backgroundColor: T.borderDim, borderRadius: 1, overflow: 'hidden' },
  loadBarFill: { height: 2, borderRadius: 1 },

  dayCell: { flex: 1, minHeight: 48, borderRadius: 4, borderWidth: 1, borderColor: 'transparent', padding: 4, alignItems: 'center', gap: 3 },
  dayCellToday: { borderColor: T.textAccent + '44', backgroundColor: T.textAccent + '0a' },
  dayCellSelected: { borderColor: '#3fc8e4' + '66', backgroundColor: '#3fc8e4' + '12' },
  dayNum: { color: T.textSubtle, fontSize: 12, fontWeight: '700' },
  dayNumGhost: { color: '#1e3826' },
  dayNumToday: { color: T.textAccent, fontWeight: '900' },
  dayNumSelected: { color: '#3fc8e4' },
  dotRow: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotOverflow: { color: T.textHintDark, fontSize: 7, fontWeight: '900' },

  detailSection: { paddingHorizontal: 16, marginTop: 8 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  detailLine: { flex: 1, height: 1, backgroundColor: '#1e3826' },
  detailLabel: { color: '#2e5a3a', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  emptyDay: { alignItems: 'center', paddingVertical: 20 },
  emptyDayText: { color: T.textHintDark, fontSize: 11, fontWeight: '900', letterSpacing: 3 },

  sessionRow: { flexDirection: 'row', marginBottom: 8, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, overflow: 'hidden', backgroundColor: T.bgPanelAlt },
  sessionAccent: { width: 3, flexShrink: 0 },
  sessionContent: { flex: 1, padding: 12, gap: 4 },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sessionType: { color: T.textPrimaryDark, fontSize: 13, fontWeight: '900', flex: 1 },
  sessionCatBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  sessionCatText: { fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  sessionMeta: { color: T.textSubtle, fontSize: 12, fontWeight: '700' },
  sessionChips: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  chipLabel: { color: '#2e5038', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  chipValue: { color: T.textSubtle, fontSize: 11, fontWeight: '900' },
});
