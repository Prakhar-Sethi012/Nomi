import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Pressable from './ui/Pressable';

function DashboardAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) return <div className="bg-surface p-5 rounded-xl border border-border text-textSecondary text-sm animate-pulse">Syncing classes...</div>;

  return (
    <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col h-full max-h-[400px]">

      <div className="flex justify-between items-end mb-4 shrink-0 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            ✅ Quick Log
          </h2>
          <p className="text-xs text-textSecondary mt-1">Record today's attendance.</p>
        </div>
        <span className="text-[10px] text-accent uppercase tracking-widest font-bold">Synced w/ Timetable</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
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
                  <div>
                    <h3 className="text-sm font-bold text-textPrimary leading-tight">{sub.name}</h3>
                    <p className="text-[10px] font-mono text-textSecondary mt-0.5">
                      {sub.room_number || 'Room TBA'} • {conducted}/{total} Classes
                    </p>
                  </div>
                  <span className={`text-xs font-black ${currentPct >= 75 ? 'text-success' : conducted > 0 ? 'text-danger' : 'text-textSecondary'}`}>
                    {conducted > 0 ? `${currentPct.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>

                <div className="flex gap-2 mt-1">
                  {isMaxed ? (
                    <div className="flex-1 bg-surfaceHover border border-border text-textSecondary text-[10px] uppercase tracking-wider font-bold py-1.5 rounded text-center opacity-70 cursor-not-allowed">
                      Max Classes Reached
                    </div>
                  ) : (
                    <>
                      <Pressable
                        onClick={() => logAttendance(sub.id, false)}
                        haptic="tap"
                        className="flex-1 bg-surface hover:bg-dangerBg border border-border hover:border-danger/50 text-textSecondary hover:text-danger text-xs font-bold py-1.5 rounded transition-all"
                      >
                        - Absent
                      </Pressable>
                      <Pressable
                        onClick={() => logAttendance(sub.id, true)}
                        haptic="tap"
                        className="flex-1 bg-surface hover:bg-success/20 border border-border hover:border-success/50 text-textSecondary hover:text-success text-xs font-bold py-1.5 rounded transition-all"
                      >
                        + Present
                      </Pressable>
                    </>
                  )}
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