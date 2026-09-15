import { AnimatePresence, motion } from 'motion/react';

const DROP_COUNT = 7;

// A handful of raindrops falling top to bottom, staggered so they don't all
// land in sync, looping forever for as long as the widget stays rainy.
export function RainOverlay() {
  return (
    <>
      {Array.from({ length: DROP_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 w-[3px] h-6 rounded-full bg-gradient-to-b from-cyan-200/0 via-cyan-100 to-white shadow-[0_0_6px_rgba(165,243,252,0.9)]"
          style={{ left: `${(i / DROP_COUNT) * 90 + 5}%` }}
          initial={{ y: '-20%', opacity: 0 }}
          animate={{ y: '140%', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            repeatType: 'loop',
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

// Three bold, blurred blobs drifting left-to-right at different heights and
// speeds so it reads as "clouds" rather than one shape sliding by, looping
// forever for as long as the widget stays cloudy.
export function CloudOverlay() {
  return (
    <>
      {CLOUDS.map((cloud, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white blur-md shadow-[0_0_20px_rgba(255,255,255,0.6)]"
          style={{ top: cloud.top, width: cloud.size, height: cloud.size * 0.55 }}
          initial={{ x: '-30%', opacity: 0 }}
          animate={{ x: '130%', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: cloud.duration,
            delay: i * 1,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
          }}
        />
      ))}
    </>
  );
}

const RAY_COUNT = 8;

// A sun that pops in, then glows and pulses forever with rays radiating out
// from its center — reads as "brightening up" rather than a static icon.
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
          className="absolute inset-0 rounded-full bg-yellow-300 shadow-[0_0_45px_18px_rgba(253,224,71,0.8)]"
          style={{ filter: 'blur(22px)' }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
        />
        <div className="absolute inset-[6px] rounded-full bg-amber-400" />
        {Array.from({ length: RAY_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-8 bg-yellow-200 rounded-full origin-bottom shadow-[0_0_8px_rgba(254,240,138,0.9)]"
            style={{ transform: `rotate(${i * 45}deg) translateY(-38px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatType: 'loop', delay: i * 0.08, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Single mount point WeatherWidget renders regardless of weather type: picks
// the right overlay and keys it so a manual refresh replays it from scratch.
// The overlay itself loops forever for as long as `type` stays set — it only
// leaves (with a graceful fade) when the weather type changes to one with no
// animation, or the widget unmounts.
export function WeatherAnimationOverlay({ type, refreshKey }) {
  return (
    <AnimatePresence>
      {type && (
        <motion.div
          key={`${type}-${refreshKey}`}
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
