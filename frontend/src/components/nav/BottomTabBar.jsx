import { motion } from 'motion/react';
import Pressable from '../ui/Pressable';
import { useAppMotion } from '../../hooks/useAppMotion';

// Five primary destinations fit a native tab bar; everything else lives
// behind "More" (see MoreSheet). Icons are emoji to match the vocabulary the
// rest of the app already uses (📡 Radar, 🗓️ Timetable, etc.) rather than
// introducing a second icon language.
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'timetable', label: 'Timetable', icon: '🗓️' },
  { id: 'expenses', label: 'Finance', icon: '💰' },
  { id: 'radar', label: 'Radar', icon: '📡' },
  { id: 'more', label: 'More', icon: '⋯' },
];

// Tab ids that live behind the "More" sheet rather than on the bar itself —
// used below to decide whether the More tab should read as active.
const MORE_TAB_IDS = ['scratchpad', 'strategy', 'links', 'closeFriends', 'profile'];

function BottomTabBar({ activeTab, isMoreOpen, onSelect }) {
  const m = useAppMotion();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const isActive = tab.id === 'more' ? isMoreOpen || MORE_TAB_IDS.includes(activeTab) : activeTab === tab.id && !isMoreOpen;

          return (
            <Pressable
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              haptic="selection"
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-x-2 inset-y-1 bg-accent/15 rounded-xl"
                  transition={m.gentle}
                />
              )}
              <motion.span
                className="text-xl relative z-10 leading-none"
                animate={{ scale: isActive ? 1.12 : 1 }}
                transition={m.snappy}
              >
                {tab.icon}
              </motion.span>
              <span className={`text-[10px] font-bold relative z-10 ${isActive ? 'text-accent' : 'text-textSecondary'}`}>
                {tab.label}
              </span>
            </Pressable>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabBar;
