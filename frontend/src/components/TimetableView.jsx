import React, { useState, useEffect } from 'react';

// ==========================================
// 1. THE FFCS MASTER DICTIONARY
// ==========================================
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const TIMES = [
  "08:00 - 08:50", "09:00 - 09:50", "10:00 - 10:50", "11:00 - 11:50", "12:00 - 12:50",
  "LUNCH",
  "14:00 - 14:50", "15:00 - 15:50", "16:00 - 16:50", "17:00 - 17:50", "18:00 - 18:50"
];

// Based on the standard VIT timetable matrix
const MASTER_GRID = [
  ["A1/L1", "F1/L2", "D1/L3", "TB1/L4", "TG1/L5", "LUNCH", "A2/L31", "F2/L32", "D2/L33", "TB2/L34", "TG2/L35"], // MON
  ["B1/L7", "G1/L8", "E1/L9", "TC1/L10", "TAA1/L11", "LUNCH", "B2/L37", "G2/L38", "E2/L39", "TC2/L40", "TAA2/L41"], // TUE
  ["C1/L13", "A1/L14", "F1/L15", "L16", "L17", "LUNCH", "C2/L43", "A2/L44", "F2/L45", "TD2/L46", "TBB2/L47"], // WED
  ["D1/L19", "B1/L20", "G1/L21", "TE1/L22", "TCC1/L23", "LUNCH", "D2/L49", "B2/L50", "G2/L51", "TE2/L52", "TCC2/L53"], // THU
  ["E1/L25", "C1/L26", "TA1/L27", "TF1/L28", "TD1/L29", "LUNCH", "E2/L55", "C2/L56", "TA2/L57", "TF2/L58", "TDD2/L59"], // FRI
];

