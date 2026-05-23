# Sentinel Ready Design System

## 1. Product Direction

Sentinel Ready should feel like Strava crossed with ATAK and Garmin Connect. The interface must be dark, map-first, fast to read outdoors, and focused on tactical fitness, rucking, route awareness, readiness, training load, and operational performance.

The product should not feel like a generic gym tracker. It should feel like a mission-ready performance platform for running, rucking, military fitness, endurance tracking, route planning, team training, and operational readiness.

Design keywords:

- Mission-ready
- Map-first
- Tactical fitness
- Orange route energy
- Bold performance metrics
- Clean dashboards
- Outdoor readable
- Data-rich but uncluttered
- Calm, serious, operational

## 2. Core UI Principles

### 2.1 Map First

Maps should be treated as a primary interface, not a decoration. Route lines, elevation, location, terrain, distance, and movement history should be visually prominent. When in doubt, give the map more space and move secondary details into bottom cards, chips, or expandable panels.

### 2.2 Metrics Must Be Instantly Readable

Key performance numbers should be large, bold, and easy to scan while moving. Distance, time, pace, speed, elevation, heart rate, readiness, load, and completion status should use strong numeric hierarchy.

### 2.3 Dark Tactical Base

Use a dark interface across the app. The dark background should reduce glare, support outdoor use, and make orange route lines and performance alerts stand out clearly.

### 2.4 Orange Means Action and Movement

Orange is the primary active colour. Use it for selected states, route lines, primary buttons, active tabs, progress lines, record actions, route highlights, and key calls to action.

### 2.5 Cards Organise the Mission

Cards should group information into clear blocks. Each card should have one dominant purpose. Avoid overloading cards with too many competing elements.

### 2.6 Keep the Existing Functionality

The design system is a visual and UX layer. It should not remove current screens, routes, training logic, data logic, tests, or app features. Update styling and layout progressively using reusable tokens and components.

## 3. Colour System

The app currently uses a tactical dark green and gold style. Move the system towards a darker Strava-inspired tactical orange system while retaining military seriousness.

### 3.1 Primary Tokens

```ts
export const DS = {
  bgPrimary: '#0F1115',
  bgSecondary: '#171A1F',
  bgCard: '#1E2229',
  bgElevated: '#252A33',
  bgOverlay: 'rgba(15, 17, 21, 0.92)',

  orange: '#FC4C02',
  orangeSoft: '#FF7A3D',
  orangeMuted: 'rgba(252, 76, 2, 0.16)',
  orangeBorder: 'rgba(252, 76, 2, 0.38)',

  textPrimary: '#FFFFFF',
  textSecondary: '#A7ADB8',
  textMuted: '#6F7785',
  textDisabled: '#454B55',

  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  success: '#35C759',
  warning: '#F5A623',
  danger: '#FF453A',
  info: '#2F80ED',

  mapRoute: '#FC4C02',
  mapRouteAlt: '#FFB08A',
  mapRouteInactive: 'rgba(132, 147, 166, 0.78)',
  mapBackground: '#101820',
  mapGrid: 'rgba(255, 255, 255, 0.06)',
  mapTerrain: '#1D332C',

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 999,
  },
};
```

### 3.2 Colour Usage

| Use | Token | Rule |
|---|---|---|
| Main app background | `bgPrimary` | Use for full-screen base |
| Screen sections | `bgSecondary` | Use behind grouped content |
| Cards | `bgCard` | Use for metric and content cards |
| Raised overlays | `bgElevated` | Use for map controls and modal surfaces |
| Route lines | `mapRoute` | Use orange for active movement routes |
| Inactive route | `mapRouteInactive` | Use for cropped or unselected route sections |
| Primary action | `orange` | Use for main CTA buttons |
| Success state | `success` | Use for pass, ready, completed |
| Warning state | `warning` | Use for caution, fatigue, partial completion |
| Danger state | `danger` | Use for failed, stop, high risk |

## 4. Typography

Use a modern system sans-serif. Keep text clean, direct, and readable.

Recommended typography behaviour:

- Large numbers should be very bold.
- Labels should be small, uppercase, and muted.
- Titles should be short and strong.
- Avoid long paragraphs on mobile dashboards.
- Use sentence case for normal interface text.
- Use uppercase only for labels, chips, tags, and operational status.

### 4.1 Type Scale

| Name | Size | Weight | Use |
|---|---:|---:|---|
| Display XL | 56–72 | 800 | Speed, timer, major live metric |
| Display L | 40–48 | 800 | Distance, readiness, main activity score |
| Heading | 24–30 | 800 | Screen titles |
| Section | 18–20 | 700 | Card and section headings |
| Body | 14–16 | 400–500 | Normal text |
| Label | 10–12 | 700–800 | Metric labels, chip labels, tabs |
| Caption | 11–13 | 400–500 | Secondary context |

Example:

