import { motion } from 'motion/react';

const DROP_COUNT = 7;

// A handful of raindrops falling top to bottom, staggered so they don't all
// land in sync. Plays a few times then just stops — this is a one-shot
// "weather just loaded" moment, not a permanent background loop.
export function RainOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden">
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
    </div>
  );
}
