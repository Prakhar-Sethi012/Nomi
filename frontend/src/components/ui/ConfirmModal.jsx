import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import Pressable from './Pressable';
import { useAppMotion } from '../../hooks/useAppMotion';
import { panelIn } from '../../motion/variants';

// A lightweight yes/no confirmation for actions that are just inconvenient to
// trigger by accident (logging out mid-session) — not the PIN-gated
// PinConfirmModal, which is reserved for actually destructive data actions
// (delete, wipe, self-destruct).
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  const m = useAppMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // `onClose` is deliberately not a dependency here — see BottomSheet.jsx /
    // PinConfirmModal.jsx for why an inline arrow-function prop in this array
    // reruns the effect on every unrelated render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={m.base}
          onClick={onClose}
        >
          <motion.div
            variants={panelIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={m.pop}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center text-center"
          >
            <h3 className="text-lg font-bold text-textPrimary mb-2">{title}</h3>
            {message && <p className="text-sm text-textSecondary mb-6">{message}</p>}
            <div className="flex gap-2 w-full">
              <Pressable
                type="button"
                onClick={onClose}
                haptic="tap"
                className="flex-1 py-3 bg-background hover:bg-surfaceHover text-textPrimary text-sm rounded-xl transition-colors"
              >
                Cancel
              </Pressable>
              <Pressable
                type="button"
                onClick={onConfirm}
                haptic={danger ? 'warning' : 'tap'}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${
                  danger ? 'bg-danger hover:opacity-90 text-white shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-accent hover:bg-accentHover text-white'
                }`}
              >
                {confirmLabel}
              </Pressable>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default ConfirmModal;
