import React, { useState } from 'react';
import TasksWidget from './TasksWidget';
import ExpensesWidget from './ExpensesWidget';
import PortfolioWidget from './PortfolioWidget';
import WeatherWidget from './WeatherWidget';
import DashboardAttendance from './DashboardAttendance';

// ✅ Accepts profile and setProfile from App.jsx
function Dashboard({ profile, setProfile, setActiveTab }) {
  // CGPA Engine State
  const [isEditingCgpa, setIsEditingCgpa] = useState(false);
  const [tempCgpa, setTempCgpa] = useState(profile.cgpa ? profile.cgpa.toFixed(2) : "0.00");

  // Live Calendar Engine
  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // ==========================================
  // HANDLE CGPA SEMESTER UPDATE
  // ==========================================
  const handleCgpaSave = async (e) => {
    e.preventDefault();
    let val = parseFloat(tempCgpa);
    if (isNaN(val)) val = 0.00;
    if (val > 10) val = 10.00;
    if (val < 0) val = 0.00;
    
    try {
      const res = await fetch('http://127.0.0.1:8000/profile/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cgpa: val })
      });
      
      if (res.ok) {
        const updatedData = await res.json();
        // ✅ Updates the global state in App.jsx!
        setProfile(updatedData); 
        setTempCgpa(updatedData.cgpa.toFixed(2));
        setIsEditingCgpa(false);
      }
    } catch (err) {
      console.error("Failed to update CGPA");
    }
  };

  return (
    <div className="w-full max-w-6xl pb-10">
      {/* Header Bar */}
      <header className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg">
        
        {/* LEFT: Student Profile & Stats */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {profile.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-400 text-sm font-medium">{dateString}</span>
            <span className="text-slate-500 text-sm">• VIT Command Center</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-600 shadow-inner">
              Reg: {profile.reg_no}
            </span>

            {/* INLINE CGPA EDITOR */}
            {isEditingCgpa ? (
              <form onSubmit={handleCgpaSave} className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={tempCgpa}
                  onChange={(e) => setTempCgpa(e.target.value)}
                  className="w-16 p-1 bg-slate-900 rounded text-xs text-white border border-slate-600 focus:border-blue-500 outline-none"
                  autoFocus
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1 rounded transition-colors font-bold">Save</button>
              </form>
            ) : (
              <div
                onClick={() => { setIsEditingCgpa(true); setTempCgpa(profile.cgpa ? profile.cgpa.toFixed(2) : "0.00"); }}
                className="text-xs bg-slate-900 text-blue-400 px-3 py-1.5 rounded border border-blue-900/50 cursor-pointer hover:bg-slate-800 hover:border-blue-500 transition-all flex items-center gap-1.5 group shadow-inner"
                title="Click to update CGPA"
              >
                <span>CGPA: <strong className="text-white text-[13px]">{profile.cgpa ? profile.cgpa.toFixed(2) : "0.00"}</strong></span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
              </div>
            )}
          </div>
        </div>
        
        {/* MIDDLE: Weather Satellite */}
        <div className="hidden md:block">
          <WeatherWidget />
        </div>

        {/* RIGHT: Gamification Streak */}
        <div className="text-right">
          <div className="text-3xl font-black text-orange-500">🔥 Day {profile.current_streak}</div>
          <p className="text-slate-400 text-sm mt-1">Current Streak</p>
        </div>
      </header>

      {/* Grid for Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 w-full">
          <DashboardAttendance />
        </div>
        <div className="lg:col-span-5 w-full">
          <TasksWidget />
        </div>
        <div className="lg:col-span-3 w-full">
          <ExpensesWidget setActiveTab={setActiveTab} />
        </div>
      </div>
      <PortfolioWidget />
    </div>
  );
}

export default Dashboard;