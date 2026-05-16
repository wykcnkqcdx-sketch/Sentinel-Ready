# Brainstorm plan (theme/consistency cleanup first)

## Objective
Improve maintainability and consistency with minimal behavioral risk by replacing hard-coded UI colors with centralized semantic tokens.

## Information gathered
- `constants/theme.ts` defines `Colors` (light/dark) and `Fonts`, but the app’s newer screens use many hard-coded hex values.
- `src/theme/colours.ts` defines a small palette (`background`, `surface`, `surfaceAlt`, `text`, `mutedText`, `amber`, `olive`, `pass`, `warning`, `fail`, `border`).
- `src/screens/RuckScreen.tsx` hard-codes many colors (backgrounds, borders, good/warn states).

## Plan (step-by-step)
1. Create semantic color tokens in `src/theme/tokens.ts` (or extend `src/theme/colours.ts`) mapping to existing palette values.
   - Start with the exact hex values already used in `RuckScreen` so UI looks identical.
   - Tokens examples: `bgScreen`, `bgPanel`, `borderPanel`, `textPrimary`, `textMuted`, `accentGood`, `accentWarn`, `accentNeutral`.
2. Update `src/screens/RuckScreen.tsx` to consume these tokens.
   - Replace `backgroundColor`, `borderColor`, `color` hex strings.
   - Keep spacing/layout/styles unchanged.
3. Run lint + unit tests to ensure no regressions.
4. (Optional next iteration) Apply the same token usage to `TrainingScreen.tsx` and `src/components/log/*`.

## Dependent files to edit
- `src/theme/colours.ts` (if extending)
- `src/screens/RuckScreen.tsx`
- New file: `src/theme/tokens.ts`

## Follow-up steps after edits
- `npm test`
- `npm run lint`


