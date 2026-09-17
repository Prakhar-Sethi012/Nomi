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

// A few tiny glowing motes drifting slowly around the sun — pure atmosphere,
// no meaning, just enough motion to feel alive and a little magical.
const DUST_MOTES = [
  { top: '10%', left: '15%', size: 6, duration: 9, delay: 0 },
  { top: '70%', left: '75%', size: 5, duration: 11, delay: 2.2 },
  { top: '30%', left: '80%', size: 4, duration: 10, delay: 4.5 },
];

// A soft, "pookie" sun: a slow breathing glow instead of a hard pulse, rays
// that drift around it once a minute rather than flicker, and a few dust
// motes for that calm/magical feel. Everything here is on an 8-10s+ cycle —
// deliberately too slow to read as "energetic", which is what made the old
// 1.4s pulse + flickering rays feel harsh instead of relaxing. Core/glow are
// still built from the theme tone (mixed toward white, not black) so this
// stays a pastel-soft reading in every theme, not just the default amber one.
export function SunOverlay({ color }) {
  return (
    <div className="w-full h-full flex items-center justify-end pr-8">
      <motion.div
        className="relative w-20 h-20"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Magic dust */}
        {DUST_MOTES.map((mote, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-[1px]"
            style={{
              top: mote.top,
              left: mote.left,
              width: mote.size,
              height: mote.size,
              background: `color-mix(in srgb, ${color} 50%, white)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0], y: [-4, -16, -4] }}
            transition={{ duration: mote.duration, repeat: Infinity, repeatType: 'loop', delay: mote.delay, ease: 'easeInOut' }}
          />
        ))}

        {/* Outer glow — soft pastel, low opacity, deep blur, slowly breathing */}
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl opacity-40"
          style={{ background: `color-mix(in srgb, ${color} 55%, white)` }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
        />
        {/* Inner glow — same breath, slightly offset so it never feels mechanical */}
        <motion.div
          className="absolute inset-2 rounded-full blur-2xl opacity-50"
          style={{ background: `color-mix(in srgb, ${color} 45%, white)` }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', delay: 0.4 }}
        />

        {/* Solid core — breathes in sync with the glow, mixed toward white
            (not black) so it reads soft/cute rather than a stark eclipse. */}
        <motion.div
          className="absolute inset-[14px] rounded-full"
          style={{ background: `color-mix(in srgb, ${color} 75%, white)` }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
        />

        {/* Rays — one slow-turning group instead of each ray flickering on
            its own, so it reads as a gentle turn rather than a sparkle. */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 36, repeat: Infinity, repeatType: 'loop', ease: 'linear' }}
        >
          {Array.from({ length: RAY_COUNT }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-1 h-6 rounded-full origin-bottom opacity-30"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-34px)`,
                background: `color-mix(in srgb, ${color} 60%, white)`,
              }}
            />
          ))}
        </motion.div>
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
