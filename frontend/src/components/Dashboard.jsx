import React, { useState, useEffect } from 'react';
import TasksWidget from './TasksWidget';
import TimetableWidget from './TimetableWidget';
import ExpensesWidget from './ExpensesWidget';
import PortfolioWidget from './PortfolioWidget';
import WeatherWidget from './WeatherWidget';

function Dashboard({ profile }) {
  // Live Calendar Engine
  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // Dynamic Streak Engine
  const [streak, setStreak] = useState(0);

  // === NEW: CGPA Engine ===
  const [cgpa, setCgpa] = useState(() => {
    return localStorage.getItem('cc_cgpa') || '0.00';
  });
  const [isEditingCgpa, setIsEditingCgpa] = useState(false);
  const [tempCgpa, setTempCgpa] = useState(cgpa);

  useEffect(() => {
    let currentStreak = parseInt(localStorage.getItem('cc_streak') || 0);
    const lastActiveStr = localStorage.getItem('cc_last_active');
    const todayStr = new Date().toDateString();

    // 🔥 THE EXPIRATION CHECKER 🔥
    // If you have a streak, let's verify you didn't break it while you were away.
    if (lastActiveStr && currentStreak > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // If the last time you did a task wasn't today, AND it wasn't yesterday... you broke the chain.
      if (lastActiveStr !== todayStr && lastActiveStr !== yesterday.toDateString()) {
        currentStreak = 0; // Reset to zero
        localStorage.setItem('cc_streak', '0'); // Save the failure to memory
      }
    }

    setStreak(currentStreak);

    // Keep listening for live updates during the day
    const handleStreakUpdate = () => setStreak(parseInt(localStorage.getItem('cc_streak')));
    window.addEventListener('streak-updated', handleStreakUpdate);
    return () => window.removeEventListener('streak-updated', handleStreakUpdate);
  }, []);
  const handleCgpaSave = (e) => {
    e.preventDefault();
    // Force the input to format nicely as a 2-decimal number out of 10
    let val = parseFloat(tempCgpa);
    if (isNaN(val)) val = 0.00;
    if (val > 10) val = 10.00;
    if (val < 0) val = 0.00;
    
    const formatted = val.toFixed(2);
    setCgpa(formatted);
    localStorage.setItem('cc_cgpa', formatted);
    setIsEditingCgpa(false);
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
            {/* THE LOCKED REGISTRATION BADGE */}
            <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-600 shadow-inner">
              Reg: {profile.reg_no}
            </span>

            {/* THE CGPA BADGE STAYS HERE (Because CGPA changes every semester!) */}
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
                onClick={() => { setIsEditingCgpa(true); setTempCgpa(cgpa); }}
                className="text-xs bg-slate-900 text-blue-400 px-3 py-1.5 rounded border border-blue-900/50 cursor-pointer hover:bg-slate-800 hover:border-blue-500 transition-all flex items-center gap-1.5 group shadow-inner"
                title="Click to update CGPA"
              >
                <span>CGPA: <strong className="text-white text-[13px]">{cgpa}</strong></span>
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
          <div className="text-3xl font-black text-orange-500">🔥 Day {streak}</div>
          <p className="text-slate-400 text-sm mt-1">Current Streak</p>
        </div>
      </header>

      {/* Grid for Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TimetableWidget />
        <TasksWidget />
        <ExpensesWidget />
      </div>

      {/* The Developer Showcase */}
      <PortfolioWidget />
      
    </div>
  );
}

export default Dashboard;