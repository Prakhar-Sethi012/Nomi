import React, { useState, useEffect } from 'react';
import { calculateForecast } from '../utils/attendanceEngine'; 
import { api } from '../services/api';

function AttendanceStrategyView() {
  const [realSubjects, setRealSubjects] = useState([]);
  const [simulatedSubjects, setSimulatedSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingTotalFor, setEditingTotalFor] = useState(null);
  const [newTotalStr, setNewTotalStr] = useState("");

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const dbData = await api.getSubjects();
        
        const liveData = dbData.map(sub => ({
          id: sub.id,
          name: sub.name,
          attended: sub.attended_classes,
          conducted: sub.conducted_classes,
          total: sub.total_classes
        }));

        setRealSubjects(liveData);
        setSimulatedSubjects(JSON.parse(JSON.stringify(liveData)));
      } catch (err) {
        console.error("Failed to load live subjects from database", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, []);

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

  const handleEditTotal = (sub) => {
    setEditingTotalFor(sub.id);
    setNewTotalStr(sub.total.toString());
  };

  const saveNewTotal = async (id, currentConducted) => {
    const parsedTotal = parseInt(newTotalStr, 10);
    
    if (!isNaN(parsedTotal) && parsedTotal >= currentConducted) {
      try {
        await api.updateSubject(id, { total_classes: parsedTotal });

        setRealSubjects(prev => prev.map(s => s.id === id ? { ...s, total: parsedTotal } : s));
        setSimulatedSubjects(prev => prev.map(s => s.id === id ? { ...s, total: parsedTotal } : s));
      } catch (err) {
        console.error("Failed to save total classes to database", err);
      }
    }
    
    setEditingTotalFor(null);
  };

  if (isLoading) return <div className="text-textPrimary text-center mt-20 animate-pulse">Initializing Crystal Ball...</div>;

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col h-[85vh]">
      
      <header className="bg-indigo-600 p-6 rounded-xl border border-indigo-500 mb-6 shadow-[0_0_15px_rgba(79,70,229,0.15)]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              🔮 The Strategy Room
            </h1>
            <p className="text-indigo-100 text-sm">
              Simulation Mode Active. Data here will not affect your real database.
            </p>
          </div>
          <span className="bg-white/20 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded border border-white/30">
            Sandbox Isolated
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pr-2 pb-4">
        {simulatedSubjects.map(sub => {
          const original = realSubjects.find(s => s.id === sub.id);
          const isSimulated = original ? (sub.attended !== original.attended || sub.conducted !== original.conducted) : false;
          const forecast = calculateForecast(sub.attended, sub.conducted, sub.total);
          
          return (
            <div key={sub.id} className={`bg-surface p-5 rounded-xl border transition-colors duration-300 shadow-lg flex flex-col ${isSimulated ? 'border-accent' : 'border-border'}`}>

              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-textPrimary text-sm w-3/4 leading-tight">{sub.name}</h3>
                <span className={`text-lg font-black ${forecast.currentPct >= 75 ? 'text-success' : 'text-danger'}`}>
                  {forecast.currentPct.toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between items-center bg-background p-3 rounded-lg border border-border mb-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-textSecondary font-bold">Attended</p>
                  <p className={`text-xl font-mono mt-0.5 ${isSimulated ? 'text-accent' : 'text-textPrimary'}`}>{sub.attended}</p>
                </div>
                <div className="text-textSecondary font-light text-2xl">/</div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-textSecondary font-bold">Conducted</p>
                  <p className={`text-xl font-mono mt-0.5 ${isSimulated ? 'text-accent' : 'text-textPrimary'}`}>{sub.conducted}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center mb-4 min-h-[60px]">
                {forecast.currentPct >= 75 ? (
                  <div className="bg-success/10 border border-success/30 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-success/80 uppercase font-bold tracking-widest mb-1">The Safe Bunk</p>
                    <p className="text-sm text-success">You can safely skip <span className="font-black text-textPrimary text-base mx-1">{forecast.safeBunks}</span> classes.</p>
                  </div>
                ) : (
                  <div className={`border p-3 rounded-lg text-center ${forecast.isImpossible ? 'bg-dangerBg border-danger text-danger' : 'bg-orange-900/20 border-orange-500/30 text-orange-300'}`}>
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-80">The Rescue Mission</p>
                    {forecast.isImpossible ? (
                      <p className="text-sm font-bold">Mathematically Impossible.</p>
                    ) : (
                      <p className="text-sm">Must attend <span className="font-black text-textPrimary text-base mx-1">{forecast.rescueClasses}</span> consecutive classes.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-2 mb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => simulateBunk(sub.id)}
                    disabled={sub.conducted >= sub.total}
                    className="flex-1 bg-surfaceHover hover:bg-border disabled:opacity-50 text-textPrimary text-xs font-bold py-2 rounded transition-colors"
                  >
                    + Simulate Bunk
                  </button>
                  <button
                    onClick={() => simulateAttend(sub.id)}
                    disabled={sub.conducted >= sub.total}
                    className="flex-1 bg-accent hover:bg-accentHover disabled:opacity-50 text-white text-xs font-bold py-2 rounded transition-colors"
                  >
                    + Simulate Attend
                  </button>
                </div>

                {isSimulated && (
                  <button
                    onClick={() => resetSimulation(sub.id)}
                    className="w-full mt-1 bg-dangerBg hover:bg-danger/60 border border-danger/30 text-danger text-[10px] uppercase tracking-wider font-bold py-1.5 rounded transition-colors"
                  >
                    ↺ Reset Subject
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center h-8">
                {editingTotalFor === sub.id ? (
                  <div className="flex gap-2 items-center w-full animate-fade-in">
                    <span className="text-[10px] text-textSecondary uppercase font-bold">Total:</span>
                    <input
                      type="number"
                      value={newTotalStr}
                      onChange={e => setNewTotalStr(e.target.value)}
                      className="w-16 bg-background border border-accent/70 rounded text-xs text-textPrimary px-2 py-1 outline-none"
                      min={sub.conducted}
                      autoFocus
                    />
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => setEditingTotalFor(null)} className="text-[10px] bg-surfaceHover hover:bg-border text-textPrimary px-2 py-1 rounded">Cancel</button>
                      <button onClick={() => saveNewTotal(sub.id, sub.conducted)} className="text-[10px] bg-accent hover:bg-accentHover text-white font-bold px-2 py-1 rounded shadow-[0_0_8px_rgba(79,70,229,0.4)]">Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] text-textSecondary">
                      <span className="text-textPrimary font-bold">{sub.total}</span> Total Classes (<span className="text-accent">{forecast.remainingClasses}</span> left)
                    </span>
                    <button onClick={() => handleEditTotal(sub)} className="text-[10px] text-textSecondary hover:text-accent transition-colors flex items-center gap-1">
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