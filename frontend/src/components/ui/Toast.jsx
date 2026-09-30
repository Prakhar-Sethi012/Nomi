import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

const AUTO_DISMISS_MS = 3000;

// A single non-blocking error banner, fixed to the bottom of the viewport —
// for surfacing a failed optimistic update (e.g. attendance logging) without
// freezing interaction the way `alert()` does. Self-dismisses; `onDismiss`
// also fires on manual tap so a caller's `message` state clears either way.
function Toast({ message, onDismiss }) {
  const m = useAppMotion();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="toast"
          // x is pinned at -50% here (not a Tailwind -translate-x-1/2 class)
          // because Framer composes x/y/opacity into one inline `transform`
          // that fully replaces whatever transform a CSS class set — see the
          // same note on DoodleToolbar's bar for the bug this avoids.
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={m.base}
          onClick={onDismiss}
          className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-6 left-1/2 z-50 max-w-[calc(100vw-2rem)] bg-dangerBg border border-danger text-danger text-sm font-bold px-4 py-3 rounded-xl shadow-2xl cursor-pointer text-center"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Toast;