function TimetableView() {
  const [subjects, setSubjects] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'agenda'
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    name: '', subject_type: 'THEORY', theory_slot: '', lab_slot: ''
  });

  // Fetch from FastAPI
  const fetchSubjects = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/subjects/');
      if (res.ok) setSubjects(await res.json());
    } catch (err) {
      console.error("Failed to fetch timetable");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSubjects(); }, []);

  // ==========================================
  // 2. THE CLASH DETECTION ENGINE
  // ==========================================
  // Checks if a given string of slots (e.g., "A1+TA1") exists inside a specific grid cell (e.g., "A1/L1")
  const slotExistsInCell = (userSlots, cellData) => {
    if (!userSlots || cellData === "LUNCH") return false;
    // Split "A1+TA1" into ["A1", "TA1"] and check if the cell contains any of them
    const slotsArray = userSlots.split('+').map(s => s.trim().toUpperCase());
    const cellSlots = cellData.split('/'); // ["A1", "L1"]
    return slotsArray.some(s => cellSlots.includes(s));
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const newTheory = formData.theory_slot.toUpperCase();
    const newLab = formData.lab_slot.toUpperCase();

    // 🛡️ FAILSAFE: Check for Clashes
    let hasClash = false;
    for (let r = 0; r < MASTER_GRID.length; r++) {
      for (let c = 0; c < MASTER_GRID[r].length; c++) {
        const cell = MASTER_GRID[r][c];
        
        // Does our new subject want this block?
        const newWantsBlock = slotExistsInCell(newTheory, cell) || slotExistsInCell(newLab, cell);
        
        if (newWantsBlock) {
          // Does an existing subject already own this block?
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

    if (hasClash) return; // Abort save!

    // If safe, save to Database
    try {
      const res = await fetch('http://127.0.0.1:8000/subjects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchSubjects();
        setShowModal(false);
        setFormData({ name: '', subject_type: 'THEORY', theory_slot: '', lab_slot: '' });
      }
    } catch (err) { setErrorMsg("Failed to save to database."); }
  };

  const deleteSubject = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/subjects/${id}`, { method: 'DELETE' });
      fetchSubjects();
    } catch (err) { console.error("Delete failed"); }
  };

  // ==========================================
  // 3. UI HELPER FUNCTIONS
  // ==========================================
  // Assign a fixed color to a subject based on its ID so it stays consistent
  const getSubjectColor = (id) => {
    const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600'];
    return colors[id % colors.length];
  };

  // Find which subject owns a specific cell on the grid
  const getSubjectForCell = (cellData) => {
    if (cellData === "LUNCH") return { type: "LUNCH" };
    
    const owner = subjects.find(sub => 
      slotExistsInCell(sub.theory_slot, cellData) || slotExistsInCell(sub.lab_slot, cellData)
    );
    
    if (owner) return { type: "SUBJECT", data: owner };
    return { type: "EMPTY", data: cellData };
  };

  if (isLoading) return <div className="text-white text-center mt-20 animate-pulse">Mapping FFCS Matrix...</div>;

  return (
    <div className="w-full max-w-7xl pb-10 mx-auto animate-fade-in flex flex-col h-[85vh]">
      
      {/* 🎛️ HEADER & CONTROLS */}
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">🗓️ Timetable Matrix</h1>
          <p className="text-slate-400 text-sm">FFCS Auto-mapping Engine active.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          {/* View Toggle */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-1 flex gap-1">
            <button onClick={() => setViewMode('grid')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Master Grid</button>
            <button onClick={() => setViewMode('agenda')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'agenda' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Daily Agenda</button>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded shadow-lg transition-colors">
            + Add Subject
          </button>
        </div>
      </header>

      {/* 🛑 ADD SUBJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4">Register Course</h2>
            {errorMsg && <div className="bg-red-900/50 border border-red-500 text-red-200 text-xs p-3 rounded mb-4 font-mono">{errorMsg}</div>}
            
            <form onSubmit={handleSaveSubject} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold">Course Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 bg-slate-900 rounded text-sm text-white outline-none border border-slate-700 focus:border-indigo-500 mt-1" />
              </div>
              
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold">Course Type</label>
                <select value={formData.subject_type} onChange={e => setFormData({...formData, subject_type: e.target.value})} className="w-full p-2 bg-slate-900 rounded text-sm text-white outline-none border border-slate-700 focus:border-indigo-500 mt-1">
                  <option value="THEORY">Theory Only</option>
                  <option value="LAB">Lab Only</option>
                  <option value="EMBEDDED">Embedded (Theory + Lab)</option>
                </select>
              </div>

              <div className="flex gap-4">
                {(formData.subject_type === 'THEORY' || formData.subject_type === 'EMBEDDED') && (
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Theory Slot(s)</label>
                    <input type="text" placeholder="e.g. A1 or A1+TA1" required value={formData.theory_slot} onChange={e => setFormData({...formData, theory_slot: e.target.value})} className="w-full p-2 bg-slate-900 rounded text-sm text-white outline-none border border-slate-700 mt-1 uppercase" />
                  </div>
                )}
                {(formData.subject_type === 'LAB' || formData.subject_type === 'EMBEDDED') && (
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Lab Slot(s)</label>
                    <input type="text" placeholder="e.g. L31+L32" required value={formData.lab_slot} onChange={e => setFormData({...formData, lab_slot: e.target.value})} className="w-full p-2 bg-slate-900 rounded text-sm text-white outline-none border border-slate-700 mt-1 uppercase" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded">Save Mapping</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* VIEW 1: THE MASTER GRID                 */}
      {/* ======================================= */}
      {viewMode === 'grid' && (
        <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-700 overflow-auto custom-scrollbar shadow-inner">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="p-3 bg-slate-800 border-b border-r border-slate-700 text-xs font-bold text-slate-400 text-center sticky left-0 z-10 w-16">DAY</th>
                {TIMES.map((time, i) => (
                  <th key={i} className={`p-3 bg-slate-800 border-b border-r border-slate-700 text-[10px] font-bold text-slate-400 text-center whitespace-nowrap ${time === 'LUNCH' ? 'w-12' : 'w-24'}`}>
                    {time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MASTER_GRID.map((dayRow, rIndex) => (
                <tr key={rIndex}>
                  <td className="p-3 bg-slate-800 border-b border-r border-slate-700 text-xs font-black text-white text-center sticky left-0 z-10">
                    {DAYS[rIndex]}
                  </td>
                  {dayRow.map((cellStr, cIndex) => {
                    const cellData = getSubjectForCell(cellStr);
                    
                    if (cellData.type === "LUNCH") {
                      return <td key={cIndex} className="bg-slate-800/80 border-b border-r border-slate-700 text-center"><span className="rotate-90 block text-[9px] font-black text-slate-600 tracking-widest">LUNCH</span></td>;
                    }
                    
                    if (cellData.type === "SUBJECT") {
                      return (
                        <td key={cIndex} className={`p-2 border-b border-r border-slate-700 text-center relative group`}>
                          <div className={`w-full h-full p-2 rounded-md shadow-sm ${getSubjectColor(cellData.data.id)} flex flex-col justify-center items-center transition-transform hover:scale-105 cursor-pointer`}>
                            <span className="text-xs font-bold text-white leading-tight line-clamp-2">{cellData.data.name}</span>
                            <span className="text-[9px] text-white/70 mt-1">{cellStr}</span>
                          </div>
                          {/* Delete Tooltip on Hover */}
                          <div className="absolute top-0 right-0 hidden group-hover:flex">
                            <button onClick={() => deleteSubject(cellData.data.id)} className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-bl-md shadow hover:bg-red-500">✕</button>
                          </div>
                        </td>
                      );
                    }

                    // Empty Slot
                    return (
                      <td key={cIndex} className="p-2 border-b border-r border-slate-700/50 bg-slate-900 text-center text-[10px] text-slate-600 font-mono hover:bg-slate-800 transition-colors">
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

      {/* ======================================= */}
      {/* VIEW 2: THE DAILY AGENDA                */}
      {/* ======================================= */}
      {viewMode === 'agenda' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
          {DAYS.map((day, rIndex) => {
            // Filter to see if there are ANY classes on this day before rendering the day card
            const activeClassesToday = MASTER_GRID[rIndex].map((cellStr, cIndex) => ({
              time: TIMES[cIndex],
              cellData: getSubjectForCell(cellStr)
            })).filter(item => item.cellData.type === "SUBJECT");

            if (activeClassesToday.length === 0) return null; // Skip days with no classes

            return (
              <div key={day} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                <h2 className="text-lg font-black text-indigo-400 border-b border-slate-700 pb-2 mb-4">{day}DAY</h2>
                <div className="flex flex-col gap-3">
                  {activeClassesToday.map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-4 p-3 rounded-lg border border-slate-600/50 bg-slate-900/50 border-l-4`} style={{ borderLeftColor: 'currentColor', color: 'rgb(79, 70, 229)' }}>
                      <div className="w-24 shrink-0 text-center">
                        <span className="text-xs text-slate-400 font-bold">{item.time}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white">{item.cellData.data.name}</h3>
                        <p className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">
                          {item.cellData.data.subject_type} • SLOT: {item.cellData.data.subject_type === 'LAB' ? item.cellData.data.lab_slot : item.cellData.data.theory_slot}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {subjects.length === 0 && <div className="text-center text-slate-500 mt-10">No subjects scheduled yet.</div>}
        </div>
      )}

    </div>
  );
}

export default TimetableView;