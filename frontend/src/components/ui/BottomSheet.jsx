import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// One sheet, built once, so every form adopts the same drag-to-dismiss
// physics instead of four screens each rolling their own. Drag is bound to
// the grabber handle only (useDragControls + dragListener={false}) so a
// scrollable form body doesn't fight the gesture — dragConstraints keeps it
// from being pulled upward, and the asymmetric dragElastic gives it real
// rubber-band resistance going up versus down.
//
// On md+ the exact same component reads as a centered dialog instead: the
// grabber (and its drag handler) is just hidden there via CSS, so nothing
// needs branching in JS.
function BottomSheet({ isOpen, onClose, title, children }) {
  const m = useAppMotion();
  const dragControls = useDragControls();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector('input, textarea, select')?.focus();

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleDragEnd = (_event, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={m.base}
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none md:items-center md:p-4">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto w-full max-h-[85vh] flex flex-col bg-surface border-t border-border rounded-t-2xl shadow-2xl md:max-w-lg md:border md:rounded-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={m.sheet}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.7 }}
              onDragEnd={handleDragEnd}
            >
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="md:hidden flex justify-center pt-3 pb-1 shrink-0 touch-none cursor-grab active:cursor-grabbing"
              >
                <div className="w-9 h-1 rounded-full bg-border" />
              </div>

              {title && (
                <div className="px-5 pb-3 pt-2 md:pt-5 border-b border-border shrink-0">
                  <h3 className="font-bold text-textPrimary">{title}</h3>
                </div>
              )}

              <div className="overflow-y-auto px-5 py-4">{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default BottomSheet;