```ts
export const Type = {
  displayXL: { fontSize: 64, fontWeight: '800', letterSpacing: -1.5 },
  displayL: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  heading: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  section: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
};
```

## 5. Layout System

### 5.1 Spacing

Use consistent spacing across the app:

- 4px: tiny separation
- 8px: tight internal spacing
- 12px: chip/card internal spacing
- 16px: standard card padding
- 24px: section spacing
- 32px: major screen spacing

### 5.2 Radius

Use softer, modern rounded corners instead of sharp military panels:

- Small chips: 999px pill radius
- Small controls: 8px
- Standard cards: 18px
- Map cards and modals: 24px

### 5.3 Shadows and Borders

Prefer subtle borders over heavy shadows. On dark UI, shadows should be soft and restrained.

```ts
export const Effects = {
  cardBorder: {
    borderWidth: 1,
    borderColor: DS.border,
  },
  orangeGlow: {
    shadowColor: DS.orange,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};
```

## 6. Core Components

### 6.1 AppShell

The AppShell provides the standard screen structure.

Rules:

- Use dark background.
- Respect safe areas.
- Keep bottom tab navigation clear.
- Use consistent horizontal padding unless the screen is map-first.
- Map-first screens may go edge-to-edge.

### 6.2 BottomNav

The bottom navigation should feel closer to Strava but with tactical naming.

Recommended tabs:

- Command
- Maps / Ruck
- Record
- Training
- You

Rules:

- Active item uses orange.
- Inactive items use muted grey.
- Record may be visually stronger.
- Labels should be short.
- Avoid more than five primary tabs where possible. If more sections are needed, place them inside Command or You.

### 6.3 MetricCard

Metric cards show one major value and supporting context.

Structure:

- Small uppercase label
- Large numeric value
- Unit
- Optional trend or status tag

Example content:

- Distance: 6.10 km
- Time: 01:03:15
- Pace: 5:42 /km
- Elevation: 412 m
- Load: 78

### 6.4 ActivityCard

Activity cards should resemble a dark Strava activity feed.

Content:

- Avatar or unit/team icon
- Activity type
- Date and location
- Activity title
- Metric row
- Map preview with orange route line
- Badges or achievements
- Optional comments/reactions

Rules:

- Map preview should be prominent.
- Keep metric labels compact.
- Use orange only for meaningful activity highlights.

### 6.5 RouteMapCard

Used on route selection and planning screens.

Content:

- Route preview or map background
- Route title
- Difficulty tag
- Distance
- Elevation gain
- Estimated time
- Surface or terrain
- Start distance from current location

### 6.6 FilterChip

Used for map filters, time ranges, and activity categories.

States:

- Default: dark card with light border
- Active: orange border and orange text
- Disabled: muted text and low opacity

### 6.7 PrimaryButton

Primary buttons should be orange and full-width where action completion matters.

Examples:

- Start Ruck
- Save Route
- View Analysis
- Create Route
- Log Session

### 6.8 IntelligenceModal

A clean modal used for AI summaries and performance feedback.

Rules:

- Use white or very light surface for contrast when presenting an AI coach insight.
- Dim the dark background.
- Keep text short and useful.
- Use one primary button and one secondary feedback link.

Example:

Title: Athlete Intelligence

Message: Strong ruck session. Your pace stayed controlled while elevation increased, which suggests good load management. Recovery should focus on calves, hips, and hydration.

Primary button: Got It

Secondary action: Share feedback

## 7. Screen Patterns

### 7.1 Command Dashboard

Purpose: daily overview and readiness.

Recommended sections:

- Daily readiness card
- Weekly snapshot
- Next training session
- Recent activity
- Ruck readiness
- Recovery status
- Alerts or tasks

Hero metrics:

- Readiness
- Weekly distance
- Training load
- Recovery
- Activities completed

### 7.2 Map / Ruck Screen

Purpose: route planning and movement awareness.

Layout:

- Full-screen dark map
- Orange route line
- Top filter chips
- Right-side map controls
- Bottom route card
- Floating Create Route button

Controls:

- Layers
- Terrain
- 3D
- Locate me
- Bookmark
- Create route

### 7.3 Record Screen

Purpose: outdoor live activity tracking.

Layout:

- Huge timer
- Huge speed or pace
- Large distance
- Secondary metrics below
- Orange stop/pause button
- Minimal distractions

Metrics:

- Time
- Speed or pace
- Distance
- Elevation
- Heart rate
- Load

### 7.4 Activity Detail Screen

Purpose: review one session.

Layout:

- Header with back/share/options
- Map preview
- Metric grid
- View Analysis button
- Splits
- Heart rate
- Elevation
- Route
- Notes

### 7.5 Progress Screen

Purpose: performance over time.

Layout:

- Progress / Activities tabs
- Time range chips: 7D, 1M, 3M, 6M, 1Y
- Weekly stats
- Orange line chart
- Goals
- Best efforts

### 7.6 Tests Screen

Purpose: military fitness standards and benchmarks.

Layout:

