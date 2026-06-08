import React, { useState, useEffect } from 'react';

function TimetableWidget() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/subjects/');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch subjects');
    } finally {
      setIsLoading(false);
    }
  };

  // The function to log attendance and instantly refresh the data
  const markAttendance = async (id, attended) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/subjects/${id}/attendance?attended=${attended}`, {
        method: 'PUT'
      });
      if (response.ok) {
        fetchSubjects(); // Instantly refresh the UI with the new percentage
      }
    } catch (err) {
      console.error('Connection error');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex items-center justify-center text-blue-400 animate-pulse">
        Syncing Schedule...
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex flex-col shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Classes & Attendance</h2>
      
      {subjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm text-center">
          <p>No classes set up yet.</p>
          <p className="text-xs mt-2 text-slate-600">(Add them via the Swagger UI for now!)</p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
          {subjects.map((sub) => {
            // Calculate attendance percentage safely to avoid dividing by zero
            const percentage = sub.total_classes === 0 
              ? 100 
              : Math.round((sub.attended_classes / sub.total_classes) * 100);
            
            // Dynamic color logic: Red if below 75%, Green if safe
            const badgeColor = percentage >= 75 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400';

            return (
              <li key={sub.id} className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-200 text-sm">{sub.name}</p>
                    <p className="text-xs text-slate-400">Room: {sub.room || 'TBA'}</p>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded border border-slate-600 ${badgeColor}`}>
                    {percentage}%
                  </div>
                </div>
                
                {/* The Live Action Buttons */}
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => markAttendance(sub.id, true)} 
                    className="flex-1 bg-slate-600 hover:bg-green-600/80 text-white text-xs py-1.5 rounded transition-colors"
                  >
                    Present
                  </button>
                  <button 
                    onClick={() => markAttendance(sub.id, false)} 
                    className="flex-1 bg-slate-600 hover:bg-red-600/80 text-white text-xs py-1.5 rounded transition-colors"
                  >
                    Absent
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default TimetableWidget;