import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';
import { haptics } from '../../utils/haptics';

const THRESHOLD = 72;

// A single swipeable row: dragging left arms delete (revealed on the right,
// where the content is sliding away from), dragging right arms complete
// (revealed on the left) — the classic iOS Mail direction convention.
// Crossing the threshold fires one haptic tick (the "it's armed" cue); the
// action only fires if the row is released while still past that point —
// let go early and it springs back to rest, nothing happens. Renders as a
// fragment so it can sit directly inside a parent that's already
// `relative overflow-hidden` (its reveal layer anchors to that ancestor).
function SwipeRow({ onDelete, onComplete, children, disabled }) {
  const m = useAppMotion();
  const [armed, setArmed] = useState(null);
  const armedRef = useRef(null);

  const handleDrag = (_event, info) => {
    const next = info.offset.x <= -THRESHOLD ? 'delete' : info.offset.x >= THRESHOLD ? 'complete' : null;
    if (next !== armedRef.current) {
      armedRef.current = next;
      setArmed(next);
      if (next) haptics.tap();
    }
  };

  const handleDragEnd = () => {
    if (armedRef.current === 'delete') onDelete?.();
    else if (armedRef.current === 'complete') onComplete?.();
    armedRef.current = null;
    setArmed(null);
  };

  return (
    <>
      <div className="absolute inset-0 flex items-stretch pointer-events-none">
        <div className={`flex-1 flex items-center pl-4 bg-success text-white font-bold text-xs uppercase tracking-wider transition-opacity ${armed === 'complete' ? 'opacity-100' : 'opacity-0'}`}>
          ✓ Complete
        </div>
        <div className={`flex-1 flex items-center justify-end pr-4 bg-danger text-white font-bold text-xs uppercase tracking-wider transition-opacity ${armed === 'delete' ? 'opacity-100' : 'opacity-0'}`}>
          Delete 🗑️
        </div>
      </div>
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock
        dragSnapToOrigin
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        transition={m.snappy}
        className="relative"
      >
        {children}
      </motion.div>
    </>
  );
}

export default SwipeRow;