- Test category chips
- Current pass/fail status
- Score cards
- History chart
- Next required test
- Tactical notes

Use status colour clearly:

- Pass: green
- Warning: amber
- Fail: red

### 7.7 Recovery Screen

Purpose: readiness, fatigue, and rest.

Layout:

- Recovery score
- Sleep/rest notes
- Soreness or fatigue status
- Suggested session intensity
- Mobility recommendation

## 8. Map Design

The map style is central to the brand.

Rules:

- Active route line is orange.
- Selected route should be thick and high contrast.
- Unselected or cropped route should be grey/blue muted.
- Start marker should use green.
- Finish marker should use orange or red depending on context.
- Map controls should be round or pill-shaped dark overlays.
- Use terrain/topographic texture where possible.

Recommended map overlay components:

- Route filter chips
- Current location pill
- Route card bottom sheet
- Layer controls
- Create route button
- Distance/elevation summary strip

## 9. Iconography

Use simple, sharp icons. Avoid cartoon-style graphics.

Recommended icon meanings:

- Shield: readiness / test / tactical status
- Map: route / navigation
- Flame: effort / intensity
- Pulse: recovery / heart rate
- Dumbbell: strength
- Boot / walk / backpack: ruck
- Flag: finish / milestone
- Trophy / medal: best effort
- Layers: map layers
- Crosshair: locate me

## 10. Motion and Interaction

Motion should be restrained and functional.

Use subtle animation for:

- Card entry
- Bottom sheet expansion
- Progress rings
- Record button state
- Map card selection
- Intelligence modal appearance

Avoid excessive bouncing, playful animation, or anything that makes the app feel less serious.

## 11. Accessibility

Requirements:

- Maintain strong contrast on dark screens.
- Do not rely only on colour for status.
- Use text labels with status colours.
- Tap targets should be at least 44px high/wide.
- Numeric metrics must remain readable in sunlight.
- Avoid tiny grey text for important information.

## 12. Implementation Guidance

### 12.1 Recommended File Structure

```text
constants/theme.ts
components/ui/AppShell.tsx
components/ui/MetricCard.tsx
components/ui/ActivityCard.tsx
components/ui/RouteMapCard.tsx
components/ui/FilterChip.tsx
components/ui/PrimaryButton.tsx
components/ui/MapControlButton.tsx
components/ui/IntelligenceModal.tsx
components/ui/SectionHeader.tsx
```

### 12.2 Migration Plan

1. Update `constants/theme.ts` with the new DS tokens.
2. Replace gold accent usage with orange accent usage.
3. Standardise cards using `MetricCard`, `ActivityCard`, and `RouteMapCard`.
4. Reduce overloaded tab navigation if practical.
5. Make maps visually dominant on ruck/route screens.
6. Use bold display metrics on record and dashboard screens.
7. Add filter chips and bottom cards on map-first screens.
8. Run typecheck, lint, tests, and web build.

### 12.3 Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build:web
npm run verify
```

## 13. Coding Agent Prompt

Use this prompt with Gemini Code, Cursor, Codex, RuFlo, or another coding agent:

```text
Apply the Sentinel Ready design system from DESIGN.md to the existing Expo React Native app.

Make the app feel like Strava crossed with ATAK and Garmin Connect: dark, map-first, orange route lines, bold performance metrics, mission-ready dashboards, and clean tactical fitness cards.

Do not remove existing features, routes, screens, tests, state logic, or data logic. This is a visual and UX refactor. Keep the app working.

Implementation priorities:
1. Update constants/theme.ts so DS uses the new dark tactical orange tokens from DESIGN.md.
2. Replace the current gold-led tactical palette with orange-led performance tokens.
3. Create reusable UI components where missing: AppShell, MetricCard, ActivityCard, RouteMapCard, FilterChip, PrimaryButton, MapControlButton, IntelligenceModal, and SectionHeader.
4. Apply the new components progressively across dashboard, ruck/map, training, log, plan, tests, and recovery screens.
5. Make the ruck/map screen map-first with orange route lines, dark map overlays, top filter chips, right-side map controls, and bottom route cards.
6. Make the dashboard feel like a mission command performance dashboard with weekly snapshot, readiness, training load, recent activity, and clear metrics.
7. Make the record/log experience use huge readable numbers, strong spacing, and orange primary action buttons.
8. Keep typography bold for numbers and muted for labels.
9. Keep all screens mobile-first and outdoor-readable.
10. Run npm run typecheck, npm run lint, npm run test, and npm run build:web. Fix any errors caused by the design changes.
```

## 14. Definition of Done

The redesign is complete when:

- The app has a consistent dark tactical orange visual identity.
- Route lines and active states use orange.
- Cards, buttons, chips, and map controls share the same design language.
- Main metrics are bold and easy to read.
- Map screens feel central to the product.
- The dashboard feels mission-ready, not generic.
- No existing app functionality has been removed.
- Typecheck, lint, tests, and web build pass.
