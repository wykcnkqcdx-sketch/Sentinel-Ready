import type { WeekSummary, WeeklyLoadRisk } from '@/src/utils/trainingLogUtils';
import type { TrainingInsight } from '@/src/utils/insightUtils';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ---------- Brand constants ----------
const B = {
  bgScreen:  '#080c05',
  bgCard:    '#0c1008',
  bgPanel:   '#080c05',
  gold:      '#B5852C',
  white:     '#FFFFFF',
  body:      '#b8c0b0',
  borderSub: 'rgba(181,133,44,0.12)',
  borderAct: 'rgba(181,133,44,0.5)',
  amber:     '#ffaa44',
  red:       '#e05050',
  green:     '#5E7A2F',
} as const;

// ---------- Utility ----------
const GoldRule = () => (
  <View style={{ height: 1, backgroundColor: B.gold, opacity: 0.55, marginVertical: 2 }} />
);

function sessionColor(sessions: number, target: number): string {
  if (sessions >= target) return B.green;
  if (sessions >= 2) return B.amber;
  return B.red;
}

// ---------- Sessions Card ----------
type SessionsCardProps = {
  week: WeekSummary;
  target?: number;
};

export const SessionsCard = memo(function SessionsCard({ week, target = 4 }: SessionsCardProps) {
  const { total, ruck, strength, run, recovery, mobility } = week;
  const pct = Math.min(total / target, 1);
  const color = sessionColor(total, target);

  return (
    <View style={s.card}>
      <Text style={s.kicker}>SESSIONS</Text>
      <GoldRule />
      <View style={s.sessionsRow}>
        <Text style={[s.bigNumber, { color }]}>{total}</Text>
        <Text style={s.target}>/ {target}</Text>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={s.categoryRow}>
        {ruck > 0 ? `Ruck ${ruck}  ` : ''}
        {strength > 0 ? `Strength ${strength}  ` : ''}
        {run > 0 ? `Run ${run}  ` : ''}
        {(recovery + mobility) > 0 ? `Recovery ${recovery + mobility}` : ''}
      </Text>
    </View>
  );
});

// ---------- Readiness Card ----------
type ReadinessCardProps = {
  thisWeek: WeekSummary;
  lastWeek: WeekSummary;
};

function readinessPct(avg: string): number {
  const n = Number(avg);
  if (Number.isNaN(n) || n === 0) return 0;
  return Math.round((n / 10) * 100);
}

