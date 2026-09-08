import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';
import { fadeUp } from '../../motion/variants';

// Restores this tab's last scroll position on mount, remembers the current
// one right before it's replaced. `positions` is a single Map owned by
// PageTransition, so it survives every tab switch, not just this one.
function ScrollMemory({ tabKey, positions }) {
  useEffect(() => {
    const positionsMap = positions.current;
    window.scrollTo(0, positionsMap.get(tabKey) ?? 0);
    return () => positionsMap.set(tabKey, window.scrollY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// Wraps the active tab's content so switching reads as a native page
// transition instead of a hard swap. `mode="wait"` fully unmounts the
// outgoing tab before mounting the next — deliberate, since Ghost Mode sync
// and the profile refresh both depend on the mount-time refetch each view
// already does; overlapping enter/exit would fire that refetch too early.
function PageTransition({ tabKey, children }) {
  const m = useAppMotion();
  const scrollPositions = useRef(new Map());

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={m.base}
      >
        <ScrollMemory tabKey={tabKey} positions={scrollPositions} />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
