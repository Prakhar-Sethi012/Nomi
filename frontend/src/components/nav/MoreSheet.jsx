import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import Pressable from '../ui/Pressable';
import { useAppMotion } from '../../hooks/useAppMotion';

// A minimal slide-up sheet, purpose-built for this fixed nav list. Phase 6
// introduces a generic drag-to-dismiss BottomSheet for forms — this one stays
// simple (tap-outside/Escape to close, no drag) since a nav list doesn't need
// rubber-band physics to feel right, but it's built to be swapped onto the
// shared primitive later without changing its own props.
const MORE_ITEMS = [
  { id: 'scratchpad', label: 'Scratchpad', icon: '📝' },
  { id: 'strategy', label: 'Strategy', icon: '🔮' },
  { id: 'links', label: 'Directory', icon: '🔗' },
  { id: 'closeFriends', label: 'Close Friends', icon: '💾' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

function MoreSheet({ isOpen, activeTab, onSelect, onClose, onLogout }) {
  const m = useAppMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            className="md:hidden fixed inset-0 bg-black/50 z-40"
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
          <motion.div
            key="sheet"
            role="dialog"
            aria-label="More"
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={m.sheet}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>
            <div className="px-2 pt-2 pb-1">
              {MORE_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onClick={() => { onSelect(item.id); onClose(); }}
                    haptic="selection"
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-textPrimary'}`}
                  >
                    <span className="text-xl leading-none">{item.icon}</span>
                    <span className="font-bold text-sm">{item.label}</span>
                  </Pressable>
                );
              })}
              <div className="my-2 border-t border-border" />
              <Pressable
                onClick={() => { onLogout(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-danger"
              >
                <span className="text-xl leading-none">🚪</span>
                <span className="font-bold text-sm">Logout</span>
              </Pressable>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}

export default MoreSheet;
