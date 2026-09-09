import { useId } from 'react';
import { motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// An iOS segmented control: one shared layoutId pill slides behind whichever
// label is active, instead of each button independently toggling color.
// layoutId defaults to a per-instance useId() so two segmented controls
// mounted at once never cross-animate into each other.
function SegmentedControl({ options, value, onChange, layoutId, className = '' }) {
  const m = useAppMotion();
  const autoId = useId();
  const pillId = layoutId || autoId;

  return (
    <div className={`bg-background border border-border rounded-lg p-1 flex gap-1 transition-colors duration-300 ${className}`}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${isActive ? 'text-white' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            {isActive && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 bg-accent rounded-md shadow"
                transition={m.gentle}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
