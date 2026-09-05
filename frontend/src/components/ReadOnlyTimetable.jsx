import React, { useState, useEffect } from 'react';
import { DAYS, TIMES, MASTER_GRID, getSubjectColor, getSubjectForCell as getSubjectForCellShared, isClassActiveNow } from '../utils/timetableUtils';

function ReadOnlyTimetable({ subjects }) {
  const [viewMode, setViewMode] = useState('grid');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getSubjectForCell = (cellData) => getSubjectForCellShared(cellData, subjects);
  const isClassActive = (dayName, timeString) => isClassActiveNow(dayName, timeString, now);

  return (
    <div className="w-full flex flex-col h-[70vh] animate-fade-in">
      <div className="flex gap-4 items-center mb-4 self-end">
        <div className="bg-background border border-border rounded-lg p-1 flex gap-1 transition-colors duration-300">
          <button onClick={() => setViewMode('grid')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'grid' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary'}`}>Master Grid</button>
          <button onClick={() => setViewMode('agenda')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'agenda' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary'}`}>Daily Agenda</button>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="flex-1 bg-background rounded-xl border border-border overflow-auto custom-scrollbar shadow-inner">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="p-3 bg-surface border-b border-r border-border text-xs font-bold text-textSecondary text-center sticky left-0 z-10 w-16">DAY</th>
                {TIMES.map((t, i) => <th key={i} className={`p-3 bg-surface border-b border-r border-border text-[10px] font-bold text-textSecondary text-center whitespace-nowrap ${t === 'LUNCH' ? 'w-12' : 'w-24'}`}>{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {MASTER_GRID.map((dayRow, rIndex) => (
                <tr key={rIndex}>
                  <td className="p-3 bg-surface border-b border-r border-border text-xs font-black text-textPrimary text-center sticky left-0 z-10">{DAYS[rIndex]}</td>
                  {dayRow.map((cellStr, cIndex) => {
                    const cellData = getSubjectForCell(cellStr);
                    if (cellData.type === "LUNCH") return <td key={cIndex} className="bg-surface/80 border-b border-r border-border text-center"><span className="rotate-90 block text-[9px] font-black text-textSecondary tracking-widest">LUNCH</span></td>;
                    if (cellData.type === "SUBJECT") {
                      return (
                        <td key={cIndex} className={`p-2 border-b border-r border-border text-center`}>
                          <div className={`w-full h-full p-2 rounded-md shadow-sm ${getSubjectColor(cellData.data.id)} flex flex-col justify-center items-center`}>
                            <span className="text-xs font-bold text-white leading-tight line-clamp-2">{cellData.data.name}</span>
                            <span className="text-[9px] text-white/70 mt-1">{cellStr} • {cellData.data.room_number || 'TBA'}</span>
                          </div>
                        </td>
                      );
                    }
                    return <td key={cIndex} className="p-2 border-b border-r border-border bg-background text-center text-[10px] text-textSecondary font-mono">{cellStr}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'agenda' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
          {DAYS.map((day, rIndex) => {
            const activeClassesToday = MASTER_GRID[rIndex].map((cellStr, cIndex) => ({
              time: TIMES[cIndex], cellData: getSubjectForCell(cellStr)
            })).filter(item => item.cellData.type === "SUBJECT");

            if (activeClassesToday.length === 0) return null; 

            return (
              <div key={day} className="bg-surface p-5 rounded-xl border border-border shadow-lg">
                <h2 className="text-lg font-black text-accent border-b border-border pb-2 mb-4">{day}DAY</h2>
                <div className="flex flex-col gap-3">
                  {activeClassesToday.map((item, idx) => {
                    const isActive = isClassActive(day, item.time);
                    return (
                      <div key={idx} className={`flex items-center gap-4 p-3 rounded-lg border border-l-4 ${isActive ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]' : 'border-border bg-background border-l-accent'}`}>
                        <div className="w-24 shrink-0 text-center">
                          <span className={`text-xs font-bold ${isActive ? 'text-success animate-pulse' : 'text-textSecondary'}`}>{item.time}</span>
                          {isActive && <span className="block text-[8px] uppercase tracking-widest text-success mt-1 font-black">Happening Now</span>}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-sm font-bold text-textPrimary`}>{item.cellData.data.name}</h3>
                          <p className="text-[10px] uppercase font-bold text-textSecondary mt-0.5 flex flex-wrap gap-1.5 items-center">
                            <span className="bg-surface px-1.5 py-0.5 rounded border border-border">{item.cellData.data.subject_type}</span>
                            <span className="bg-surface px-1.5 py-0.5 rounded border border-border">SLOT: {item.cellData.data.subject_type === 'LAB' ? item.cellData.data.lab_slot : item.cellData.data.theory_slot}</span>
                            <span className={`${isActive ? 'bg-success/20 text-success border-success/30' : 'bg-accent/20 text-accent border-accent/30'} px-1.5 py-0.5 rounded border`}>🚩 {item.cellData.data.room_number || 'TBA'}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
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