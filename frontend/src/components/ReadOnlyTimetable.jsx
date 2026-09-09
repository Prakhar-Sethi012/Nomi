import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { DAYS, TIMES, MASTER_GRID, getSubjectColor, getSubjectForCell as getSubjectForCellShared, isClassActiveNow, getCurrentTimeColumnIndex } from '../utils/timetableUtils';
import SegmentedControl from './ui/SegmentedControl';
import { useAppMotion } from '../hooks/useAppMotion';

// The row nearest the middle of the scrollable agenda lifts slightly and
// takes an accent border — a scroll-centred "you are here" cue. Detection
// is IntersectionObserver-based (useInView), not tied to any animation
// engine, so it keeps working even where reduced-motion collapses the rest.
function AgendaRow({ item, isActive, scrollRoot }) {
  const rowRef = useRef(null);
  const isCentered = useInView(rowRef, { root: scrollRoot, margin: '-45% 0px -45% 0px' });

  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-4 p-3 rounded-lg border border-l-4 transition-all duration-500 ${
        isActive
          ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]'
          : isCentered
            ? 'border-accent bg-background scale-[1.02]'
            : 'border-border bg-background border-l-accent'
      }`}
    >
      <div className="w-24 shrink-0 text-center">
        {isActive ? (
          <motion.span
            className="text-xs font-bold text-success"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {item.time}
          </motion.span>
        ) : (
          <span className="text-xs font-bold text-textSecondary">{item.time}</span>
        )}
        {isActive && <span className="block text-[8px] uppercase tracking-widest text-success mt-1 font-black">Happening Now</span>}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-textPrimary">{item.cellData.data.name}</h3>
        <p className="text-[10px] uppercase font-bold text-textSecondary mt-0.5 flex flex-wrap gap-1.5 items-center">
          <span className="bg-surface px-1.5 py-0.5 rounded border border-border">{item.cellData.data.subject_type}</span>
          <span className="bg-surface px-1.5 py-0.5 rounded border border-border">SLOT: {item.cellData.data.subject_type === 'LAB' ? item.cellData.data.lab_slot : item.cellData.data.theory_slot}</span>
          <span className={`${isActive ? 'bg-success/20 text-success border-success/30' : 'bg-accent/20 text-accent border-accent/30'} px-1.5 py-0.5 rounded border`}>🚩 {item.cellData.data.room_number || 'TBA'}</span>
        </p>
      </div>
    </div>
  );
}

function ReadOnlyTimetable({ subjects }) {
  const [viewMode, setViewMode] = useState('grid');
  const [now, setNow] = useState(new Date());
  const agendaScrollRef = useRef(null);
  const currentColRef = useRef(null);
  // State, not a ref — the "has it already animated" flag needs to be read
  // during render (to pick `initial`), and refs aren't safe to read there.
  const [hasGridAnimated, setHasGridAnimated] = useState(false);
  const m = useAppMotion();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (viewMode === 'grid') {
      currentColRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      setHasGridAnimated(true);
    }
  }, [viewMode]);

  const getSubjectForCell = (cellData) => getSubjectForCellShared(cellData, subjects);
  const isClassActive = (dayName, timeString) => isClassActiveNow(dayName, timeString, now);
  const currentColIndex = getCurrentTimeColumnIndex(TIMES, now);

  return (
    <div className="w-full flex flex-col h-[70vh] animate-fade-in">
      <div className="flex gap-4 items-center mb-4 self-end">
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'grid', label: 'Master Grid' },
            { value: 'agenda', label: 'Daily Agenda' },
          ]}
        />
      </div>

      {viewMode === 'grid' && (
        <div className="flex-1 bg-background rounded-xl border border-border overflow-auto custom-scrollbar shadow-inner snap-x snap-mandatory">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="p-3 bg-surface border-b border-r border-border text-xs font-bold text-textSecondary text-center sticky left-0 z-10 w-16">DAY</th>
                {TIMES.map((t, i) => {
                  const isCurrentCol = i === currentColIndex;
                  return (
                    <th
                      key={i}
                      ref={isCurrentCol ? currentColRef : null}
                      className={`p-3 border-b border-r border-border text-[10px] font-bold text-textSecondary text-center whitespace-nowrap snap-start ${t === 'LUNCH' ? 'w-12' : 'w-24'} ${isCurrentCol ? 'bg-accent/10 border-x-2 border-x-accent' : 'bg-surface'}`}
                    >
                      {t}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {MASTER_GRID.map((dayRow, rIndex) => (
                <motion.tr
                  key={rIndex}
                  initial={hasGridAnimated ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...m.base, delay: hasGridAnimated ? 0 : rIndex * 0.03 }}
                >
                  <td className="p-3 bg-surface border-b border-r border-border text-xs font-black text-textPrimary text-center sticky left-0 z-10">{DAYS[rIndex]}</td>
                  {dayRow.map((cellStr, cIndex) => {
                    const cellData = getSubjectForCell(cellStr);
                    const isCurrentCol = cIndex === currentColIndex;
                    const railClass = isCurrentCol ? 'border-x-2 border-x-accent' : '';

                    if (cellData.type === "LUNCH") return <td key={cIndex} className={`bg-surface/80 border-b border-r border-border text-center ${railClass}`}><span className="rotate-90 block text-[9px] font-black text-textSecondary tracking-widest">LUNCH</span></td>;
                    if (cellData.type === "SUBJECT") {
                      return (
                        <td key={cIndex} className={`p-2 border-b border-r border-border text-center ${railClass}`}>
                          <div className={`w-full h-full p-2 rounded-md shadow-sm ${getSubjectColor(cellData.data.id)} flex flex-col justify-center items-center`}>
                            <span className="text-xs font-bold text-white leading-tight line-clamp-2">{cellData.data.name}</span>
                            <span className="text-[9px] text-white/70 mt-1">{cellStr} • {cellData.data.room_number || 'TBA'}</span>
                          </div>
                        </td>
                      );
                    }
                    return <td key={cIndex} className={`p-2 border-b border-r border-border text-center text-[10px] text-textSecondary font-mono ${isCurrentCol ? 'bg-accent/10 border-x-2 border-x-accent' : 'bg-background'}`}>{cellStr}</td>;
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'agenda' && (
        <div ref={agendaScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
          {DAYS.map((day, rIndex) => {
            const activeClassesToday = MASTER_GRID[rIndex].map((cellStr, cIndex) => ({
              time: TIMES[cIndex], cellData: getSubjectForCell(cellStr)
            })).filter(item => item.cellData.type === "SUBJECT");

            if (activeClassesToday.length === 0) return null;

            return (
              <div key={day} className="bg-surface p-5 rounded-xl border border-border shadow-lg">
                <h2 className="text-lg font-black text-accent border-b border-border pb-2 mb-4">{day}DAY</h2>
                <div className="flex flex-col gap-3">
                  {activeClassesToday.map((item, idx) => (
                    <AgendaRow key={idx} item={item} isActive={isClassActive(day, item.time)} scrollRoot={agendaScrollRef} />
                  ))}
                </div>
              </div>
            );
          })}
          {subjects.length === 0 && <div className="text-center text-textSecondary mt-10">No subjects scheduled yet.</div>}
        </div>
      )}
    </div>
  );
}

export default ReadOnlyTimetable;