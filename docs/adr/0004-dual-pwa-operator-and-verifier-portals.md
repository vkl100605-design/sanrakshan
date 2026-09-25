# ADR-0004: Dual Frontend PWAs (Operator Command Dashboard and Verifier Portal)

## Status
Accepted

## Context
Sanrakshan serves two fundamentally different personas in distinct physical environments:
1. **Control Room Emergency Operator**:
   - Operates on desktop multi-monitor setups with high-resolution screens and high-speed network connections.
   - Requires live map visualization, incident queues, detailed signal timelines, confidence explanations, and approval/override modals.
2. **Field Verifier (TMVN Volunteer / First Contact)**:
   - Operates on handheld smartphones in disaster-affected areas with potentially degraded, intermittent cellular connectivity.
   - Requires lightweight, battery-efficient, mobile-friendly touch interfaces with offline draft capability, safety consent notices, geolocation capture, and direct evidence photo uploads.

## Decision
We implement two separate Progressive Web Applications (PWAs) built on React with Vite:
1. `frontend/operator-pwa`:
   - Desktop-optimized, high-density emergency dashboard using dark-mode aesthetics for reduced eye fatigue during extended crisis shifts.
   - Geospatial mapping with interactive layers for active incidents, confidence heatmaps, verifiers, and simulated responder units.
2. `frontend/verifier-pwa`:
   - Mobile-first, lightweight PWA with offline-first ServiceWorker caching, geolocation sensor integration, and minimal data payload overhead.

## Consequences
### Positive
- Prevents bloat in mobile verifier bundles by decoupling heavy map and analytics libraries.
- Tailored UX and accessibility parameters for each environment (e.g., WCAG 2.1 AA high contrast, clear touch targets for mobile field verifiers).
- Independent development, testing, and deployment cycles for both portals.

### Negative
- Shared UI components or design tokens need to be mirrored or maintained in a lightweight common package.
