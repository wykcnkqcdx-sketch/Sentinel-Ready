---
name: Sentinel Tactical
colors:
  surface: '#0b1510'
  surface-dim: '#0b1510'
  surface-bright: '#313c35'
  surface-container-lowest: '#07100b'
  surface-container-low: '#141e18'
  surface-container: '#18221c'
  surface-container-high: '#222c26'
  surface-container-highest: '#2d3731'
  on-surface: '#dae5dc'
  on-surface-variant: '#d3c4b1'
  outline: '#9c8f7d'
  outline-variant: '#4f4537'
  surface-tint: '#f4bd5f'
  primary: '#f4bd5f'
  on-primary: '#432c00'
  primary-container: '#b9882f'
  secondary: '#c2cba1'
  secondary-container: '#444c2c'
  tertiary: '#21e371'
  tertiary-container: '#00a74e'
  error: '#ffb4ab'
  error-container: '#93000a'
  background: '#0b1510'
  on-background: '#dae5dc'
  surface-variant: '#2d3731'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 34px
    fontWeight: '900'
    lineHeight: 38px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '900'
    lineHeight: 32px
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.03em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '800'
    lineHeight: 14px
    letterSpacing: 0.15em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  gutter: 12px
  margin-mobile: 10px
  margin-desktop: 18px
---

## Brand & Style

The design system is built on a philosophy of Tactical Readiness. It evokes an official field report or mission-critical operational dashboard. The aesthetic is disciplined, precise, and authoritative, prioritizing information density and rapid data ingestion over decorative whitespace.

The visual style is a hybrid of Modern Corporate and Functional Brutalism. It uses sharp-edged containers, high-contrast typography, and structural wireframes to create a UI that feels like specialized equipment.

## Core Rules

- Dark-mode-first canvas: `#050e09` for the main background and `#000000` for inset wells.
- Tactical Gold `#B5852C` is the primary interactive accent.
- Standard panels use Dark Foliage Green `#111d15`.
- Structural borders use Army Green `#3F4727`.
- Typography uses Space Grotesk for headlines, Inter for body copy, and JetBrains Mono for labels/status/data.
- Layouts use a compact 4px grid rhythm and a max desktop width of 820px.
- Hierarchy comes from tonal layering and wireframe outlines rather than soft shadows.
- Buttons and inputs use sharp 4px corners and minimum 48px touch targets.
- Status chips should be rectangular blocks with indicator lights, not pills.
- Navigation uses a persistent bottom bar with a 1px gold top border.
