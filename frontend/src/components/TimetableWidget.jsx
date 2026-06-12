import React, { useState, useEffect } from 'react';

function TimetableWidget() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State - Reverted to match strict FastAPI schema
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    room: ''
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

const fetchSubjects = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/subjects/');
      if (response.ok) {
        const data = await response.json();
        
        // THE FIX: Force the array to sort by ID so the order never changes
        const sortedData = data.sort((a, b) => a.id - b.id);
        
        setSubjects(sortedData);
      }
    } catch (err) {
      console.error('Failed to fetch subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Stripped payload down to what the API strictly accepts
      const payload = {
        name: formData.name,
        room: formData.room
      };

      const response = await fetch('http://127.0.0.1:8000/subjects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchSubjects(); 
        setShowForm(false); 
        setFormData({ name: '', room: '' }); 
      }
    } catch (err) {
      console.error('Error saving subject');
    }
  };

  const markAttendance = async (id, attended) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/subjects/${id}/attendance?attended=${attended}`, {
        method: 'PUT'
      });
      if (response.ok) {
        fetchSubjects(); 
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Classes & Attendance</h2>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded border border-slate-600 transition-colors"
          >
            + Add Class
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Class Name (e.g., Software Engineering)" 
            required 
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
            className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" 
          />
          
          <input 
            type="text" 
            placeholder="Room Number (e.g., SJT 311)" 
            value={formData.room} 
            onChange={(e) => setFormData({...formData, room: e.target.value})} 
            className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" 
          />
          
          <div className="flex gap-2 mt-auto pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm py-2 rounded transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded font-bold transition-colors">Save</button>
          </div>
        </form>
      ) : subjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm text-center">
          <p>No classes set up yet.</p>
          <p className="text-xs mt-2 text-slate-600">Click '+ Add Class' to start.</p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
          {subjects.map((sub) => {
            const percentage = sub.total_classes === 0 
              ? 100 
              : Math.round((sub.attended_classes / sub.total_classes) * 100);
            
            const badgeColor = percentage >= 75 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400';

            return (
              <li key={sub.id} className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-200 text-sm">{sub.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">Room: {sub.room || 'TBA'}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-[11px] text-slate-400 font-mono">({sub.attended_classes}/{sub.total_classes})</span>
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded border border-slate-600 ${badgeColor}`}>
                    {percentage}%
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <button onClick={() => markAttendance(sub.id, true)} className="flex-1 bg-slate-600 hover:bg-green-600/80 text-white text-xs py-1.5 rounded transition-colors">Present</button>
                  <button onClick={() => markAttendance(sub.id, false)} className="flex-1 bg-slate-600 hover:bg-red-600/80 text-white text-xs py-1.5 rounded transition-colors">Absent</button>
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