import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

// A generic iOS-style notification pile: collapsed, the top few items peek
// out from behind each other; a tap anywhere on the pile spreads them into
// a normal list. Built generic (items + renderItem) so Phase 16 can reuse it
// for meetup requests without duplicating the stack/expand mechanics.
//
// Every item is the SAME motion.div across both the collapsed and expanded
// states (same key, never unmounted) with the `layout` prop, so toggling
// isExpanded is one continuous Framer Motion FLIP transition — cards
// visibly slide out of the stack into their list row — instead of the
// collapsed pile unmounting and an unrelated expanded list popping in to
// replace it.
function NotificationStack({ items, renderItem, keyExtractor, peekCount = 3 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const m = useAppMotion();

  if (items.length === 0) return null;

  const remainder = Math.max(0, items.length - peekCount);

  return (
    <div className="relative">
      {isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="mb-1 block ml-auto text-[10px] uppercase font-bold tracking-wider text-textSecondary hover:text-textPrimary"
        >
          Collapse ▲
        </button>
      )}

      {!isExpanded && remainder > 0 && (
        <div className="absolute -top-1.5 -right-1.5 z-10 bg-accent text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow">
          +{remainder}
        </div>
      )}

      <motion.div layout transition={m.gentle} className={isExpanded ? 'relative flex flex-col gap-3' : 'relative'}>
        <AnimatePresence initial={false}>
          {items.map((item, i) => {
            // Cards past peekCount stay mounted (invisible, stacked at the
            // same spot as the last visible one) while collapsed, so they're
            // already in place to unfold into the list rather than popping
            // in fresh the moment the pile expands.
            const stackDepth = Math.min(i, peekCount - 1);
            const hiddenWhileCollapsed = i >= peekCount;

            return (
              <motion.div
                key={keyExtractor(item)}
                layout
                transition={m.gentle}
                className={!isExpanded && i > 0 ? 'absolute inset-x-0 top-0' : 'relative'}
                style={!isExpanded ? { zIndex: items.length - i } : undefined}
                animate={
                  isExpanded
                    ? { scale: 1, y: 0, opacity: 1 }
                    // Visible peek cards stay fully opaque — fading them let
                    // the sliver of a card peeking out from behind read as a
                    // transparency glitch instead of a solid card edge. Only
                    // cards stacked past peekCount (never actually shown)
                    // drop to 0.
                    : { scale: 1 - stackDepth * 0.05, y: stackDepth * 8, opacity: hiddenWhileCollapsed ? 0 : 1 }
                }
                // height/marginBottom collapse (not just opacity/scale) so a
                // removed row folds the gap shut instead of leaving a blank
                // beat before the `layout` FLIP on the siblings below kicks in.
                exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
              >
                {renderItem(item, isExpanded)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          aria-label={`Expand ${items.length} items`}
          className="absolute inset-0 z-30 cursor-pointer bg-transparent"
        />
      )}
    </div>
  );
}

export default NotificationStack;
