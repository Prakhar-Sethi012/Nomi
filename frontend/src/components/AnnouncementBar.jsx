import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../services/api';
import Pressable from './ui/Pressable';
import { useAppMotion } from '../hooks/useAppMotion';

const STORAGE_PREFIX = 'dismissed_announcement_';

// A sitewide alert bar for urgent, admin-broadcast messages (exam dates,
// outages, deadlines) — content comes from GET /system/announcement, which
// just reflects two env vars on the backend, so changing the message is a
// restart, not a redeploy. Dismissal is keyed on the announcement's `id`
// (not its text) in localStorage, so editing ANNOUNCEMENT_MESSAGE alone
// won't resurface a dismissed banner — bumping ANNOUNCEMENT_ID will.
function AnnouncementBar() {
  const m = useAppMotion();
  const [announcement, setAnnouncement] = useState(null); // { id, message } | null
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getAnnouncement()
      .then((data) => {
        if (cancelled || !data?.id || !data?.message) return;
        setAnnouncement(data);
        try {
          setIsDismissed(localStorage.getItem(STORAGE_PREFIX + data.id) === 'true');
        } catch {
          setIsDismissed(false);
        }
      })
      .catch(() => {}); // no announcement configured, or backend unreachable — banner just stays hidden
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (!announcement) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + announcement.id, 'true');
    } catch {
      // Private browsing / storage disabled — dismissal just won't persist past this session.
    }
  };

  if (!announcement) return null;

  return (
    <AnimatePresence initial={false}>
      {!isDismissed && (
        <motion.div
          key="announcement"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={m.base}
          className="overflow-hidden mb-6 shrink-0"
        >
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 rounded-xl shadow-lg">
            <span className="text-lg shrink-0" aria-hidden="true">⚠️</span>
            <p className="flex-1 text-sm font-bold leading-tight">{announcement.message}</p>
            <Pressable
              onClick={handleDismiss}
              haptic="tap"
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors"
              aria-label="Dismiss announcement"
            >
              ✕
            </Pressable>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnnouncementBar;
