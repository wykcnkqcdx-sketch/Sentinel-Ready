/**
 * Design System (DS) - Sentinel Ready Tactical Platform
 * Centralized theme constants to maintain a consistent UI/UX.
 */
export const DS = {
  // Backgrounds
  bgPrimary: '#050e09',      // Deepest tactical dark green/black
  bgCard: '#0c1008',         // Standard card/surface background
  bgCardAlt: '#141810',      // Elevated or alternating card background
  
  // Borders
  border: 'rgba(181,133,44,0.12)', // Subtle gold/olive border for standard separation
  borderHighlight: 'rgba(181,133,44,0.3)', // Stronger border for active/focused elements

  // Accents
  gold: '#B5852C',           // Primary tactical gold (buttons, main accents)
  goldSoft: '#F4BD5F',       // Bright/soft gold (headers, highlights, active states)
  
  // Typography Colors
  textPrimary: '#FFFFFF',    // Main readable text
  textSecondary: '#b8c0b0',  // Muted/secondary text (descriptions, sub-labels)
  textMuted: '#4a5e4a',      // Heavily muted text (inactive, disabled)
  
  // Status Indicators
  success: '#91e6a3',        // Tactical green (Systems Operational, Pass)
  warning: '#ffaa44',        // Amber warning (Fatigue, Monitor)
  danger: '#e05050',         // Critical red (Fail, Stop)
  
  // (Optional) Standardized layout properties to add over time
  spacing: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  borderRadius: 4,
};