import { AnimatePresence, motion } from 'motion/react';

const DROP_COUNT = 7;

// A handful of raindrops falling top to bottom, staggered so they don't all
// land in sync, looping forever for as long as the widget stays rainy.
// `color` is the current theme's tone (e.g. var(--color-accent)) so the
// drops read as "this app's ink", not a fixed cyan regardless of theme.
export function RainOverlay({ color }) {
  return (
    <>
      {Array.from({ length: DROP_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 w-[3px] h-6 rounded-full"
          style={{
            left: `${(i / DROP_COUNT) * 90 + 5}%`,
            background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 0%, transparent), ${color}, color-mix(in srgb, ${color} 30%, white))`,
            boxShadow: `0 0 6px color-mix(in srgb, ${color} 80%, transparent)`,
          }}
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
// forever for as long as the widget stays cloudy. Tinted with the theme tone
// (mixed into white) so clouds still read as light/airy in every theme while
// carrying that theme's hue.
export function CloudOverlay({ color }) {
  return (
    <>
      {CLOUDS.map((cloud, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-md"
          style={{
            top: cloud.top,
            width: cloud.size,
            height: cloud.size * 0.55,
            background: `color-mix(in srgb, ${color} 30%, white)`,
            boxShadow: `0 0 20px color-mix(in srgb, ${color} 35%, white)`,
          }}
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
// Core/rays are built from the theme tone rather than a fixed yellow, so a
// "sunny" reading still shifts palette across themes (e.g. Nordic's frost
// blue instead of amber).
export function SunOverlay({ color }) {
  return (
    <div className="w-full h-full flex items-center justify-end pr-8">
      <motion.div
        className="relative w-20 h-20"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: color,
            filter: 'blur(22px)',
            boxShadow: `0 0 45px 18px color-mix(in srgb, ${color} 70%, transparent)`,
          }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-[6px] rounded-full"
          style={{ background: `color-mix(in srgb, ${color} 85%, black)` }}
        />
        {Array.from({ length: RAY_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-8 rounded-full origin-bottom"
            style={{
              transform: `rotate(${i * 45}deg) translateY(-38px)`,
              background: `color-mix(in srgb, ${color} 80%, white)`,
              boxShadow: `0 0 8px color-mix(in srgb, ${color} 70%, transparent)`,
            }}
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
// animation, or the widget unmounts. `color` is threaded down to whichever
// overlay renders so every animation accent tracks the active theme.
export function WeatherAnimationOverlay({ type, refreshKey, color }) {
  return (
    <AnimatePresence>
      {type && (
        <motion.div
          key={`${type}-${refreshKey}`}
          className="absolute inset-0 overflow-hidden pointer-events-none"
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          {type === 'rainy' && <RainOverlay color={color} />}
          {type === 'cloudy' && <CloudOverlay color={color} />}
          {type === 'sunny' && <SunOverlay color={color} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
