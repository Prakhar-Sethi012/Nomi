import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { api } from '../services/api';
import { DAYS, TIMES, MASTER_GRID, slotExistsInCell, getSubjectColor, getSubjectForCell as getSubjectForCellShared, isClassActiveNow, getCurrentTimeColumnIndex } from '../utils/timetableUtils';
import { useAppMotion } from '../hooks/useAppMotion';
import PinConfirmModal from './PinConfirmModal'; // 🔥 IMPORT MODAL
import BottomSheet from './ui/BottomSheet';
import SegmentedControl from './ui/SegmentedControl';
import Skeleton from './ui/Skeleton';
import JumpingDots from './ui/JumpingDots';

// The row nearest the middle of the scrollable agenda lifts slightly and
// takes an accent border — a scroll-centred "you are here" cue. Detection
// is IntersectionObserver-based (useInView), not tied to any animation
// engine, so it keeps working even where reduced-motion collapses the rest.
function AgendaRow({ item, isActive, scrollRoot }) {
  const m = useAppMotion();
  const rowRef = useRef(null);
  const isCentered = useInView(rowRef, { root: scrollRoot, margin: '-45% 0px -45% 0px' });

  return (
    <div
      ref={rowRef}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-500 ${
        isActive
          ? 'border-l-2 bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]'
          : isCentered
            ? 'border-accent bg-background scale-[1.02]'
            : 'border-border bg-background'
      }`}
    >
      <div className="w-24 shrink-0 text-center">
        {isActive ? (
          <motion.span
            className="text-xs font-bold text-success"
            animate={m.reduced ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
            transition={m.reduced ? { duration: 0 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
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
          <span className="bg-surface px-1.5 py-0.5 rounded border border-border transition-colors">{item.cellData.data.subject_type}</span>
          <span className="bg-surface px-1.5 py-0.5 rounded border border-border transition-colors">SLOT: {item.cellData.data.subject_type === 'LAB' ? item.cellData.data.lab_slot : item.cellData.data.theory_slot}</span>
          <span className={`${isActive ? 'bg-success/20 text-success border-success/30' : 'bg-accent/20 text-accent border-accent/30'} px-1.5 py-0.5 rounded border`}>
            🚩 {item.cellData.data.room_number || 'TBA'}
          </span>
        </p>
      </div>
    </div>
  );
}

function TimetableView() {
  const [subjects, setSubjects] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); 
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', subject_type: 'THEORY', theory_slot: '', lab_slot: '', room_number: ''
  });

  // 🔥 NEW STATE FOR MODAL
  const [deleteSubjectId, setDeleteSubjectId] = useState(null);

  const agendaScrollRef = useRef(null);
  const currentColRef = useRef(null);
  // State, not a ref — the "has it already animated" flag needs to be read
  // during render (to pick `initial`), and refs aren't safe to read there.
  const [hasGridAnimated, setHasGridAnimated] = useState(false);
  const m = useAppMotion();

  // The Grid only needs an accurate "now" snapshot once, to place the
  // current-time column and rail — it doesn't need to keep re-rendering
  // every minute the way the Agenda's live "Happening Now" indicator does.
  useEffect(() => {
    setNow(new Date());
    if (viewMode !== 'agenda') return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'grid') {
      currentColRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      setHasGridAnimated(true);
    }
  }, [viewMode]);

  const fetchSubjects = async () => {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error("Failed to fetch timetable", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchSubjects(); 
  }, []);

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const newTheory = formData.theory_slot.toUpperCase();
    const newLab = formData.lab_slot.toUpperCase();

    let hasClash = false;
    for (let r = 0; r < MASTER_GRID.length; r++) {
      for (let c = 0; c < MASTER_GRID[r].length; c++) {
        const cell = MASTER_GRID[r][c];
        const newWantsBlock = slotExistsInCell(newTheory, cell) || slotExistsInCell(newLab, cell);
        
        if (newWantsBlock) {
          const existingOwner = subjects.find(sub => 
            slotExistsInCell(sub.theory_slot, cell) || slotExistsInCell(sub.lab_slot, cell)
          );
          
          if (existingOwner) {
            setErrorMsg(`🚨 CLASH DETECTED: "${existingOwner.name}" is already scheduled during the ${cell} block on ${DAYS[r]}.`);
            hasClash = true;
            break;
          }
        }
      }
      if (hasClash) break;
    }

    if (hasClash) return;

    setIsSaving(true);
    try {
      await api.addSubject(formData);
      fetchSubjects();
      setShowModal(false);
      setFormData({ name: '', subject_type: 'THEORY', theory_slot: '', lab_slot: '', room_number: '' });
    } catch (err) {
      setErrorMsg(err.message || "Failed to save to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const executeDeleteSubject = async (id) => {
    try {
      await api.deleteSubject(id);
      fetchSubjects();
    } catch (err) { 
      console.error("Delete failed", err); 
    }
  };

  const getSubjectForCell = (cellData) => getSubjectForCellShared(cellData, subjects);
  const isClassActive = (dayName, timeString) => isClassActiveNow(dayName, timeString, now);
  const currentColIndex = getCurrentTimeColumnIndex(TIMES, now);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl pb-10 mx-auto flex flex-col h-auto md:h-[85dvh]">
        <div className="bg-surface p-6 rounded-xl border border-border mb-6 shadow-lg flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex gap-4 items-center">
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded" />
          </div>
        </div>
        <div className="flex-1 bg-background rounded-xl border border-border overflow-hidden shadow-inner p-4 flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl pb-10 mx-auto animate-fade-in flex flex-col h-auto md:h-[85dvh]">

      <header className="bg-surface p-6 rounded-xl border border-border mb-6 shadow-lg flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between shrink-0 transition-colors duration-300">
        <div className="w-full min-w-0 md:w-auto">
          <h1 className="text-2xl font-bold text-textPrimary mb-1 flex items-center gap-2 leading-tight">🗓️ Timetable Matrix</h1>
          <p className="text-textSecondary text-sm leading-tight">FFCS Auto-mapping Engine active.</p>
        </div>

        <div className="w-full min-w-0 md:w-auto flex flex-wrap gap-4 items-center">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'grid', label: 'Master Grid' },
              { value: 'agenda', label: 'Daily Agenda' },
            ]}
          />
          <button onClick={() => setShowModal(true)} className="shrink-0 flex flex-row items-center justify-center gap-2 bg-accent hover:bg-accentHover text-white font-bold py-2 px-4 rounded shadow-lg transition-colors">
            + Add Subject
          </button>
        </div>
      </header>

      <BottomSheet isOpen={showModal} onClose={() => setShowModal(false)} title="Register Course">
        {errorMsg && <div className="bg-dangerBg border border-danger text-danger text-xs p-3 rounded mb-4 font-mono">{errorMsg}</div>}

        <form onSubmit={handleSaveSubject} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-textSecondary uppercase font-bold">Course Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary outline-none border border-border focus:border-accent mt-1 transition-colors" />
          </div>

          <div>
            <label className="text-[10px] text-textSecondary uppercase font-bold">Room / Venue</label>
            <input type="text" placeholder="e.g. SJT 314" value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary outline-none border border-border focus:border-accent mt-1 uppercase transition-colors" />
          </div>
          <div>
            <label className="text-[10px] text-textSecondary uppercase font-bold">Course Type</label>
            <select value={formData.subject_type} onChange={e => setFormData({...formData, subject_type: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary outline-none border border-border focus:border-accent mt-1 transition-colors">
              <option value="THEORY">Theory Only</option>
              <option value="LAB">Lab Only</option>
              <option value="EMBEDDED">Embedded (Theory + Lab)</option>
            </select>
          </div>

          <div className="flex gap-4">
            {(formData.subject_type === 'THEORY' || formData.subject_type === 'EMBEDDED') && (
              <div className="flex-1">
                <label className="text-[10px] text-textSecondary uppercase font-bold">Theory Slot(s)</label>
                <input type="text" placeholder="e.g. A1 or A1+TA1" required value={formData.theory_slot} onChange={e => setFormData({...formData, theory_slot: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary outline-none border border-border mt-1 uppercase transition-colors" />
              </div>
            )}
            {(formData.subject_type === 'LAB' || formData.subject_type === 'EMBEDDED') && (
              <div className="flex-1">
                <label className="text-[10px] text-textSecondary uppercase font-bold">Lab Slot(s)</label>
                <input type="text" placeholder="e.g. L31+L32" required value={formData.lab_slot} onChange={e => setFormData({...formData, lab_slot: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary outline-none border border-border mt-1 uppercase transition-colors" />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-surfaceHover hover:bg-border text-textPrimary font-bold py-2 rounded transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 bg-accent hover:bg-accentHover disabled:opacity-60 text-white font-bold py-2 rounded transition-colors flex items-center justify-center">{isSaving ? <JumpingDots /> : 'Save Mapping'}</button>
          </div>
        </form>
      </BottomSheet>

      {viewMode === 'grid' && (
        <div className="flex-1 md:min-h-0 bg-background rounded-xl border border-border overflow-x-auto md:overflow-auto custom-scrollbar shadow-inner transition-colors duration-300 snap-x snap-mandatory">
          {/* border-separate (not border-collapse) — a sticky first column
              inside a border-collapse table is a known browser rendering
              trap: the sticky cell's borders don't collapse cleanly with
              whatever column currently scrolls up against it, so a stray
              double/missing border line appears at whatever column happens
              to sit at the sticky boundary. Every cell only ever paints its
              own bottom/right edge (never top/left), so border-spacing-0
              still reads as one continuous grid, not doubled lines. */}
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
            <thead>
              <tr>
                <th className="p-3 bg-surface border-b border-r border-border text-xs font-bold text-textSecondary text-center sticky left-0 z-10 w-16 transition-colors">DAY</th>
                {TIMES.map((time, i) => {
                  const isCurrentCol = i === currentColIndex;
                  return (
                    <th
                      key={i}
                      ref={isCurrentCol ? currentColRef : null}
                      className={`p-3 border-b border-r border-border text-[10px] font-bold text-textSecondary text-center whitespace-nowrap transition-colors snap-start ${time === 'LUNCH' ? 'w-12' : 'w-24'} ${isCurrentCol ? 'bg-accent/10 border-x-2 border-x-accent' : 'bg-surface'}`}
                    >
                      {time}
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
                  <td className="p-3 bg-surface border-b border-r border-border text-xs font-black text-textPrimary text-center sticky left-0 z-10 transition-colors">
                    {DAYS[rIndex]}
                  </td>
                  {dayRow.map((cellStr, cIndex) => {
                    const cellData = getSubjectForCell(cellStr);
                    const isCurrentCol = cIndex === currentColIndex;
                    const railClass = isCurrentCol ? 'border-x-2 border-x-accent' : '';

                    if (cellData.type === "LUNCH") {
                      return <td key={cIndex} className={`bg-surface/80 border-b border-r border-border text-center transition-colors ${railClass}`}><span className="rotate-90 block text-[9px] font-black text-textSecondary tracking-widest">LUNCH</span></td>;
                    }

                    if (cellData.type === "SUBJECT") {
                      return (
                        <td key={cIndex} className={`p-2 border-b border-r border-border text-center relative group transition-colors ${railClass}`}>
                          <div className={`w-full h-full p-2 rounded-md shadow-sm ${getSubjectColor(cellData.data.id)} flex flex-col justify-center items-center transition-transform hover:scale-105 cursor-pointer`}>
                            <span className="text-xs font-bold text-white leading-tight line-clamp-2">{cellData.data.name}</span>
                            <span className="text-[9px] text-white/70 mt-1">{cellStr} • {cellData.data.room_number || 'TBA'}</span>
                          </div>
                          <div className="absolute top-0 right-0 flex md:hidden md:group-hover:flex">
                            <button onClick={() => setDeleteSubjectId(cellData.data.id)} className="bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-bl-md shadow hover:bg-red-500">✕</button>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={cIndex} className={`p-2 border-b border-r border-border text-center text-[10px] text-textSecondary font-mono hover:bg-surfaceHover transition-colors ${isCurrentCol ? 'bg-accent/10 border-x-2 border-x-accent' : 'bg-background'}`}>
                        {cellStr}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'agenda' && (
        <div ref={agendaScrollRef} className="flex-1 md:min-h-0 overflow-visible md:overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
          {DAYS.map((day, rIndex) => {
            const activeClassesToday = MASTER_GRID[rIndex].map((cellStr, cIndex) => ({
              time: TIMES[cIndex],
              cellData: getSubjectForCell(cellStr)
            })).filter(item => item.cellData.type === "SUBJECT");

            if (activeClassesToday.length === 0) return null;

            return (
              <div key={day} className="bg-surface p-5 rounded-xl border border-border shadow-lg transition-colors duration-300">
                <h2 className="text-lg font-black text-accent border-b border-border pb-2 mb-4 transition-colors">{day}DAY</h2>
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

      {/* 🔥 MODAL */}
      <PinConfirmModal 
        isOpen={deleteSubjectId !== null}
        onClose={() => setDeleteSubjectId(null)}
        onConfirm={() => {
          executeDeleteSubject(deleteSubjectId);
          setDeleteSubjectId(null);
        }}
        actionText="Delete Class & Attendance Log"
      />

    </div>
  );
}

export default TimetableView;