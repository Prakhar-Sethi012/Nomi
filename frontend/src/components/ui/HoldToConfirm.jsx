import { useRef, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, animate } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';
import { haptics } from '../../utils/haptics';

const HOLD_SECONDS = 1.2;

// A press-and-hold gate for the app's irreversible actions, replacing the
// stacked window.confirm/window.prompt pattern with something that can't be
// dismissed by a reflexive tap. `progress` (0→1 over 1200ms) drives three
// things at once: the ring's pathLength, the danger-tint overlay's opacity,
// and the counting label — releasing early springs it back to zero and the
// action only ever fires on natural completion. Haptics escalate through
// the hold (selection → tap) and resolve with success on completion.
function HoldToConfirm({ onConfirm, children, className = '', disabled }) {
  const m = useAppMotion();
  const progress = useMotionValue(0);
  const [percent, setPercent] = useState(0);
  const hapticStage = useRef(0);
  const activeAnimation = useRef(null);

  useMotionValueEvent(progress, 'change', (latest) => {
    setPercent(Math.round(latest * 100));

    const stage = latest >= 0.66 ? 2 : latest >= 0.33 ? 1 : 0;
    if (stage > hapticStage.current) {
      hapticStage.current = stage;
      if (stage === 1) haptics.selection();
      if (stage === 2) haptics.tap();
    }
  });

  const startHold = () => {
    if (disabled) return;
    hapticStage.current = 0;
    activeAnimation.current = animate(progress, 1, {
      duration: m.reduced ? 0 : HOLD_SECONDS,
      ease: 'linear',
      onComplete: () => {
        haptics.success();
        progress.set(0);
        hapticStage.current = 0;
        onConfirm();
      },
    });
  };

  const cancelHold = () => {
    activeAnimation.current?.stop();
    if (progress.get() > 0) animate(progress, 0, m.snappy);
    hapticStage.current = 0;
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className={`relative overflow-hidden select-none touch-none disabled:opacity-50 ${className}`}
    >
      <motion.div className="absolute inset-0 bg-danger" style={{ opacity: progress }} />

      <span className="relative z-10 flex items-center justify-center gap-2">
        <svg viewBox="0 0 40 40" className="w-4 h-4 shrink-0" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="20" cy="20" r="17" fill="none" strokeWidth="4" className="stroke-current opacity-20" />
          <motion.circle cx="20" cy="20" r="17" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-current" style={{ pathLength: progress }} />
        </svg>
        {children}
        {percent > 0 && <span className="font-mono text-xs tabular-nums opacity-80">{percent}%</span>}
      </span>
    </button>
  );
}

export default HoldToConfirm;
