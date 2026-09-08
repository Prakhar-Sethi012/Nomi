// Value-only variants — no transitions baked in, so callers pass one from
// useAppMotion() and reduced-motion handling stays in a single place.
//
// panelIn is the exception: its exit needs a plain 150ms tween rather than
// the spring its entrance uses (an alert should snap shut, not bounce), so
// that one transition is baked into the variant itself.

import { tweens } from './springs';

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

// Panel/alert presentation — the PIN dialog and sheets build on this.
export const panelIn = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 0, transition: tweens.fast },
};

export const staggerParent = (stagger = 0.04, delayChildren = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

// The iOS lockscreen "wrong passcode" shake.
export const shake = {
  x: [0, -10, 10, -8, 8, -4, 4, 0],
  transition: { duration: 0.4 },
};
