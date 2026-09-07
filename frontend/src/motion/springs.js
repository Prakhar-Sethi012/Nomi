// Shared motion vocabulary. Every animated component pulls its transition from
// here (via useAppMotion) so timing stays consistent across the app.
//
// Damping ratios were chosen to sit where iOS does — snappy/pop overshoot
// slightly, sheet is near-critical because iOS sheets barely bounce.

export const springs = {
  // Taps, toggles, small state flips. ζ ≈ 0.75
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  // List reflows and layout shifts. ζ ≈ 0.81
  gentle: { type: 'spring', stiffness: 260, damping: 26 },
  // Sheet and panel travel. ζ ≈ 0.92
  sheet: { type: 'spring', stiffness: 300, damping: 32 },
  // Confirmations and success moments. ζ ≈ 0.49
  pop: { type: 'spring', stiffness: 500, damping: 22 },
};

// iOS presentation curve — used for fades and anything that shouldn't bounce.
export const EASE_IOS = [0.32, 0.72, 0, 1];

export const tweens = {
  fast: { duration: 0.15, ease: EASE_IOS },
  base: { duration: 0.18, ease: EASE_IOS },
  slow: { duration: 0.3, ease: EASE_IOS },
};

export const transitions = { ...springs, ...tweens };
