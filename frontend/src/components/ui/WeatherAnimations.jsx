import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const DROP_COUNT = 7;

// A handful of raindrops falling top to bottom, staggered so they don't all
// land in sync. Plays a few times then just stops — this is a one-shot
// "weather just loaded" moment, not a permanent background loop.
export function RainOverlay() {
  return (
    <>
      {Array.from({ length: DROP_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 w-[2px] h-5 rounded-full bg-gradient-to-b from-blue-300/0 via-blue-300/80 to-blue-400"
          style={{ left: `${(i / DROP_COUNT) * 90 + 5}%` }}
          initial={{ y: '-20%', opacity: 0 }}
          animate={{ y: '140%', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 0.9,
            repeat: 3,
            delay: i * 0.15,
            ease: 'easeIn',
          }}
        />
      ))}
    </>
  );
}

const CLOUDS = [
  { top: '20%', size: 56, duration: 5 },
  { top: '50%', size: 38, duration: 6.5 },
  { top: '75%', size: 46, duration: 5.5 },
];

// Three soft, blurred blobs drifting left-to-right at different heights and
// speeds so it reads as "clouds" rather than one shape sliding by.
export function CloudOverlay() {
  return (
    <>
      {CLOUDS.map((cloud, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/40 blur-md"
          style={{ top: cloud.top, width: cloud.size, height: cloud.size * 0.55 }}
          initial={{ x: '-30%', opacity: 0 }}
          animate={{ x: '130%', opacity: [0, 0.7, 0.7, 0] }}
          transition={{ duration: cloud.duration, delay: i * 1, ease: 'linear' }}
        />
      ))}
    </>
  );
}

const RAY_COUNT = 8;

// A sun that pops in, then glows and pulses a few times with rays radiating
// out from its center — reads as "brightening up" rather than a static icon.
export function SunOverlay() {
  return (
    <div className="w-full h-full flex items-center justify-end pr-8">
      <motion.div
        className="relative w-20 h-20"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-amber-300"
          style={{ filter: 'blur(18px)' }}
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.4, repeat: 2, ease: 'easeInOut' }}
        />
        {Array.from({ length: RAY_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-7 bg-amber-200/70 rounded-full origin-bottom"
            style={{ transform: `rotate(${i * 45}deg) translateY(-36px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.4, repeat: 2, delay: i * 0.08, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Roughly how long each overlay takes to play itself out (last stagger delay
// + its own duration), so we know when it's safe to unmount instead of
// leaving finished-but-invisible animation nodes sitting in the DOM forever.
const OVERLAY_LIFETIME_MS = { rainy: 4600, cloudy: 8500, sunny: 5000 };

// Single mount point WeatherWidget renders regardless of weather type: picks
// the right overlay, keys it so a manual refresh replays it from scratch,
// and removes it from the DOM once its animation has actually finished
// instead of leaving it invisible-but-mounted indefinitely.
export function WeatherAnimationOverlay({ type, refreshKey }) {
  const instanceKey = `${type}-${refreshKey}`;
  const [visible, setVisible] = useState(true);
  // Resetting `visible` when the key changes belongs during render, not in an
  // effect — this is React's own "adjust state when a prop changes" pattern,
  // and it avoids a set-state-in-effect that would otherwise double-render.
  const [lastKey, setLastKey] = useState(instanceKey);
  if (instanceKey !== lastKey) {
    setLastKey(instanceKey);
    setVisible(true);
  }

  useEffect(() => {
    if (!type) return;
    const timer = setTimeout(() => setVisible(false), OVERLAY_LIFETIME_MS[type] ?? 5000);
    return () => clearTimeout(timer);
  }, [type, refreshKey]);

  return (
    <AnimatePresence>
      {visible && type && (
        <motion.div
          key={instanceKey}
          className="absolute inset-0 overflow-hidden pointer-events-none"
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          {type === 'rainy' && <RainOverlay />}
          {type === 'cloudy' && <CloudOverlay />}
          {type === 'sunny' && <SunOverlay />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
