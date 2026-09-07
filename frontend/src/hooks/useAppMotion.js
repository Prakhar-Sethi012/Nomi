import { useMemo } from 'react';
import { useReducedMotion } from 'motion/react';
import { transitions } from '../motion/springs';

const INSTANT = { duration: 0 };

// Returns the app's transitions, collapsed to instant when the user has asked
// for reduced motion. Components read timing from here instead of checking the
// preference themselves, so honouring it is the default rather than a step
// each new animation has to remember.
export function useAppMotion() {
  const prefersReduced = useReducedMotion();

  return useMemo(() => {
    if (!prefersReduced) return { ...transitions, reduced: false };

    const instant = {};
    for (const key of Object.keys(transitions)) instant[key] = INSTANT;
    return { ...instant, reduced: true };
  }, [prefersReduced]);
}
