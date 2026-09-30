// Thin wrapper over the Vibration API. iOS Safari doesn't implement it, so
// every call is a silent no-op there — treat haptics as an enhancement on
// Android/Chrome, never as the only signal that something happened.

const canVibrate = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const fire = (pattern) => {
  if (!canVibrate()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
};

export const haptics = {
  // Lightest tier — scroll/dial detents (a new slot centering), fired
  // once per crossing rather than continuously.
  selection: () => fire(5),
  // Standard taps: buttons, tabs, toggles.
  light: () => fire(10),
  tap: () => fire(8),
  // Primary actions with a real side effect worth a firmer confirmation
  // (e.g. attendance logging) without escalating to a full pattern.
  medium: () => fire(25),
  success: () => fire([12, 40, 18]),
  warning: () => fire([16, 60, 16]),
  error: () => fire([24, 50, 24, 50, 24]),
  stop: () => fire(0),
};
