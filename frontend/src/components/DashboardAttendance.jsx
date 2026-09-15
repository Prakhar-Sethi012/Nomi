import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../services/api';
import Pressable from './ui/Pressable';
import NumberRoll from './ui/NumberRoll';
import Skeleton from './ui/Skeleton';
import { useAppMotion } from '../hooks/useAppMotion';
import { scaleIn } from '../motion/variants';

function AttendanceRing({ percent, conducted }) {
  const m = useAppMotion();
  const color = conducted === 0 ? 'text-textSecondary' : percent >= 75 ? 'text-success' : 'text-danger';

  return (
    <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90 shrink-0">
      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-current text-border" />
      <motion.circle
        cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
        className={`stroke-current ${color}`}
        animate={{ pathLength: percent / 100 }}
        transition={m.gentle}
      />
    </svg>
  );
}

function DashboardAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const m = useAppMotion();

  const fetchSubjects = async () => {
    try {
      const data = await api.getSubjects();
      // Force sort by ID to prevent the "Jumping Bug" when updating
      const sortedData = data.sort((a, b) => a.id - b.id);
      setSubjects(sortedData);
    } catch (err) {
      console.error("Failed to load quick log subjects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const logAttendance = async (id, isPresent) => {
    try {
      await api.markAttendance(id, isPresent);
      fetchSubjects(); // Refresh UI instantly
    } catch (err) {
      // Show an alert if the backend rejects it (e.g. if someone tries to bypass the UI)
      alert(err.message || "Failed to log attendance");
      console.error("Failed to log attendance");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col h-auto md:h-full md:max-h-[400px] gap-3">
        <div className="flex justify-between items-end mb-1 shrink-0 border-b border-border pb-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-background p-3 rounded-lg border border-border flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col h-auto md:h-full md:max-h-[400px]">

      <div className="flex justify-between items-end mb-4 shrink-0 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            ✅ Quick Log
          </h2>
          <p className="text-xs text-textSecondary mt-1">Record today's attendance.</p>
        </div>
        <span className="text-[10px] text-accent uppercase tracking-widest font-bold">Synced w/ Timetable</span>
      </div>

      <div className="flex-1 md:min-h-0 overflow-visible md:overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
        {subjects.length === 0 ? (
          <p className="text-xs text-textSecondary text-center mt-10">Go to the Timetable tab to add your classes first.</p>
        ) : (
          subjects.map(sub => {
            // Safely default to 0 to prevent NaN crashes
            const attended = sub.attended_classes || 0;
            const conducted = sub.conducted_classes || 0;
            const total = sub.total_classes || 60; // Fallback just in case
            const currentPct = conducted === 0 ? 0 : (attended / conducted) * 100;

            // 🔥 NEW: Check if max classes reached
            const isMaxed = conducted >= total;

            return (
              <div key={sub.id} className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2">

                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <AttendanceRing percent={currentPct} conducted={conducted} />
                    <div>
                      <h3 className="text-sm font-bold text-textPrimary leading-tight">{sub.name}</h3>
                      <p className="text-[10px] font-mono text-textSecondary mt-0.5">
                        {sub.room_number || 'Room TBA'} • <NumberRoll value={conducted} />/<NumberRoll value={total} /> Classes
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-black ${currentPct >= 75 ? 'text-success' : conducted > 0 ? 'text-danger' : 'text-textSecondary'}`}>
                    {conducted > 0 ? <NumberRoll value={currentPct} decimals={1} suffix="%" /> : 'N/A'}
                  </span>
                </div>

                <div className="flex gap-2 mt-1 relative">
                  <AnimatePresence mode="wait" initial={false}>
                    {isMaxed ? (
                      <motion.div
                        key="maxed"
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={m.fast}
                        className="flex-1 bg-surfaceHover border border-border text-textSecondary text-[10px] uppercase tracking-wider font-bold py-1.5 rounded text-center opacity-70 cursor-not-allowed"
                      >
                        Max Classes Reached
                      </motion.div>
                    ) : (
                      <motion.div
                        key="active"
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={m.fast}
                        className="flex-1 flex gap-2"
                      >
                        <Pressable
                          onClick={() => logAttendance(sub.id, false)}
                          haptic="warning"
                          className="flex-1 bg-surface hover:bg-dangerBg border border-border hover:border-danger/50 text-textSecondary hover:text-danger text-xs font-bold py-1.5 rounded transition-all"
                        >
                          - Absent
                        </Pressable>
                        <Pressable
                          onClick={() => logAttendance(sub.id, true)}
                          haptic="success"
                          className="flex-1 bg-surface hover:bg-success/20 border border-border hover:border-success/50 text-textSecondary hover:text-success text-xs font-bold py-1.5 rounded transition-all"
                        >
                          + Present
                        </Pressable>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DashboardAttendance;
