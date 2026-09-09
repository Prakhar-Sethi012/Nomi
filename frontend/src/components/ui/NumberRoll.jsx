import { useEffect, useState } from 'react';
import { useMotionValue, useMotionValueEvent, animate } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// A free stand-in for Motion+'s AnimateNumber: counts from the previous
// value to the new one instead of snapping, wherever a stat changes.
// `grouped` uses en-IN digit grouping (lakhs/crores) to match how currency
// is formatted everywhere else in the app; plain `decimals` covers CGPA and
// percentages.
function NumberRoll({ value, decimals = 0, prefix = '', suffix = '', grouped = false, className = '' }) {
  const m = useAppMotion();
  const mv = useMotionValue(value);

  const format = (v) => (grouped
    ? v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : v.toFixed(decimals));

  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    const controls = animate(mv, value, m.reduced ? { duration: 0 } : m.base);
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useMotionValueEvent(mv, 'change', (latest) => setDisplay(format(latest)));

  return <span className={`tabular-nums ${className}`}>{prefix}{display}{suffix}</span>;
}

export default NumberRoll;
