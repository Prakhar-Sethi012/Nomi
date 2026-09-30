import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Pressable from './ui/Pressable';
import NumberRoll from './ui/NumberRoll';
import Skeleton from './ui/Skeleton';
import { useAppMotion } from '../hooks/useAppMotion';
import { haptics } from '../utils/haptics';
import { scaleIn } from '../motion/variants';

// How many cards visually peek out of the collapsed stack — same default
// as NotificationStack's own peekCount, so this reads consistently with
// the Task Stack elsewhere in the app.
const STACK_PEEK_COUNT = 3;

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

// The Absent/Present pair (or the "maxed out" message in its place) — shared
// by the plain single-component card and each half of an expanded Embedded
// course, so the swap animation only lives in one place.
function AttendanceButtons({ conducted, total, onLog }) {
  const m = useAppMotion();
  const isMaxed = conducted >= total;

  return (
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
              onClick={() => onLog(false)}
              className="flex-1 bg-surface hover:bg-dangerBg border border-border hover:border-danger/50 text-textSecondary hover:text-danger text-xs font-bold py-1.5 rounded transition-all"
            >
              - Absent
            </Pressable>
            <Pressable
              onClick={() => onLog(true)}
              className="flex-1 bg-surface hover:bg-success/20 border border-border hover:border-success/50 text-textSecondary hover:text-success text-xs font-bold py-1.5 rounded transition-all"
            >
              + Present
            </Pressable>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// One component's attendance card — `slot` is only passed for an Embedded
// course's Theory/Lab halves; the plain single-component case (unchanged
// from before) omits it so its room/class line renders exactly as it always
// has.
function ComponentCard({ label, slot, room, attended, conducted, total, onLog }) {
  const currentPct = conducted === 0 ? 0 : (attended / conducted) * 100;

  return (
    <div className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <AttendanceRing percent={currentPct} conducted={conducted} />
          <div>
            <h3 className="text-sm font-bold text-textPrimary leading-tight">{label}</h3>
            <p className="text-[10px] font-mono text-textSecondary mt-0.5">
              {slot && <span className="text-accent">{slot} • </span>}
              {room || 'Room TBA'} • <NumberRoll value={conducted} />/<NumberRoll value={total} /> Classes
            </p>
          </div>
        </div>
        <span className={`text-xs font-black ${currentPct >= 75 ? 'text-success' : conducted > 0 ? 'text-danger' : 'text-textSecondary'}`}>
          {conducted > 0 ? <NumberRoll value={currentPct} decimals={1} suffix="%" /> : 'N/A'}
        </span>
      </div>
      <AttendanceButtons conducted={conducted} total={total} onLog={onLog} />
    </div>
  );
}

function DashboardAttendance({ subjects, isLoading, onLogAttendance }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Which Embedded courses currently have their Theory/Lab breakdown open —
  // a Set of subject ids, separate from `isExpanded` above (that one is the
  // whole pile; this is per-course).
  const [openCourseIds, setOpenCourseIds] = useState(() => new Set());
  const m = useAppMotion();

  const toggleCourseOpen = (id) => {
    setOpenCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Extracted so the collapsed (sliced) and expanded (full) renders in the
  // return below can both call the exact same card markup. An Embedded
  // course (Theory + Lab share one Subject row, each with its own counters
  // — see backend/models.py) collapses to just its name; expanding reveals
  // the two components as their own ComponentCard, each logging attendance
  // independently. Theory-only/Lab-only subjects render exactly as before.
  const renderSubjectCard = (sub) => {
    if (sub.subject_type !== 'EMBEDDED') {
      return (
        <ComponentCard
          label={sub.name}
          room={sub.room_number}
          attended={sub.attended_classes || 0}
          conducted={sub.conducted_classes || 0}
          total={sub.total_classes || 60}
          onLog={(present) => onLogAttendance(sub.id, present)}
        />
      );
    }

    const isOpen = openCourseIds.has(sub.id);

    return (
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <Pressable
          as="div"
          onClick={() => toggleCourseOpen(sub.id)}
          className="w-full flex items-center justify-between gap-2 p-3 cursor-pointer text-left"
        >
          <h3 className="text-sm font-bold text-textPrimary leading-tight">{sub.name}</h3>
          <motion.span
            className="text-textSecondary text-xs shrink-0"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={m.snappy}
          >
            ▾
          </motion.span>
        </Pressable>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="components"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={m.fast}
              className="flex flex-col gap-2 p-3 pt-0"
            >
              <ComponentCard
                label="Theory"
                slot={sub.theory_slot}
                room={sub.room_number}
                attended={sub.attended_classes || 0}
                conducted={sub.conducted_classes || 0}
                total={sub.total_classes || 60}
                onLog={(present) => onLogAttendance(sub.id, present, 'theory')}
              />
              <ComponentCard
                label="Lab"
                slot={sub.lab_slot}
                room={sub.room_number}
                attended={sub.lab_attended_classes || 0}
                conducted={sub.lab_conducted_classes || 0}
                total={sub.lab_total_classes || 60}
                onLog={(present) => onLogAttendance(sub.id, present, 'lab')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
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

      <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between mb-4 shrink-0 border-b border-border pb-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2 leading-tight">
            ✅ Quick Log
            {subjects.length > 0 && (
              <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-bold normal-case tracking-normal">
                {subjects.length} {subjects.length === 1 ? 'Class' : 'Classes'}
              </span>
            )}
          </h2>
          <p className="text-xs text-textSecondary mt-1 leading-tight">Record today's attendance.</p>
        </div>
        <span className="text-[10px] text-accent uppercase tracking-widest font-bold shrink-0">Synced w/ Timetable</span>
      </div>

      {/* Collapsed, classes physically stack like the Task Stack: only the
          first card sits in normal flow (it's what gives the pile its
          height), the rest are absolutely positioned on top of it with a
          growing y-offset/shrinking scale, cascading out from behind. Tap
          anywhere on the pile to unfold it into a normal flex-col list —
          same card, same `layout` prop, same key, the whole way through, so
          the transition is one continuous FLIP rather than a swap. */}
      <div
        onClick={() => { if (!isExpanded && subjects.length > 1) { haptics.light(); setIsExpanded(true); } }}
        className={`flex-1 md:min-h-0 overflow-visible md:overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3 ${
          !isExpanded && subjects.length > 1 ? 'cursor-pointer' : ''
        }`}
      >
        {isExpanded && subjects.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            className="block ml-auto text-[10px] uppercase font-bold tracking-wider text-textSecondary hover:text-textPrimary"
          >
            Collapse ▲
          </button>
        )}

        {subjects.length === 0 ? (
          <p className="text-xs text-textSecondary text-center mt-10">Go to the Timetable tab to add your classes first.</p>
        ) : (
          <motion.div layout transition={m.gentle} className={isExpanded ? 'relative flex flex-col gap-3' : 'relative'}>
            <AnimatePresence initial={false}>
              {subjects.map((sub, index) => {
                const stackDepth = Math.min(index, STACK_PEEK_COUNT - 1);
                const hiddenWhileCollapsed = !isExpanded && index >= STACK_PEEK_COUNT;

                return (
                  <motion.div
                    key={sub.id}
                    layout
                    transition={m.gentle}
                    className={!isExpanded && index > 0 ? 'absolute inset-x-0 top-0' : 'relative'}
                    style={!isExpanded ? { zIndex: subjects.length - index } : undefined}
                    animate={
                      isExpanded
                        ? { scale: 1, y: 0, opacity: 1 }
                        // Visible peek cards stay fully opaque — same fix as
                        // the Task Stack: fading them reads as a
                        // transparency glitch instead of a solid card edge.
                        : { scale: 1 - stackDepth * 0.05, y: stackDepth * 12, opacity: hiddenWhileCollapsed ? 0 : 1 }
                    }
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    {renderSubjectCard(sub)}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default DashboardAttendance;
