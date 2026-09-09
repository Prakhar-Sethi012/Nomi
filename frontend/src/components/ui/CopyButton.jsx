import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// Copy-to-clipboard with an icon swap (clipboard → drawn checkmark) and a
// brief blur transition between them, instead of a hard swap. Generic so
// any copyable value (a link, a circle passcode) can drop it in.
function CopyButton({ value, className = '', title = 'Copy', onCopied }) {
  const m = useAppMotion();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button type="button" onClick={handleCopy} title={title} className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={m.fast}
            className="text-success flex items-center"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
              <motion.path
                d="M4 12l6 6L20 6"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={m.fast}
          >
            📋
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export default CopyButton;
