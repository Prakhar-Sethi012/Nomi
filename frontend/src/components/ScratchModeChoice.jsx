import { motion } from 'motion/react';
import Pressable from './ui/Pressable';
import { useAppMotion } from '../hooks/useAppMotion';
import { staggerParent, fadeUp } from '../motion/variants';

const CHOICES = [
  {
    id: 'notes',
    icon: '📝',
    label: 'Notes',
    tagline: 'Write it down',
    gradient: 'from-emerald-600/20 via-background to-background',
    ring: 'hover:border-emerald-500/60',
  },
  {
    id: 'doodle',
    icon: '🎨',
    label: 'Doodle',
    tagline: 'Sketch it out',
    gradient: 'from-blue-600/20 via-background to-background',
    ring: 'hover:border-blue-500/60',
  },
];

// The Scratchpad's front door: a bold, high-contrast split-choice screen per
// skills.md's typography/motion guidance, instead of dropping the user
// straight into two cramped side-by-side panels. Each half is its own
// oversized card so picking a mode reads as a deliberate decision.
function ScratchModeChoice({ onChoose }) {
  const m = useAppMotion();

  return (
    <motion.div
      variants={staggerParent(0.12)}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      className="flex-1 min-h-[420px] grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {CHOICES.map((choice) => (
        <motion.div key={choice.id} variants={fadeUp} className="h-full">
          <Pressable
            as="div"
            onClick={() => onChoose(choice.id)}
            haptic="tap"
            className={`group relative h-full min-h-[240px] w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${choice.gradient} ${choice.ring} shadow-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors`}
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] pointer-events-none" />
            <motion.span
              className="text-4xl drop-shadow-lg relative z-10"
              whileHover={{ scale: 1.1, rotate: -4 }}
              transition={m.snappy}
            >
              {choice.icon}
            </motion.span>
            <h2 className="text-3xl font-black text-textPrimary relative z-10 tracking-tight">{choice.label}</h2>
            <p className="text-textSecondary text-xs uppercase tracking-widest font-bold relative z-10">{choice.tagline}</p>
          </Pressable>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default ScratchModeChoice;
