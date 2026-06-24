import React, { useState, useEffect } from 'react';

function DashboardAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubjects = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/subjects/');
      if (res.ok) {
        const data = await res.json();
        // ✅ THE FIX: Sort data by ID so the order never changes
        const sortedData = data.sort((a, b) => a.id - b.id);
        setSubjects(sortedData);
      }
    } catch (err) {
      console.error("Failed to load subjects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Explicitly passing true (Present) or false (Absent) to the backend
  const logAttendance = async (id, isPresent) => {
    try {
      // FastAPI expects a boolean query parameter like: ?attended=true
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}/attendance?attended=${isPresent}`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchSubjects(); // Refresh the UI immediately
      }
    } catch (err) {
      console.error("Failed to log attendance");
    }
  };

  if (isLoading) return <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 text-slate-400 text-sm animate-pulse">Syncing classes...</div>;

  return (
    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full max-h-[300px]">
      
      <div className="flex justify-between items-end mb-4 shrink-0 border-b border-slate-700 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            ✅ Quick Log
          </h2>
          <p className="text-xs text-slate-400 mt-1">Record today's attendance.</p>
        </div>
        <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Synced w/ Timetable</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
        {subjects.length === 0 ? (
          <p className="text-xs text-slate-500 text-center mt-10">Go to the Timetable tab to add your classes first.</p>
        ) : (
          subjects.map(sub => {
            const currentPct = sub.conducted_classes === 0 ? 0 : (sub.attended_classes / sub.conducted_classes) * 100;
            
            return (
              <div key={sub.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col gap-2">
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 leading-tight">{sub.name}</h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{sub.room_number || 'Room TBA'}</p>
                  </div>
                  <span className={`text-xs font-black ${currentPct >= 75 ? 'text-green-400' : currentPct > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {sub.conducted_classes > 0 ? `${currentPct.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>

                {/* The Logging Controls */}
                <div className="flex gap-2 mt-1">
                  <button 
                    onClick={() => logAttendance(sub.id, false)}
                    className="flex-1 bg-slate-800 hover:bg-red-900/40 border border-slate-600 hover:border-red-500/50 text-slate-300 hover:text-red-400 text-xs font-bold py-1.5 rounded transition-all"
                  >
                    - Absent
                  </button>
                  <button 
                    onClick={() => logAttendance(sub.id, true)}
                    className="flex-1 bg-slate-800 hover:bg-green-900/40 border border-slate-600 hover:border-green-500/50 text-slate-300 hover:text-green-400 text-xs font-bold py-1.5 rounded transition-all"
                  >
                    + Present
                  </button>
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