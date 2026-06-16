import React, { useState, useEffect } from 'react';

function AttendanceStrategyView() {
  const [realSubjects, setRealSubjects] = useState([]);
  const [simulatedSubjects, setSimulatedSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // NEW: State to track which subject's "Total Classes" is currently being edited
  const [editingTotalFor, setEditingTotalFor] = useState(null);
  const [newTotalStr, setNewTotalStr] = useState("");

  const DEFAULT_TOTAL_CLASSES = 60; 
useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/subjects/');
        if (response.ok) {
          const dbData = await response.json();
          
          // 🗺️ MAPPING: Convert PostgreSQL column names to our Crystal Ball engine variables
          const liveData = dbData.map(sub => ({
            id: sub.id,
            name: sub.name,
            attended: sub.attended_classes,
            conducted: sub.conducted_classes,
            total: sub.total_classes
          }));

          setRealSubjects(liveData);
          setSimulatedSubjects(JSON.parse(JSON.stringify(liveData))); // Deep copy for Sandbox
        }
      } catch (err) {
        console.error("Failed to load live subjects from database");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // 🧮 THE CRYSTAL BALL MATH ENGINE
  const calculateForecast = (attended, conducted, total) => {
    const currentPct = conducted === 0 ? 0 : (attended / conducted) * 100;
    
    let safeBunks = 0;
    let rescueClasses = 0;
    let isImpossible = false;
    let remainingClasses = total - conducted;

    if (currentPct >= 75) {
      safeBunks = Math.floor(attended / 0.75) - conducted;
      if (safeBunks > remainingClasses) safeBunks = remainingClasses;
    } else {
      rescueClasses = Math.ceil((0.75 * conducted - attended) / 0.25);
      if (rescueClasses > remainingClasses) isImpossible = true;
    }

    return { currentPct, safeBunks, rescueClasses, isImpossible, remainingClasses };
  };

  // 🎮 SIMULATION CONTROLS
  const simulateBunk = (id) => {
    setSimulatedSubjects(prev => prev.map(sub => {
      if (sub.id === id && sub.conducted < sub.total) {
        return { ...sub, conducted: sub.conducted + 1 };
      }
      return sub;
    }));
  };

  const simulateAttend = (id) => {
    setSimulatedSubjects(prev => prev.map(sub => {
      if (sub.id === id && sub.conducted < sub.total) {
        return { ...sub, attended: sub.attended + 1, conducted: sub.conducted + 1 };
      }
      return sub;
    }));
  };

  const resetSimulation = (id) => {
    const originalSubject = realSubjects.find(s => s.id === id);
    setSimulatedSubjects(prev => prev.map(sub => sub.id === id ? { ...originalSubject } : sub));
  };

  // ⚙️ INLINE TOTAL CLASSES EDITOR
  const handleEditTotal = (sub) => {
    setEditingTotalFor(sub.id);
    setNewTotalStr(sub.total.toString());
  };

  const saveNewTotal = (id, currentConducted) => {
    const parsedTotal = parseInt(newTotalStr, 10);
    
    // Validation: Must be a number, and cannot be less than classes already conducted
    if (!isNaN(parsedTotal) && parsedTotal >= currentConducted) {
      // Update the "Real" memory so it persists through resets
      setRealSubjects(prev => prev.map(s => s.id === id ? { ...s, total: parsedTotal } : s));
      // Update the active Simulation memory
      setSimulatedSubjects(prev => prev.map(s => s.id === id ? { ...s, total: parsedTotal } : s));
    }
    
    setEditingTotalFor(null); // Close the editor
  };

  if (isLoading) return <div className="text-white text-center mt-20 animate-pulse">Initializing Crystal Ball...</div>;

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col h-[85vh]">
      
      <header className="bg-indigo-900/40 p-6 rounded-xl border border-indigo-500/50 mb-6 shadow-[0_0_15px_rgba(79,70,229,0.15)]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-indigo-100 mb-1 flex items-center gap-2">
              🔮 The Strategy Room
            </h1>
            <p className="text-indigo-300/80 text-sm">
              Simulation Mode Active. Data here will not affect your real database.
            </p>
          </div>
          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded border border-indigo-500/30">
            Sandbox Isolated
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pr-2 pb-4">
        {simulatedSubjects.map(sub => {
          const original = realSubjects.find(s => s.id === sub.id);
          const isSimulated = sub.attended !== original.attended || sub.conducted !== original.conducted;
          const forecast = calculateForecast(sub.attended, sub.conducted, sub.total);
          
          return (
            <div key={sub.id} className={`bg-slate-800 p-5 rounded-xl border transition-colors duration-300 shadow-lg flex flex-col ${isSimulated ? 'border-indigo-500' : 'border-slate-700'}`}>
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-200 text-sm w-3/4 leading-tight">{sub.name}</h3>
                <span className={`text-lg font-black ${forecast.currentPct >= 75 ? 'text-green-400' : 'text-red-400'}`}>
                  {forecast.currentPct.toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Attended</p>
                  <p className={`text-xl font-mono mt-0.5 ${isSimulated ? 'text-indigo-400' : 'text-slate-300'}`}>{sub.attended}</p>
                </div>
                <div className="text-slate-600 font-light text-2xl">/</div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Conducted</p>
                  <p className={`text-xl font-mono mt-0.5 ${isSimulated ? 'text-indigo-400' : 'text-slate-300'}`}>{sub.conducted}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center mb-4 min-h-[60px]">
                {forecast.currentPct >= 75 ? (
                  <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-green-400/80 uppercase font-bold tracking-widest mb-1">The Safe Bunk</p>
                    <p className="text-sm text-green-300">You can safely skip <span className="font-black text-white text-base mx-1">{forecast.safeBunks}</span> classes.</p>
                  </div>
                ) : (
                  <div className={`border p-3 rounded-lg text-center ${forecast.isImpossible ? 'bg-red-950/40 border-red-500 text-red-400' : 'bg-orange-900/20 border-orange-500/30 text-orange-300'}`}>
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-80">The Rescue Mission</p>
                    {forecast.isImpossible ? (
                      <p className="text-sm font-bold">Mathematically Impossible.</p>
                    ) : (
                      <p className="text-sm">Must attend <span className="font-black text-white text-base mx-1">{forecast.rescueClasses}</span> consecutive classes.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-2 mb-3">
                <div className="flex gap-2">
                  <button 
                    onClick={() => simulateBunk(sub.id)}
                    disabled={sub.conducted >= sub.total}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-xs font-bold py-2 rounded transition-colors"
                  >
                    + Simulate Bunk
                  </button>
                  <button 
                    onClick={() => simulateAttend(sub.id)}
                    disabled={sub.conducted >= sub.total}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded transition-colors"
                  >
                    + Simulate Attend
                  </button>
                </div>
                
                {isSimulated && (
                  <button 
                    onClick={() => resetSimulation(sub.id)}
                    className="w-full mt-1 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-[10px] uppercase tracking-wider font-bold py-1.5 rounded transition-colors"
                  >
                    ↺ Reset Subject
                  </button>
                )}
              </div>

              {/* ⚙️ THE NEW INLINE EDITOR UI */}
              <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center h-8">
                {editingTotalFor === sub.id ? (
                  <div className="flex gap-2 items-center w-full animate-fade-in">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total:</span>
                    <input 
                      type="number" 
                      value={newTotalStr} 
                      onChange={e => setNewTotalStr(e.target.value)}
                      className="w-16 bg-slate-900 border border-indigo-500/70 rounded text-xs text-white px-2 py-1 outline-none"
                      min={sub.conducted}
                      autoFocus
                    />
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => setEditingTotalFor(null)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded">Cancel</button>
                      <button onClick={() => saveNewTotal(sub.id, sub.conducted)} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-1 rounded shadow-[0_0_8px_rgba(79,70,229,0.4)]">Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400">
                      <span className="text-white font-bold">{sub.total}</span> Total Classes (<span className="text-indigo-300">{forecast.remainingClasses}</span> left)
                    </span>
                    <button onClick={() => handleEditTotal(sub)} className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1">
                      ✎ Edit Total
                    </button>
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AttendanceStrategyView;