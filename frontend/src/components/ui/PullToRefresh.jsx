import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';

const PULL_THRESHOLD = 70;

// Wraps a view with pull-to-refresh: drag down from the top, rubber-banded
// (no give upward, elastic downward), with a spinner whose rotation tracks
// drag progress. Releasing past the threshold calls the caller's existing
// refetch — this doesn't invent a new data-loading path, just a gesture
// that triggers the one already there.
//
// `className` lands on the outer wrapper so it can carry whatever flex
// sizing the call site needs (e.g. `flex-1 min-h-0 flex flex-col`) — the
// caller's own scrollable child (its `overflow-y-auto`) still does the
// actual scrolling; this just adds the rubber-band pull on top of it.
function PullToRefresh({ onRefresh, children, className = '' }) {
  const y = useMotionValue(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rotate = useTransform(y, [0, PULL_THRESHOLD], [0, 360]);
  const indicatorOpacity = useTransform(y, [0, 30], [0, 1]);

  const handleDragEnd = async () => {
    if (y.get() >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        style={{ opacity: isRefreshing ? 1 : indicatorOpacity }}
        className="absolute left-0 right-0 top-2 flex justify-center pointer-events-none z-10"
      >
        <motion.div
          style={!isRefreshing ? { rotate } : undefined}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : undefined}
          className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full"
        />
      </motion.div>
      <motion.div
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        style={{ y }}
        onDragEnd={handleDragEnd}
        className="h-full flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default PullToRefresh;
