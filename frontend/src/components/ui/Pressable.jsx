import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';
import { haptics } from '../../utils/haptics';

const TAGS = {
  button: motion.button,
  div: motion.div,
  a: motion.a,
};

// The iOS press signature: a small scale-down plus a slight dim, sprung back
// on release. Drop-in for <button>/<div onClick>/<a> — forwards every prop
// (href, type, disabled, className, children, ...) to the underlying element,
// so converting an existing element is just swapping the tag name.
//
// `haptic` names a method on the haptics util ('tap' | 'success' | 'warning'
// | 'error' | 'selection') and fires on pointerdown, matching the press
// itself rather than the click that follows release.
const Pressable = forwardRef(function Pressable(
  { as = 'button', haptic, disabled, onPointerDown, ...rest },
  ref
) {
  const m = useAppMotion();
  const Component = TAGS[as] || motion.button;

  const handlePointerDown = (event) => {
    if (!disabled && haptic && haptics[haptic]) haptics[haptic]();
    onPointerDown?.(event);
  };

  return (
    <Component
      ref={ref}
      whileTap={disabled ? undefined : { scale: 0.96, opacity: 0.92 }}
      transition={m.snappy}
      onPointerDown={handlePointerDown}
      disabled={as === 'button' ? disabled : undefined}
      aria-disabled={as !== 'button' && disabled ? true : undefined}
      {...rest}
    />
  );
});

export default Pressable;
