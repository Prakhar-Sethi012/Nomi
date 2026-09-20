import { useEffect, useState } from 'react';
import { useMotionValue, useMotionValueEvent, animate } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// Its own transition, not `m.base` — the shared 0.18s tween other components
// pull from useAppMotion is tuned for taps/toggles, too quick to read as a
// deliberate "count up" on a headline stat like CGPA or the burn rate.
const COUNT_UP = { duration: 1.5, ease: 'easeOut' };

// A free stand-in for Motion+'s AnimateNumber: counts from the previous
// value to the new one instead of snapping, wherever a stat changes.
// `grouped` uses en-IN digit grouping (lakhs/crores) to match how currency
// is formatted everywhere else in the app; plain `decimals` covers CGPA and
// percentages.
function NumberRoll({ value, decimals = 0, prefix = '', suffix = '', grouped = false, className = '' }) {
  const m = useAppMotion();
  // Starts at 0 (not `value`) so the very first mount counts up too, not
  // just later updates — the motion value and its target were previously
  // the same number on mount, so `animate` had nothing to animate.
  const mv = useMotionValue(0);

  const format = (v) => (grouped
    ? v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : v.toFixed(decimals));

  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    const controls = animate(mv, value, m.reduced ? { duration: 0 } : COUNT_UP);
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useMotionValueEvent(mv, 'change', (latest) => setDisplay(format(latest)));

  return <span className={`tabular-nums ${className}`}>{prefix}{display}{suffix}</span>;
}

export default NumberRoll;
