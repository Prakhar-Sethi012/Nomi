import { motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// Three dots bouncing in sequence, for brief inline waits — sheet submits,
// PIN verification — where there's no "content" yet to shape a skeleton
// after, just "something is happening, hang on."
function JumpingDots({ className = '' }) {
  const m = useAppMotion();

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={m.reduced ? { y: 0, opacity: 0.5 + i * 0.15 } : { y: [0, -4, 0] }}
          transition={m.reduced ? { duration: 0 } : { duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

export default JumpingDots;