export const ReadinessCard = memo(function ReadinessCard({ thisWeek, lastWeek }: ReadinessCardProps) {
  const pct = readinessPct(thisWeek.averageReadiness);
  const prevPct = readinessPct(lastWeek.averageReadiness);
  const diff = pct - prevPct;

  let badgeColor: string = B.amber;
  let badgeLabel = 'AMBER';
  if (pct >= 70) { badgeColor = B.green; badgeLabel = 'GREEN'; }
  else if (pct < 50 && pct > 0) { badgeColor = B.red; badgeLabel = 'RED'; }
  else if (pct === 0) { badgeLabel = 'NO DATA'; badgeColor = B.body; }

  const trendArrow = diff > 5 ? '↑' : diff < -5 ? '↓' : '→';
  const trendColor = diff > 5 ? B.green : diff < -5 ? B.red : B.body;

  return (
    <View style={s.card}>
      <Text style={s.kicker}>READINESS</Text>
      <GoldRule />
      <View style={s.readinessRow}>
        <Text style={[s.bigNumber, { color: badgeColor }]}>
          {pct > 0 ? `${pct}%` : '--'}
        </Text>
        <View style={{ gap: 6, alignItems: 'flex-end' }}>
          <View style={[s.badge, { borderColor: badgeColor + '66', backgroundColor: badgeColor + '18' }]}>
            <Text style={[s.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
          {prevPct > 0 && (
            <Text style={[s.trendArrow, { color: trendColor }]}>
              {trendArrow} vs last week
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

// ---------- Load Risk Card ----------
type LoadRiskCardProps = {
  risk: WeeklyLoadRisk;
};

export const LoadRiskCard = memo(function LoadRiskCard({ risk }: LoadRiskCardProps) {
  const isWarn = risk.status === 'high' || risk.status === 'moderate';
  const topBorderColor = risk.status === 'high' ? B.red : risk.status === 'moderate' ? B.amber : B.gold;

  return (
    <View style={[s.card, { borderTopColor: topBorderColor, borderTopWidth: 2 }]}>
      <Text style={s.kicker}>LOAD RISK</Text>
      <GoldRule />
      <View style={s.loadRiskRow}>
        <View style={[s.badge, {
          borderColor: (isWarn ? topBorderColor : B.green) + '66',
          backgroundColor: (isWarn ? topBorderColor : B.green) + '18',
        }]}>
          <Text style={[s.badgeText, { color: isWarn ? topBorderColor : B.green }]}>
            {risk.label.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[s.bodyText, isWarn && { color: B.amber }]}>{risk.message}</Text>
      {risk.factors.length > 0 && risk.status !== 'no-data' && (
        <Text style={s.factorText}>{risk.factors[0]}</Text>
      )}
    </View>
  );
});

// ---------- Category Split Card ----------
type CategorySplitCardProps = {
  week: WeekSummary;
};

type CatDef = { key: keyof WeekSummary; label: string; color: string };
const CATS: CatDef[] = [
  { key: 'ruck',      label: 'Ruck',     color: '#B5852C' },
  { key: 'strength',  label: 'Strength', color: '#5E7A2F' },
  { key: 'run',       label: 'Run',      color: '#4A8FA8' },
  { key: 'recovery',  label: 'Recovery', color: '#7A7A2F' },
  { key: 'mobility',  label: 'Mobility', color: '#4A6A4A' },
  { key: 'test',      label: 'Test',     color: '#8A4A4A' },
];

export const CategorySplitCard = memo(function CategorySplitCard({ week }: CategorySplitCardProps) {
  const totals = CATS.map((c) => ({ ...c, count: (week[c.key] as number) ?? 0 }));
  const total = totals.reduce((s, c) => s + c.count, 0);
  const active = totals.filter((c) => c.count > 0);

  return (
    <View style={s.card}>
      <Text style={s.kicker}>CATEGORY SPLIT</Text>
      <GoldRule />
      {total === 0 ? (
        <Text style={s.bodyText}>No sessions logged this week.</Text>
      ) : (
        <>
          <View style={s.splitBar}>
            {active.map((c) => (
              <View
                key={c.key}
                style={[s.splitSegment, {
                  flex: c.count,
                  backgroundColor: c.color,
                }]}
              />
            ))}
          </View>
          <View style={s.legendRow}>
            {active.map((c) => (
              <View key={c.key} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c.color }]} />
                <Text style={s.legendText}>{c.label} {c.count}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
});

// ---------- Top Insight Card ----------
type TopInsightCardProps = {
  insight: TrainingInsight;
};

export const TopInsightCard = memo(function TopInsightCard({ insight }: TopInsightCardProps) {
  const isWarn = insight.severity === 'warning';
  const isGood = insight.severity === 'good';
  const accentColor = isWarn ? B.amber : isGood ? B.green : B.gold;

  return (
    <View style={[s.card,
      isWarn && { borderTopColor: B.amber, borderTopWidth: 2, backgroundColor: '#0e0c08' },
    ]}>
      <Text style={s.kicker}>TOP INSIGHT</Text>
      <GoldRule />
      <Text style={[s.cardTitle, { color: accentColor }]}>{insight.title}</Text>
      <Text style={s.bodyText}>{insight.message}</Text>
    </View>
  );
});

// ---------- Styles ----------
const s = StyleSheet.create({
  card: {
    backgroundColor: B.bgCard,
    borderRadius: 6,
    borderTopWidth: 2,
    borderTopColor: B.gold,
    borderWidth: 1,
    borderColor: B.borderSub,
    padding: 16,
    gap: 10,
  },
  kicker: {
    color: B.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sessionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  target: {
    color: B.body,
    fontSize: 22,
    fontWeight: '700',
    paddingBottom: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(181,133,44,0.18)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  categoryRow: {
    color: B.body,
    fontSize: 13,
    fontWeight: '700',
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  trendArrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bodyText: {
    color: B.body,
    fontSize: 13,
    lineHeight: 19,
  },
  factorText: {
    color: B.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  splitBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  splitSegment: {
    height: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    color: B.body,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
});
