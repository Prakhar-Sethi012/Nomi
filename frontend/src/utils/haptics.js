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
  selection: () => fire(5),
  tap: () => fire(8),
  success: () => fire([12, 40, 18]),
  warning: () => fire([16, 60, 16]),
  error: () => fire([24, 50, 24, 50, 24]),
  stop: () => fire(0),
};
