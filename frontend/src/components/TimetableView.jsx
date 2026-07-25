import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
// 🔥 NEW: Importing the brain from our central utility file
import { DAYS, TIMES, MASTER_GRID, slotExistsInCell } from '../utils/timetableUtils';

function TimetableView() {
  const [subjects, setSubjects] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); 
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    name: '', subject_type: 'THEORY', theory_slot: '', lab_slot: '', room_number: ''
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer); 
  }, []);

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

    try {
      await api.addSubject(formData);
      fetchSubjects();
      setShowModal(false);
      setFormData({ name: '', subject_type: 'THEORY', theory_slot: '', lab_slot: '', room_number: '' });
    } catch (err) { 
      setErrorMsg(err.message || "Failed to save to database."); 
    }
  };

  const deleteSubject = async (id) => {
    try {
      await api.deleteSubject(id);
      fetchSubjects();
    } catch (err) { 
      console.error("Delete failed", err); 
    }
  };

  const getSubjectColor = (id) => {
    const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600'];
    return colors[id % colors.length];
  };

  const getSubjectForCell = (cellData) => {
    if (cellData === "LUNCH") return { type: "LUNCH" };
    
    const owner = subjects.find(sub => 
      slotExistsInCell(sub.theory_slot, cellData) || slotExistsInCell(sub.lab_slot, cellData)
    );
    
    if (owner) return { type: "SUBJECT", data: owner };
    return { type: "EMPTY", data: cellData };
  };

  const isClassActive = (dayName, timeString) => {
    const jsDays = ["SUN", "MON", "TUES", "WEDNES", "THURS", "FRI", "SAT"];
    const currentDayName = jsDays[now.getDay()];
    
    if (dayName !== currentDayName) return false;

    try {
      const [startStr, endStr] = timeString.split(" - ");
      if (!startStr || !endStr) return false;

      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = startStr.split(":").map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const [endH, endM] = endStr.split(":").map(Number);
      const endTotalMinutes = endH * 60 + endM;

      return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    } catch (e) {
      return false;
    }
  };

  if (isLoading) return <div className="text-accent text-center mt-20 animate-pulse">Mapping FFCS Matrix...</div>;

  return (
    <div className="w-full max-w-7xl pb-10 mx-auto animate-fade-in flex flex-col h-[85vh]">
      
      <header className="bg-surface p-6 rounded-xl border border-border mb-6 shadow-lg flex justify-between items-center shrink-0 transition-colors duration-300">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary mb-1 flex items-center gap-2">🗓️ Timetable Matrix</h1>
          <p className="text-textSecondary text-sm">FFCS Auto-mapping Engine active.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="bg-background border border-border rounded-lg p-1 flex gap-1 transition-colors duration-300">
            <button onClick={() => setViewMode('grid')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'grid' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary'}`}>Master Grid</button>
            <button onClick={() => setViewMode('agenda')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'agenda' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary'}`}>Daily Agenda</button>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-accent hover:bg-accentHover text-white font-bold py-2 px-4 rounded shadow-lg transition-colors">
            + Add Subject
          </button>
        </div>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface p-6 rounded-xl border border-border w-full max-w-md shadow-2xl animate-fade-in transition-colors duration-300">
            <h2 className="text-xl font-bold text-textPrimary mb-4">Register Course</h2>
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
                <button type="submit" className="flex-1 bg-accent hover:bg-accentHover text-white font-bold py-2 rounded transition-colors">Save Mapping</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="flex-1 bg-background rounded-xl border border-border overflow-auto custom-scrollbar shadow-inner transition-colors duration-300">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="p-3 bg-surface border-b border-r border-border text-xs font-bold text-textSecondary text-center sticky left-0 z-10 w-16 transition-colors">DAY</th>
                {TIMES.map((time, i) => (
                  <th key={i} className={`p-3 bg-surface border-b border-r border-border text-[10px] font-bold text-textSecondary text-center whitespace-nowrap transition-colors ${time === 'LUNCH' ? 'w-12' : 'w-24'}`}>
                    {time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MASTER_GRID.map((dayRow, rIndex) => (
                <tr key={rIndex}>
                  <td className="p-3 bg-surface border-b border-r border-border text-xs font-black text-textPrimary text-center sticky left-0 z-10 transition-colors">
                    {DAYS[rIndex]}
                  </td>
                  {dayRow.map((cellStr, cIndex) => {
                    const cellData = getSubjectForCell(cellStr);
                    
                    if (cellData.type === "LUNCH") {
                      return <td key={cIndex} className="bg-surface/80 border-b border-r border-border text-center transition-colors"><span className="rotate-90 block text-[9px] font-black text-textSecondary tracking-widest">LUNCH</span></td>;
                    }
                    
                    if (cellData.type === "SUBJECT") {
                      return (
                        <td key={cIndex} className={`p-2 border-b border-r border-border text-center relative group transition-colors`}>
                          <div className={`w-full h-full p-2 rounded-md shadow-sm ${getSubjectColor(cellData.data.id)} flex flex-col justify-center items-center transition-transform hover:scale-105 cursor-pointer`}>
                            <span className="text-xs font-bold text-white leading-tight line-clamp-2">{cellData.data.name}</span>
                            <span className="text-[9px] text-white/70 mt-1">{cellStr} • {cellData.data.room_number || 'TBA'}</span>
                          </div>
                          <div className="absolute top-0 right-0 hidden group-hover:flex">
                            <button onClick={() => deleteSubject(cellData.data.id)} className="bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-bl-md shadow hover:bg-red-500">✕</button>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={cIndex} className="p-2 border-b border-r border-border bg-background text-center text-[10px] text-textSecondary font-mono hover:bg-surfaceHover transition-colors">
                        {cellStr}
                      </td>
                    );
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
              time: TIMES[cIndex],
              cellData: getSubjectForCell(cellStr)
            })).filter(item => item.cellData.type === "SUBJECT");

            if (activeClassesToday.length === 0) return null; 

            return (
              <div key={day} className="bg-surface p-5 rounded-xl border border-border shadow-lg transition-colors duration-300">
                <h2 className="text-lg font-black text-accent border-b border-border pb-2 mb-4 transition-colors">{day}DAY</h2>
                <div className="flex flex-col gap-3">
                  {activeClassesToday.map((item, idx) => {
                    const isActive = isClassActive(day, item.time);

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-500 border-l-4 ${
                          isActive 
                            ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]' 
                            : 'border-border bg-background border-l-accent'
                        }`}
                      >
                        <div className="w-24 shrink-0 text-center">
                          <span className={`text-xs font-bold ${isActive ? 'text-success animate-pulse' : 'text-textSecondary'}`}>
                            {item.time}
                          </span>
                          {isActive && <span className="block text-[8px] uppercase tracking-widest text-success mt-1 font-black">Happening Now</span>}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-sm font-bold text-textPrimary`}>{item.cellData.data.name}</h3>
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

export default TimetableView;