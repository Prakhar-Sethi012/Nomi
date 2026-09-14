import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimation } from 'motion/react';
import { api } from '../services/api';
import Pressable from './ui/Pressable';
import { useAppMotion } from '../hooks/useAppMotion';
import { panelIn, shake } from '../motion/variants';
import { haptics } from '../utils/haptics';
import JumpingDots from './ui/JumpingDots';

function PinConfirmModal({ isOpen, onClose, onConfirm, actionText = "Delete Item" }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const m = useAppMotion();
  const panelControls = useAnimation();

  useEffect(() => {
    if (isOpen) {
      panelControls.start('visible');
      inputRef.current?.focus();
    }
  }, [isOpen, panelControls]);

  // Escape to close, Tab trapped inside the panel — both missing before.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll('input, button');
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      await api.verifyPin(pin);
      setPin('');
      haptics.success();
      await panelControls.start({ scale: 1.05, transition: m.snappy });
      await panelControls.start({ scale: 1, transition: m.snappy });
      onConfirm();
    } catch {
      setError('Incorrect PIN.');
      setPin('');
      haptics.error();
      panelControls.start(shake);
      inputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={m.base}
        >
          <motion.div
            ref={panelRef}
            variants={panelIn}
            initial="hidden"
            animate={panelControls}
            exit="exit"
            transition={m.pop}
            className={`bg-surface border ${error ? 'border-danger' : 'border-border'} p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center transition-colors`}
          >
            <div className="w-12 h-12 bg-dangerBg text-danger rounded-full flex items-center justify-center text-xl mb-4 border border-danger/30">
              🔒
            </div>
            <h3 className="text-xl font-bold text-textPrimary mb-2">Security Verification</h3>
            <p className="text-sm text-textSecondary text-center mb-6">Enter your 4-character PIN to confirm: <br/><strong className="text-danger">{actionText}</strong></p>

            {error && <p className="text-danger text-xs font-bold mb-4 animate-pulse">{error}</p>}

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <input
                ref={inputRef}
                type="password"
                maxLength="4"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-background border border-border text-textPrimary text-center text-2xl tracking-[1em] font-mono py-3 rounded-xl focus:border-danger outline-none transition-colors"
                placeholder="••••"
              />
              <div className="flex gap-2 mt-2">
                <Pressable type="button" onClick={() => { setPin(''); setError(''); onClose(); }} className="flex-1 py-3 bg-background hover:bg-surfaceHover text-textPrimary text-sm rounded-xl transition-colors">Cancel</Pressable>
                <Pressable type="submit" disabled={isVerifying || pin.length !== 4} haptic="tap" className="flex-1 py-3 bg-danger hover:opacity-90 disabled:bg-surfaceHover disabled:text-textSecondary text-white text-sm font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                  {isVerifying ? <JumpingDots /> : 'Confirm'}
                </Pressable>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default PinConfirmModal;
