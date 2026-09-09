import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// A generic iOS-style notification pile: collapsed, the top few items peek
// out from behind each other; a tap anywhere on the pile spreads them into
// a normal list. Built generic (items + renderItem) so Phase 16 can reuse it
// for meetup requests without duplicating the stack/expand mechanics.
function NotificationStack({ items, renderItem, keyExtractor, peekCount = 3 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const m = useAppMotion();

  if (items.length === 0) return null;

  if (!isExpanded) {
    const visible = items.slice(0, peekCount);
    const remainder = items.length - visible.length;

    return (
      <div className="relative">
        {visible.map((item, i) => (
          <motion.div
            key={keyExtractor(item)}
            className={i === 0 ? 'relative' : 'absolute inset-x-0 top-0'}
            style={{ zIndex: visible.length - i }}
            animate={{ scale: 1 - i * 0.05, y: i * 8, opacity: 1 - i * 0.2 }}
            transition={m.gentle}
          >
            {renderItem(item)}
          </motion.div>
        ))}
        {remainder > 0 && (
          <div className="absolute -top-1.5 -right-1.5 z-10 bg-accent text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow">
            +{remainder}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          aria-label={`Expand ${items.length} items`}
          className="absolute inset-0 z-30 cursor-pointer bg-transparent"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="self-end text-[10px] uppercase font-bold tracking-wider text-textSecondary hover:text-textPrimary mb-1"
      >
        Collapse ▲
      </button>
      <motion.ul layout className="space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.li
              layout
              key={keyExtractor(item)}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ ...m.gentle, delay: i * 0.04 }}
            >
              {renderItem(item)}
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}

export default NotificationStack;
