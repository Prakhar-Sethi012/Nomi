import { motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// A content-shaped loading placeholder: a single shimmering block. Callers
// compose several (title-line + a couple of body-lines + a footer block,
// say) into whatever shape the real content will take, so nothing shifts
// when it arrives — pass className for exact sizing per use.
function Skeleton({ className = '' }) {
  const m = useAppMotion();

  return (
    <motion.div
      className={`bg-surfaceHover rounded ${className}`}
      animate={m.reduced ? { opacity: 0.65 } : { opacity: [0.5, 0.8, 0.5] }}
      transition={m.reduced ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default Skeleton;
